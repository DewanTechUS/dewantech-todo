import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import type { Config } from '../config.js';
import { HttpError } from '../lib/errors.js';
import { deleteAccountSchema, loginSchema, signupSchema } from '../lib/validation.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { parse } from '../middleware/validate.js';
import { Task } from '../models/Task.js';
import { User, toPublicUser } from '../models/User.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the email doesn't exist so response timing doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync('dewantech-timing-equaliser', BCRYPT_ROUNDS);

export function authRouter(config: Config, opts: { authRateLimit: number }): Router {
  const router = Router();
  const auth = requireAuth(config.JWT_SECRET);
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: opts.authRateLimit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });

  const issue = (user: { _id: unknown; tokenVersion?: number | null }) =>
    signToken(String(user._id), user.tokenVersion ?? 0, config.JWT_SECRET, config.JWT_EXPIRES_IN);

  router.post('/signup', limiter, async (req, res) => {
    const { name, email, password } = parse(signupSchema, req.body);
    if (await User.exists({ email })) {
      throw new HttpError(409, 'An account with this email already exists. Try logging in instead.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
      const user = await User.create({ name, email, passwordHash });
      res.status(201).json({ token: issue(user), user: toPublicUser(user) });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new HttpError(409, 'An account with this email already exists. Try logging in instead.');
      }
      throw err;
    }
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.');
    res.json({ token: issue(user), user: toPublicUser(user) });
  });

  router.get('/me', auth, async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(404, 'Account not found.');
    res.json({ user: toPublicUser(user) });
  });

  /** Invalidates every token issued for this account (all devices). */
  router.post('/logout-all', auth, async (req, res) => {
    await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 } });
    res.status(204).end();
  });

  /** Permanently deletes the account and all of its tasks. Requires password re-entry. */
  router.delete('/me', limiter, auth, async (req, res) => {
    const { password } = parse(deleteAccountSchema, req.body);
    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) throw new HttpError(404, 'Account not found.');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(403, 'Incorrect password. Your account was not deleted.');
    }
    await Task.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    res.status(204).end();
  });

  return router;
}
