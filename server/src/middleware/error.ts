import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/errors.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'Not found.'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body is not valid JSON.' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request is too large.' });
    return;
  }
  if (err?.name === 'CastError') {
    res.status(400).json({ error: 'Invalid identifier.' });
    return;
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
