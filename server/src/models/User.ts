import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    // Incrementing this invalidates every JWT issued before (used for "log out everywhere").
    tokenVersion: { type: Number, default: 0 },
    // SHA-256 of a single-use password reset token (the raw token is only ever emailed).
    passwordResetHash: { type: String, select: false, index: { sparse: true } },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function toPublicUser(u: { _id: unknown; name: string; email: string; createdAt?: Date }): PublicUser {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    createdAt: (u.createdAt ?? new Date()).toISOString(),
  };
}

export const User = mongoose.model('User', userSchema);
