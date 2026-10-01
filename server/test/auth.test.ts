import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { signup, useTestApp } from './helpers.js';
import { Task } from '../src/models/Task.js';
import { User } from '../src/models/User.js';
import { loadConfig } from '../src/config.js';

const { app } = useTestApp();

describe('auth', () => {
  it('signs up, returns a token, and never exposes the password hash', async () => {
    const res = await request(app())
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ADA@Example.com ', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ name: 'Ada', email: 'ada@example.com' });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|secret123/);

    const stored = await User.findOne({ email: 'ada@example.com' }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash, not plaintext
  });

  it('rejects weak passwords and invalid emails with field messages', async () => {
    const res = await request(app()).post('/api/auth/signup').send({ name: 'A', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toHaveProperty('email');
    expect(res.body.details.fields).toHaveProperty('password');
  });

  it('rejects duplicate emails', async () => {
    await signup(app(), { email: 'dup@example.com' });
    const res = await request(app())
      .post('/api/auth/signup')
      .send({ name: 'B', email: 'dup@example.com', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and uses the same error for bad email or bad password', async () => {
    await signup(app(), { email: 'log@example.com', password: 'secret123' });
    const ok = await request(app()).post('/api/auth/login').send({ email: 'log@example.com', password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const badPw = await request(app()).post('/api/auth/login').send({ email: 'log@example.com', password: 'wrong999' });
    const badEmail = await request(app()).post('/api/auth/login').send({ email: 'no@example.com', password: 'x' });
    expect(badPw.status).toBe(401);
    expect(badEmail.status).toBe(401);
    expect(badPw.body.error).toBe(badEmail.body.error);
  });

  it('protects /me and rejects tampered tokens', async () => {
    const { token } = await signup(app());
    expect((await request(app()).get('/api/auth/me')).status).toBe(401);
    expect((await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}x`)).status).toBe(401);
    const me = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
  });

  it('logout-all invalidates existing tokens', async () => {
    const { token } = await signup(app());
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app()).post('/api/auth/logout-all').set(auth)).status).toBe(204);
    expect((await request(app()).get('/api/auth/me').set(auth)).status).toBe(401);
  });

  it('deletes the account and all its tasks only with the correct password', async () => {
    const { token, user, password } = await signup(app());
    const auth = { Authorization: `Bearer ${token}` };
    await request(app()).post('/api/tasks').set(auth).send({ title: 'Mine' });

    const wrong = await request(app()).delete('/api/auth/me').set(auth).send({ password: 'wrong999' });
    expect(wrong.status).toBe(403);
    expect(await User.exists({ _id: user.id })).toBeTruthy();

    const res = await request(app()).delete('/api/auth/me').set(auth).send({ password });
    expect(res.status).toBe(204);
    expect(await User.exists({ _id: user.id })).toBeNull();
    expect(await Task.countDocuments({ user: user.id })).toBe(0);
    expect((await request(app()).get('/api/auth/me').set(auth)).status).toBe(401);
  });
});

describe('config', () => {
  it('refuses to start without a strong JWT secret', () => {
    expect(() => loadConfig({ MONGODB_URI: 'mongodb://x', JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() =>
      loadConfig({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://x', JWT_SECRET: 'replace-me-' + 'x'.repeat(40) }),
    ).toThrow(/placeholder/);
  });
});
