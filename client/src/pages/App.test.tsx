import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { uuid } from '../lib/id';

/** Full app flows on a fresh on-device database (no server involved). */
describe('DoNext (local)', () => {
  it('first run: create your profile, add a task, and find it again', async () => {
    const user = userEvent.setup();
    render(<App dbName={`app-${uuid()}`} />);

    await user.type(await screen.findByLabelText('What’s your name?'), 'Rocky');
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    expect(await screen.findByRole('heading', { name: 'Hi, Rocky' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New task' }));
    await user.type(await screen.findByRole('textbox', { name: 'Task' }), 'Buy milk{Enter}');
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Buy milk')).toBeInTheDocument();
  });

  it('shares tasks between people on the same device and keeps private ones private', async () => {
    const user = userEvent.setup();
    render(<App dbName={`app-${uuid()}`} />);

    // Rocky starts
    await user.type(await screen.findByLabelText('What’s your name?'), 'Rocky');
    await user.click(screen.getByRole('button', { name: 'Get started' }));
    await screen.findByRole('heading', { name: 'Hi, Rocky' });

    // Rocky adds Sara on the People page via the empty-state link
    await user.click(screen.getByRole('link', { name: /add people/i }));
    await user.click(await screen.findByRole('button', { name: 'Add person' }));
    await user.type(screen.getByLabelText('Name'), 'Sara');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add person' }));
    await screen.findByText(/Sara was added/);

    // Back to tasks: one private, one shared
    await user.click(screen.getAllByRole('link', { name: 'DoNext home' })[0]);
    await screen.findByRole('heading', { name: 'Hi, Rocky' });
    await user.click(screen.getByRole('button', { name: 'New task' }));
    await user.type(await screen.findByRole('textbox', { name: 'Task' }), 'Rocky secret');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New task' }));
    await user.type(await screen.findByRole('textbox', { name: 'Task' }), 'Family groceries');
    await user.click(screen.getByRole('button', { name: /Everyone/ }));
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Switch to Sara
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: 'Switch' }));
    await user.click(await screen.findByRole('button', { name: 'Sara' }));
    await screen.findByRole('heading', { name: 'Hi, Sara' });

    await user.click(screen.getByRole('button', { name: 'All tasks' }));
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Family groceries')).toBeInTheDocument();
    expect(within(list).getByText('From Rocky')).toBeInTheDocument();
    expect(within(list).queryByText('Rocky secret')).not.toBeInTheDocument();
    // Sara can't delete Rocky's task
    expect(within(list).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });
});
