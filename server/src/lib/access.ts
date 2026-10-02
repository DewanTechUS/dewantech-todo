import { Types } from 'mongoose';
import { HttpError } from './errors.js';
import { List, isMember, isOwner, type ListAttrs } from '../models/List.js';
import type { TaskAttrs } from '../models/Task.js';
import { User, toPublicUser } from '../models/User.js';

/**
 * Who can do what:
 *  - Personal task (listId = null): only its creator can see, edit or delete it.
 *  - Shared-list task: every list member can see and edit it; its creator or the list owner can delete it.
 *  - Assignees must be members of the task's list. Personal tasks can't be assigned.
 */
export interface Access {
  userId: string;
  lists: Map<string, ListAttrs>;
}

export async function loadAccess(userId: string): Promise<Access> {
  const lists = await List.find({ 'members.user': userId }).lean<ListAttrs[]>();
  return { userId, lists: new Map(lists.map((l) => [l._id, l])) };
}

export function canSeeTask(task: Pick<TaskAttrs, 'user' | 'listId'>, a: Access): boolean {
  return task.listId ? a.lists.has(task.listId) : String(task.user) === a.userId;
}

export function canDeleteTask(task: Pick<TaskAttrs, 'user' | 'listId'>, a: Access): boolean {
  if (!canSeeTask(task, a)) return false;
  if (String(task.user) === a.userId) return true;
  const list = task.listId ? a.lists.get(task.listId) : undefined;
  return Boolean(list && isOwner(list, a.userId));
}

/** Mongo filter matching every task this user can see. */
export function visibleTaskFilter(a: Access) {
  return { $or: [{ user: new Types.ObjectId(a.userId), listId: null }, { listId: { $in: [...a.lists.keys()] } }] };
}

/**
 * Checks where a task is being saved (its list and assignee). Throws a 403/400 HttpError on failure
 * and returns the normalised assignee.
 */
export function checkTarget(
  data: { listId: string | null; assigneeId: string | null },
  a: Access,
  existing?: Pick<TaskAttrs, 'user' | 'listId'> | null,
): { listId: string | null; assignee: Types.ObjectId | null } {
  if (data.listId) {
    const list = a.lists.get(data.listId);
    if (!list) throw new HttpError(403, "You're not a member of that list.");
    if (data.assigneeId && !isMember(list, data.assigneeId)) {
      throw new HttpError(400, 'Tasks can only be assigned to members of the list.');
    }
  } else {
    // Moving a shared task back to someone's personal tasks would hide it from its creator — only the creator may.
    if (existing && existing.listId && String(existing.user) !== a.userId) {
      throw new HttpError(403, 'Only the person who created this task can move it out of the shared list.');
    }
  }
  return {
    listId: data.listId,
    assignee: data.listId && data.assigneeId ? new Types.ObjectId(data.assigneeId) : null,
  };
}

// ---------- list DTOs ----------

export interface ListMemberDTO {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}

export interface ListDTO {
  id: string;
  name: string;
  ownerId: string;
  role: 'owner' | 'member';
  members: ListMemberDTO[];
  /** Pending invitations (only shown to the owner). */
  invites: { email: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface InviteDTO {
  listId: string;
  listName: string;
  invitedBy: string;
  createdAt: string;
}

export async function toListDTOs(lists: ListAttrs[], viewerId: string): Promise<ListDTO[]> {
  const ids = [...new Set(lists.flatMap((l) => l.members.map((m) => String(m.user))))];
  const users = await User.find({ _id: { $in: ids } }).lean();
  const byId = new Map(users.map((u) => [String(u._id), toPublicUser(u)]));
  return lists.map((l) => {
    const owner = isOwner(l, viewerId);
    return {
      id: l._id,
      name: l.name,
      ownerId: String(l.owner),
      role: owner ? 'owner' : 'member',
      members: l.members
        .filter((m) => byId.has(String(m.user)))
        .map((m) => {
          const u = byId.get(String(m.user))!;
          return { id: u.id, name: u.name, email: u.email, role: m.role as 'owner' | 'member' };
        }),
      invites: owner ? l.invites.map((i) => ({ email: i.email, createdAt: new Date(i.createdAt).toISOString() })) : [],
      createdAt: new Date(l.createdAt).toISOString(),
      updatedAt: new Date(l.updatedAt).toISOString(),
    };
  });
}

/** Invitations waiting for this email address. */
export async function pendingInvites(email: string): Promise<InviteDTO[]> {
  const lists = await List.find({ 'invites.email': email }).lean<ListAttrs[]>();
  const inviterIds = lists.flatMap((l) => l.invites.filter((i) => i.email === email).map((i) => String(i.invitedBy)));
  const inviters = await User.find({ _id: { $in: inviterIds } }).select('name').lean();
  const names = new Map(inviters.map((u) => [String(u._id), u.name]));
  return lists.flatMap((l) =>
    l.invites
      .filter((i) => i.email === email)
      .map((i) => ({
        listId: l._id,
        listName: l.name,
        invitedBy: names.get(String(i.invitedBy)) ?? 'Someone',
        createdAt: new Date(i.createdAt).toISOString(),
      })),
  );
}
