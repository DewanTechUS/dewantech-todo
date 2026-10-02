import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProvider } from '../context/AppContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AppStore } from '../lib/appStore';
import { LocalDB } from '../lib/db';
import { uuid } from '../lib/id';
import { Header } from './Header';

/** Creates a database with one selected person, then renders the header on top of it. */
async function renderHeader({ withPerson }: { withPerson: boolean }) {
  const dbName = `header-${uuid()}`;
  if (withPerson) {
    const db = await LocalDB.open(dbName);
    const store = new AppStore(db);
    await store.init();
    const p = await store.addProfile('Rocky Dewan');
    await store.selectProfile(p.id);
    db.close();
  }
  render(
    <ThemeProvider>
      <AppProvider dbName={dbName}>
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      </AppProvider>
    </ThemeProvider>,
  );
}

describe('Header mobile menu', () => {
  it('shows the current person, pages, theme and help links', async () => {
    const user = userEvent.setup();
    await renderHeader({ withPerson: true });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });

    await waitFor(() => expect(within(menu).getByText('Rocky Dewan')).toBeInTheDocument());
    expect(within(menu).getByRole('button', { name: 'Switch' })).toBeInTheDocument();
    for (const name of ['My tasks', 'People', 'Backup & data', 'Help & Support', 'Privacy Policy', 'Terms of Service']) {
      expect(within(menu).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(menu).getByRole('link', { name: /DewanTech\.com/ })).toBeInTheDocument();
    expect(within(menu).getByRole('group', { name: 'Color theme' })).toBeInTheDocument();
    expect(within(menu).getByText(/© \d{4} Dewan Global LLC DBA DewanTech™/)).toBeInTheDocument();
    expect(within(menu).getByText('Technology Built with Purpose.')).toBeInTheDocument();
  });

  it('hides personal pages until someone is chosen', async () => {
    const user = userEvent.setup();
    await renderHeader({ withPerson: false });
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(menu).queryByRole('link', { name: 'People' })).not.toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Help & Support' })).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    await renderHeader({ withPerson: false });
    const opener = screen.getByRole('button', { name: 'Open menu' });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
