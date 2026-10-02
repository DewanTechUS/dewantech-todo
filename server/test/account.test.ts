import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { sentMail, signup, useTestApp } from './helpers.js';
import { User } from '../src/models/User.js';

const { app } = useTestApp();

const resetTokenFrom = (text: string) => /reset-password\?token=([a-f0-9]{64})/.exec(text)?.[1];

async function waitForMail() {
  for (let i = 0; i < 50 && sentMail.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
  return sentMail.at(-1);
}

describe('password reset', () => {
  it('emails a single-use link that sets a new password and signs out other devices', async () => {
    const { token: oldToken, email } = await signup(app(), { password: 'oldpass123' });

    const res = await request(app()).post('/api/auth/forgot-password').send({ email });
    expect(res.status).toBe(200);
    const mail = await waitForMail();
    expect(mail?.to).toBe(email);
    expect(mail?.text).toContain('https://donext.example.com/reset-password?token=');
    const token = resetTokenFrom(mail!.text)!;

    // Only a hash is stored, never the raw token.
    const stored = await User.findOne({ email }).select('+passwordResetHash').lean();
    expect(stored?.passwordResetHash).toBeTruthy();
    expect(stored?.passwordResetHash).not.toBe(token);

    const reset = await request(app()).post('/api/auth/reset-password').send({ token, password: 'newpass456' });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toEqual(expect.any(String));

    expect((await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`)).status).toBe(401);
    expect((await request(app()).post('/api/auth/login').send({ email, password: 'oldpass123' })).status).toBe(401);
    expect((await request(app()).post('/api/auth/login').send({ email, password: 'newpass456' })).status).toBe(200);

    const reuse = await request(app()).post('/api/auth/reset-password').send({ token, password: 'another789' });
    expect(reuse.status).toBe(400);
  });

  it('gives the same answer for unknown emails and sends nothing', async () => {
    const known = await signup(app());
    const a = await request(app()).post('/api/auth/forgot-password').send({ email: known.email });
    const b = await request(app()).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body).toEqual(b.body);
    await waitForMail();
    expect(sentMail.map((m) => m.to)).toEqual([known.email]);
  });

  it('rejects expired and malformed tokens and weak passwords', async () => {
    const { email } = await signup(app());
    await request(app()).post('/api/auth/forgot-password').send({ email });
    const token = resetTokenFrom((await waitForMail())!.text)!;

    expect((await request(app()).post('/api/auth/reset-password').send({ token, password: 'short' })).status).toBe(400);
    expect((await request(app()).post('/api/auth/reset-password').send({ token: 'abc', password: 'goodpass123' })).status).toBe(400);

    await User.updateOne({ email }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
    const expired = await request(app()).post('/api/auth/reset-password').send({ token, password: 'goodpass123' });
    expect(expired.status).toBe(400);
    expect(expired.body.error).toMatch(/expired/);
  });
});

describe('account settings', () => {
  it('updates the display name', async () => {
    const { token } = await signup(app());
    const res = await request(app()).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ name: '  Rocky D  ' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Rocky D');
    expect((await request(app()).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ name: '' })).status).toBe(400);
  });

  it('changes the password only with the current one, keeping this device signed in', async () => {
    const { token, email, password } = await signup(app());
    const auth = { Authorization: `Bearer ${token}` };

    const wrong = await request(app()).post('/api/auth/change-password').set(auth).send({ currentPassword: 'nope1234', newPassword: 'fresh1234' });
    expect(wrong.status).toBe(403);
    expect(wrong.body.details.fields.currentPassword).toBeTruthy();

    const ok = await request(app()).post('/api/auth/change-password').set(auth).send({ currentPassword: password, newPassword: 'fresh1234' });
    expect(ok.status).toBe(200);
    expect((await request(app()).get('/api/auth/me').set(auth)).status).toBe(401); // old token revoked
    expect((await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${ok.body.token}`)).status).toBe(200);
    expect((await request(app()).post('/api/auth/login').send({ email, password: 'fresh1234' })).status).toBe(200);
  });

  it('exports only the signed-in user’s data', async () => {
    const alice = await signup(app());
    const bob = await signup(app());
    await request(app()).post('/api/tasks').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Alice task' });
    await request(app()).post('/api/tasks').set('Authorization', `Bearer ${bob.token}`).send({ title: 'Bob task' });

    const res = await request(app()).get('/api/auth/export').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('donext-export.json');
    expect(res.body.user.email).toBe(alice.email);
    expect(res.body.tasks.map((t: { title: string }) => t.title)).toEqual(['Alice task']);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion/);
  });
});
