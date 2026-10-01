import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../lib/errors.js';
import { User } from '../models/User.js';

interface TokenPayload {
  sub: string;
  ver: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function signToken(userId: string, tokenVersion: number, secret: string, expiresIn: string): string {
  return jwt.sign({ sub: userId, ver: tokenVersion } satisfies TokenPayload, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function requireAuth(secret: string): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Please log in to continue.');

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as unknown as TokenPayload;
    } catch {
      throw new HttpError(401, 'Your session has expired. Please log in again.');
    }

    const user = await User.findById(payload.sub).select('tokenVersion').lean();
    if (!user || (user.tokenVersion ?? 0) !== payload.ver) {
      throw new HttpError(401, 'Your session is no longer valid. Please log in again.');
    }
    req.userId = payload.sub;
    next();
  };
}
