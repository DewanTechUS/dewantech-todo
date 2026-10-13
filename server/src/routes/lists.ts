import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import type { Config } from '../config.js';
import { pendingInvites, toListDTOs } from '../lib/access.js';
import { HttpError } from '../lib/errors.js';
import { listInviteEmail, listJoinedEmail, type Mailer } from '../lib/mailer.js';
import { createListSchema, inviteSchema, renameListSchema } from '../lib/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { List, MAX_LIST_MEMBERS, isMember, isOwner, type ListAttrs } from '../models/List.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

const NOT_FOUND = 'List not found.';

/** Shared lists: create, rename, delete, invite, accept/decline, remove member, leave. */
export function listsRouter(config: Config, opts: { mailer: Mailer }): Router {
  const router = Router();
  router.use(requireAuth(config.JWT_SECRET));

  const me = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new HttpError(401, 'Please log in again.');
    return user;
  };

  /** Loads a list the user belongs to (404 otherwise, so lists can't be probed). */
  const memberList = async (listId: string, userId: string) => {
    const list = await List.findById(listId).lean<ListAttrs>();
    if (!list || !isMember(list, userId)) throw new HttpError(404, NOT_FOUND);
    return list;
  };
  const ownedList = async (listId: string, userId: string) => {
    const list = await memberList(listId, userId);
    if (!isOwner(list, userId)) throw new HttpError(403, 'Only the list owner can do that.');
    return list;
  };
  const respond = async (listId: string, userId: string) => {
    const list = await List.findById(listId).lean<ListAttrs>();
    return { list: list ? (await toListDTOs([list], userId))[0] : null };
  };

  /** Clears assignments to a person in a list (when they leave or are removed). */
  const unassign = (listId: string, userId: string) => {
    const now = new Date();
    return Task.updateMany(
      { listId, assignee: new Types.ObjectId(userId) },
      { $set: { assignee: null, updatedAt: now, serverUpdatedAt: now } },
    );
  };

  router.get('/', async (req, res) => {
    const user = await me(req.userId!);
    const lists = await List.find({ 'members.user': user._id }).sort({ createdAt: 1 }).lean<ListAttrs[]>();
    res.json({ lists: await toListDTOs(lists, req.userId!), invites: await pendingInvites(user.email) });
  });

  router.post('/', async (req, res) => {
    const { id, name } = parse(createListSchema, req.body);
    const now = new Date();
    try {
      const list = await List.create({
        _id: id ?? randomUUID(),
        name,
        owner: req.userId,
        members: [{ user: req.userId, role: 'owner', joinedAt: now }],
        invites: [],
        createdAt: now,
        updatedAt: now,
      });
      res.status(201).json(await respond(list._id, req.userId!));
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new HttpError(409, 'A list with this id already exists.');
      throw err;
    }
  });

  router.patch('/:id', async (req, res) => {
    const { name } = parse(renameListSchema, req.body);
    await ownedList(req.params.id, req.userId!);
    await List.updateOne({ _id: req.params.id }, { $set: { name, updatedAt: new Date() } });
    res.json(await respond(req.params.id, req.userId!));
  });

  /** Deletes the list and every task in it, for all members. */
  router.delete('/:id', async (req, res) => {
    await ownedList(req.params.id, req.userId!);
    await Task.deleteMany({ listId: req.params.id });
    await List.deleteOne({ _id: req.params.id });
    res.status(204).end();
  });

  router.post('/:id/invites', async (req, res) => {
    const { email } = parse(inviteSchema, req.body);
    const list = await ownedList(req.params.id, req.userId!);
    const inviter = await me(req.userId!);

    const members = await User.find({ _id: { $in: list.members.map((m) => m.user) } }).select('email').lean();
    if (members.some((u) => u.email === email)) throw new HttpError(409, 'That person is already in this list.');
    if (list.invites.some((i) => i.email === email)) throw new HttpError(409, 'That person has already been invited.');
    if (list.members.length + list.invites.length >= MAX_LIST_MEMBERS) {
      throw new HttpError(400, `A list can have at most ${MAX_LIST_MEMBERS} people.`);
    }

    const now = new Date();
    await List.updateOne(
      { _id: list._id },
      { $push: { invites: { email, invitedBy: inviter._id, createdAt: now } }, $set: { updatedAt: now } },
    );
    // Tell the inviter whether the email really went out (no email service = in-app invitation only).
    const emailSent = await opts.mailer.send({ to: email, ...listInviteEmail(inviter.name, list.name, config.APP_URL) }).then(
      () => opts.mailer.enabled,
      (err) => {
        console.error('Failed to send list invitation email:', err);
        return false;
      },
    );
    res.status(201).json({ ...(await respond(list._id, req.userId!)), emailSent });
  });

  router.delete('/:id/invites/:email', async (req, res) => {
    const list = await ownedList(req.params.id, req.userId!);
    await List.updateOne(
      { _id: list._id },
      { $pull: { invites: { email: String(req.params.email).toLowerCase() } }, $set: { updatedAt: new Date() } },
    );
    res.json(await respond(list._id, req.userId!));
  });

  /** Accept an invitation sent to your email address. */
  router.post('/:id/accept', async (req, res) => {
    const user = await me(req.userId!);
    const now = new Date();
    const updated = await List.findOneAndUpdate(
      { _id: req.params.id, 'invites.email': user.email, 'members.user': { $ne: user._id } },
      {
        $pull: { invites: { email: user.email } },
        $push: { members: { user: user._id, role: 'member', joinedAt: now } },
        $set: { updatedAt: now },
      },
      { new: true },
    ).lean<ListAttrs>();
    if (!updated) throw new HttpError(404, 'This invitation is no longer available.');
    // Let the owner know their invitation was accepted.
    const owner = await User.findById(updated.owner).select('email').lean();
    if (owner) {
      opts.mailer
        .send({ to: owner.email, ...listJoinedEmail(user.name, updated.name, config.APP_URL) })
        .catch((err) => console.error('Failed to send list joined email:', err));
    }
    res.json(await respond(updated._id, req.userId!));
  });

  router.post('/:id/decline', async (req, res) => {
    const user = await me(req.userId!);
    await List.updateOne({ _id: req.params.id }, { $pull: { invites: { email: user.email } } });
    res.status(204).end();
  });

  /** The owner removes someone from the list. */
  router.delete('/:id/members/:userId', async (req, res) => {
    const list = await ownedList(req.params.id, req.userId!);
    const target = req.params.userId;
    if (target === req.userId) throw new HttpError(400, "You own this list. Delete it instead of removing yourself.");
    if (!isMember(list, target)) throw new HttpError(404, 'That person is not in this list.');
    await List.updateOne({ _id: list._id }, { $pull: { members: { user: new Types.ObjectId(target) } }, $set: { updatedAt: new Date() } });
    await unassign(list._id, target);
    res.json(await respond(list._id, req.userId!));
  });

  /** A member leaves the list. Tasks they created stay in the list. */
  router.post('/:id/leave', async (req, res) => {
    const list = await memberList(req.params.id, req.userId!);
    if (isOwner(list, req.userId!)) throw new HttpError(400, 'You own this list. Delete it instead of leaving.');
    await List.updateOne(
      { _id: list._id },
      { $pull: { members: { user: new Types.ObjectId(req.userId!) } }, $set: { updatedAt: new Date() } },
    );
    await unassign(list._id, req.userId!);
    res.status(204).end();
  });

  return router;
}
