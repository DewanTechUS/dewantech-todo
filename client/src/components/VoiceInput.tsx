import { useEffect, useId, useRef, useState } from 'react';
import { KEYS, storage } from '../lib/storage';
import { SpeechError, speechErrorMessage, speechService, type SpeechService, type SpeechSession } from '../lib/speech';
import { Alert } from './Alert';
import { MicIcon, StopIcon } from './Icons';
import { Spinner } from './Spinner';

type Phase = 'idle' | 'explain' | 'starting' | 'listening' | 'review';

interface VoiceInputProps {
  /** Receives the reviewed transcript when the user confirms it. */
  onUse: (text: string) => void;
  /** Called when the user chooses to type instead (e.g. focus the title field). */
  onTypeInstead?: () => void;
  /** Injected for tests. */
  speech?: SpeechService;
}

export function VoiceInput({ onUse, onTypeInstead, speech = speechService }: VoiceInputProps) {
  const support = speech.support();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const session = useRef<SpeechSession | null>(null);
  const transcriptRef = useRef('');
  const erroredRef = useRef(false);
  const reviewRef = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const reviewId = useId();

  useEffect(() => () => session.current?.stop(), []);
  useEffect(() => {
    if (phase === 'review') reviewRef.current?.focus();
  }, [phase]);

  if (support === 'none') {
    return (
      <p id={hintId} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Voice input isn't available in this browser. Type your task below — everything else works the same.
      </p>
    );
  }

  const fail = (err: unknown) => {
    erroredRef.current = true;
    const code = err instanceof SpeechError ? err.code : 'unknown';
    setError(speechErrorMessage(code, support));
    setPhase('idle');
    session.current = null;
  };

  const begin = async () => {
    storage.set(KEYS.micExplained, true);
    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    erroredRef.current = false;
    setPhase('starting');
    try {
      session.current = await speech.start({
        onTranscript: (text) => {
          transcriptRef.current = text;
          setTranscript(text);
          setPhase('listening');
        },
        onError: fail,
        onEnd: () => {
          session.current = null;
          if (transcriptRef.current.trim()) {
            setPhase('review');
            return;
          }
          if (!erroredRef.current) setError(speechErrorMessage('no-speech', support));
          setPhase('idle');
        },
      });
      setPhase((p) => (p === 'starting' ? 'listening' : p));
    } catch (err) {
      fail(err);
    }
  };

  const onMicClick = async () => {
    if (phase === 'listening' || phase === 'starting') {
      session.current?.stop();
      return;
    }
    const permission = await speech.permission();
    if (permission === 'denied' && support === 'web') {
      setError(speechErrorMessage('permission-denied', support));
      return;
    }
    if (permission !== 'granted' && !storage.get<boolean>(KEYS.micExplained)) {
      setPhase('explain');
      return;
    }
    void begin();
  };

  const listening = phase === 'listening' || phase === 'starting';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void onMicClick()}
          aria-pressed={listening}
          aria-describedby={hintId}
          aria-label={listening ? 'Stop voice input' : 'Add task by voice'}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-colors ${
            listening ? 'animate-pulse bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {phase === 'starting' ? <Spinner label="Starting microphone" /> : listening ? <StopIcon /> : <MicIcon width={26} height={26} />}
        </button>
        <p id={hintId} className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {phase === 'starting' && 'Starting microphone…'}
          {phase === 'listening' && (transcript ? `“${transcript}”` : 'Listening… speak your task, then tap stop.')}
          {(phase === 'idle' || phase === 'explain') && 'Tap the microphone to add a task by voice, or type it below.'}
          {phase === 'review' && 'Check the text below before using it.'}
        </p>
      </div>

      {phase === 'explain' && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="mb-2 font-semibold text-slate-900 dark:text-white">Allow microphone access?</p>
          <p className="mb-3 text-slate-700 dark:text-slate-300">
            To turn your speech into text, your {support === 'native' ? 'device' : 'browser'} will ask for permission to use the
            microphone{support === 'native' ? ' and speech recognition' : ''}. Speech is converted to text by your{' '}
            {support === 'native' ? "device's" : "browser's"} speech service
            {support === 'web' ? ' (some browsers, such as Chrome, send audio to their provider for processing)' : ''}. DewanTech
            To-Do doesn't record or store audio — only the text you choose to save.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => void begin()}>
              Continue
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPhase('idle');
                onTypeInstead?.();
              }}
            >
              Type instead
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <label htmlFor={reviewId} className="label">
            Review what we heard (you can edit it)
          </label>
          <textarea
            id={reviewId}
            ref={reviewRef}
            className="input min-h-[88px]"
            value={transcript}
            maxLength={200}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!transcript.trim()}
              onClick={() => {
                onUse(transcript.trim());
                setTranscript('');
                setPhase('idle');
              }}
            >
              Use this text
            </button>
            <button type="button" className="btn-secondary" onClick={() => void begin()}>
              Try again
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setTranscript('');
                setPhase('idle');
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <Alert kind="warning" onDismiss={() => setError(null)}>
          {error}
          {onTypeInstead && (
            <>
              {' '}
              <button type="button" className="font-semibold underline" onClick={onTypeInstead}>
                Type your task
              </button>
            </>
          )}
        </Alert>
      )}
    </div>
  );
}
