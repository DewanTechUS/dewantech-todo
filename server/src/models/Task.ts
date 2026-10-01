import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * Task ids are UUIDs generated on the client so tasks can be created offline
 * and synchronised later without id remapping.
 *
 * - `updatedAt`        client-side modification time, used for last-write-wins conflict resolution.
 * - `serverUpdatedAt`  set by the server on every write; used as the pull cursor for sync.
 * - `deletedAt`        soft-delete tombstone so deletions propagate to other devices.
 */
const taskSchema = new Schema(
  {
    _id: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    dueDate: { type: String, default: null }, // YYYY-MM-DD (timezone-free calendar date)
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    category: { type: String, default: '', trim: true, maxlength: 50 },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
    serverUpdatedAt: { type: Date, required: true },
  },
  { versionKey: false },
);

taskSchema.index({ user: 1, serverUpdatedAt: 1 });

export type TaskAttrs = InferSchemaType<typeof taskSchema>;

export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  category: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export function toTaskDTO(t: TaskAttrs): TaskDTO {
  return {
    id: t._id,
    title: t.title,
    description: t.description ?? '',
    dueDate: t.dueDate ?? null,
    priority: t.priority as Priority,
    category: t.category ?? '',
    completed: Boolean(t.completed),
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    deletedAt: t.deletedAt ? new Date(t.deletedAt).toISOString() : null,
  };
}

export const Task = mongoose.model('Task', taskSchema);
