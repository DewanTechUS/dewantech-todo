import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { signup, useTestApp } from './helpers.js';

const { app } = useTestApp();

async function authed() {
  const { token } = await signup(app());
  return { Authorization: `Bearer ${token}` };
}

describe('security headers and CORS', () => {
  it('allows configured origins only', async () => {
    const preflight = (origin: string) =>
      request(app()).options('/api/tasks').set('Origin', origin).set('Access-Control-Request-Method', 'POST');
    expect((await preflight('http://localhost:5173')).headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect((await preflight('https://evil.example')).headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets a strict content security policy and hides the framework', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('tasks CRUD', () => {
  it('requires authentication', async () => {
    expect((await request(app()).get('/api/tasks')).status).toBe(401);
    expect((await request(app()).post('/api/tasks').send({ title: 'x' })).status).toBe(401);
  });

  it('creates, reads, updates, completes and deletes a task', async () => {
    const auth = await authed();
    const created = await request(app())
      .post('/api/tasks')
      .set(auth)
      .send({ title: '  Buy milk  ', description: '2 litres', dueDate: '2026-12-01', priority: 'high', category: 'Home' });
    expect(created.status).toBe(201);
    expect(created.body.task).toMatchObject({ title: 'Buy milk', priority: 'high', completed: false, dueDate: '2026-12-01' });
    const id = created.body.task.id;

    const patched = await request(app()).patch(`/api/tasks/${id}`).set(auth).send({ completed: true, title: 'Buy oat milk' });
    expect(patched.status).toBe(200);
    expect(patched.body.task).toMatchObject({ completed: true, title: 'Buy oat milk' });

    expect((await request(app()).get(`/api/tasks/${id}`).set(auth)).body.task.title).toBe('Buy oat milk');
    expect((await request(app()).delete(`/api/tasks/${id}`).set(auth)).status).toBe(204);
    expect((await request(app()).get(`/api/tasks/${id}`).set(auth)).status).toBe(404);
    expect((await request(app()).get('/api/tasks').set(auth)).body.tasks).toHaveLength(0);
  });

  it('validates input and rejects unknown fields', async () => {
    const auth = await authed();
    const cases = [
      { title: '' },
      { title: 'x'.repeat(201) },
      { title: 'ok', priority: 'urgent' },
      { title: 'ok', dueDate: '2026-02-30' },
      { title: 'ok', dueDate: 'tomorrow' },
      { title: 'ok', user: 'someone-else' },
      { title: { $gt: '' } },
    ];
    for (const body of cases) {
      const res = await request(app()).post('/api/tasks').set(auth).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    }
    const res = await request(app()).patch(`/api/tasks/${randomUUID()}`).set(auth).send({});
    expect(res.status).toBe(400);
  });

  it("keeps each user's tasks private", async () => {
    const alice = await authed();
    const bob = await authed();
    const { body } = await request(app()).post('/api/tasks').set(alice).send({ title: 'Alice secret' });
    const id = body.task.id;

    expect((await request(app()).get('/api/tasks').set(bob)).body.tasks).toHaveLength(0);
    expect((await request(app()).get(`/api/tasks/${id}`).set(bob)).status).toBe(404);
    expect((await request(app()).patch(`/api/tasks/${id}`).set(bob).send({ title: 'hacked' })).status).toBe(404);
    expect((await request(app()).delete(`/api/tasks/${id}`).set(bob)).status).toBe(404);
    // Bob cannot claim Alice's id either
    expect((await request(app()).post('/api/tasks').set(bob).send({ id, title: 'dup' })).status).toBe(409);
    expect((await request(app()).get(`/api/tasks/${id}`).set(alice)).body.task.title).toBe('Alice secret');
  });

  it('supports search and filters', async () => {
    const auth = await authed();
    const mk = (body: object) => request(app()).post('/api/tasks').set(auth).send(body);
    await mk({ title: 'Write report', category: 'Work', priority: 'high' });
    await mk({ title: 'Gym', category: 'Health', priority: 'low', completed: true });
    await mk({ title: 'Email (urgent)', description: 'reply to the report thread', category: 'Work' });

    const q = (query: string) => request(app()).get(`/api/tasks?${query}`).set(auth);
    expect((await q('q=report')).body.tasks).toHaveLength(2);
    expect((await q('q=(urgent')).body.tasks).toHaveLength(1); // regex characters are escaped
    expect((await q('status=completed')).body.tasks.map((t: { title: string }) => t.title)).toEqual(['Gym']);
    expect((await q('status=active&category=Work')).body.tasks).toHaveLength(2);
    expect((await q('priority=high')).body.tasks).toHaveLength(1);
    expect((await q('status=bogus')).status).toBe(400);
  });
});
