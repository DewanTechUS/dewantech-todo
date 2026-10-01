import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SpeechError, type MicPermission, type SpeechHandlers, type SpeechService, type SpeechSupport } from '../lib/speech';
import { KEYS } from '../lib/storage';
import { VoiceInput } from './VoiceInput';

function fakeSpeech(opts: { support?: SpeechSupport; permission?: MicPermission } = {}) {
  let handlers: SpeechHandlers | null = null;
  const stop = vi.fn(() => handlers?.onEnd());
  const service: SpeechService = {
    support: () => opts.support ?? 'web',
    permission: async () => opts.permission ?? 'granted',
    start: vi.fn(async (h: SpeechHandlers) => {
      handlers = h;
      return { stop };
    }),
  };
  return {
    service,
    stop,
    say: (text: string) => handlers!.onTranscript(text),
    end: () => handlers!.onEnd(),
    fail: (code: SpeechError['code']) => handlers!.onError(new SpeechError(code)),
  };
}

describe('VoiceInput', () => {
  it('shows a typing fallback when speech recognition is unavailable', () => {
    render(<VoiceInput onUse={vi.fn()} speech={fakeSpeech({ support: 'none' }).service} />);
    expect(screen.queryByRole('button', { name: /voice/i })).not.toBeInTheDocument();
    expect(screen.getByText(/isn't available in this browser\. Type your task/i)).toBeInTheDocument();
  });

  it('explains microphone use before the first permission prompt', async () => {
    const user = userEvent.setup();
    const speech = fakeSpeech({ permission: 'prompt' });
    const onTypeInstead = vi.fn();
    render(<VoiceInput onUse={vi.fn()} onTypeInstead={onTypeInstead} speech={speech.service} />);

    await user.click(screen.getByRole('button', { name: 'Add task by voice' }));
    expect(screen.getByText('Allow microphone access?')).toBeInTheDocument();
    expect(speech.service.start).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Type instead' }));
    expect(onTypeInstead).toHaveBeenCalled();
    expect(speech.service.start).not.toHaveBeenCalled();
  });

  it('records speech into an editable preview and only uses it after confirmation', async () => {
    localStorage.setItem(KEYS.micExplained, 'true');
    const user = userEvent.setup();
    const speech = fakeSpeech();
    const onUse = vi.fn();
    render(<VoiceInput onUse={onUse} speech={speech.service} />);

    await user.click(screen.getByRole('button', { name: 'Add task by voice' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop voice input' })).toHaveAttribute('aria-pressed', 'true'));

    speech.say('buy milk tomorow');
    await screen.findByText('“buy milk tomorow”');
    await user.click(screen.getByRole('button', { name: 'Stop voice input' }));

    const preview = await screen.findByLabelText(/review what we heard/i);
    expect(preview).toHaveValue('buy milk tomorow');
    expect(onUse).not.toHaveBeenCalled();

    await user.clear(preview);
    await user.type(preview, 'Buy milk tomorrow');
    await user.click(screen.getByRole('button', { name: 'Use this text' }));
    expect(onUse).toHaveBeenCalledWith('Buy milk tomorrow');
  });

  it('shows clear guidance when microphone permission is denied', async () => {
    localStorage.setItem(KEYS.micExplained, 'true');
    const user = userEvent.setup();
    const speech = fakeSpeech();
    render(<VoiceInput onUse={vi.fn()} onTypeInstead={vi.fn()} speech={speech.service} />);

    await user.click(screen.getByRole('button', { name: 'Add task by voice' }));
    await waitFor(() => expect(speech.service.start).toHaveBeenCalled());
    speech.fail('permission-denied');
    speech.end();

    const alert = await screen.findByRole('status');
    expect(alert).toHaveTextContent(/microphone access was blocked/i);
    expect(screen.getByRole('button', { name: 'Type your task' })).toBeInTheDocument();
  });

  it('does not start when the browser already reports the permission as denied', async () => {
    const user = userEvent.setup();
    const speech = fakeSpeech({ permission: 'denied' });
    render(<VoiceInput onUse={vi.fn()} speech={speech.service} />);
    await user.click(screen.getByRole('button', { name: 'Add task by voice' }));
    expect(await screen.findByText(/microphone access was blocked/i)).toBeInTheDocument();
    expect(speech.service.start).not.toHaveBeenCalled();
  });

  it("tells the user when nothing was heard", async () => {
    localStorage.setItem(KEYS.micExplained, 'true');
    const user = userEvent.setup();
    const speech = fakeSpeech();
    render(<VoiceInput onUse={vi.fn()} speech={speech.service} />);
    await user.click(screen.getByRole('button', { name: 'Add task by voice' }));
    await waitFor(() => expect(speech.service.start).toHaveBeenCalled());
    speech.end();
    expect(await screen.findByText(/didn't hear anything/i)).toBeInTheDocument();
  });
});
