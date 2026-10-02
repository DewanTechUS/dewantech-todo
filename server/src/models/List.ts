import mongoose, { Schema, type InferSchemaType, type Types } from 'mongoose';

/**
 * A shared list. Its tasks are visible to and editable by every member.
 * Personal tasks have no list (Task.listId = null) and stay private to their creator.
 */
const memberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], required: true },
    /** When this person joined: their first sync after joining pulls all of the list's existing tasks. */
    joinedAt: { type: Date, required: true },
  },
  { _id: false },
);

const inviteSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const listSchema = new Schema(
  {
    _id: { type: String, required: true }, // UUID
    name: { type: String, required: true, trim: true, maxlength: 60 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },
    invites: { type: [inviteSchema], default: [] },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

listSchema.index({ 'members.user': 1 });
listSchema.index({ 'invites.email': 1 });

export type ListAttrs = InferSchemaType<typeof listSchema>;

export const MAX_LIST_MEMBERS = 50;

export const isMember = (list: Pick<ListAttrs, 'members'>, userId: string | Types.ObjectId) =>
  list.members.some((m) => String(m.user) === String(userId));

export const isOwner = (list: Pick<ListAttrs, 'owner'>, userId: string | Types.ObjectId) => String(list.owner) === String(userId);

export const List = mongoose.model('List', listSchema);
