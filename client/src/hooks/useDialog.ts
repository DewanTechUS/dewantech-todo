import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

/** Open dialogs, innermost last. Only the top one handles Escape and Tab (a picker can open over a form). */
const stack: object[] = [];

/**
 * Shared behaviour for modal surfaces (dialogs, the mobile menu): moves focus inside,
 * traps Tab, closes on Escape, locks page scroll, and restores focus on close.
 */
export function useDialog(panel: RefObject<HTMLElement>, onClose: () => void, initialFocus?: string) {
  useEffect(() => {
    const token = {};
    stack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = initialFocus ? panel.current?.querySelector<HTMLElement>(initialFocus) : null;
    (first ?? panel.current)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && panel.current) {
        const focusables = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!focusables.length) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      stack.splice(stack.indexOf(token), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
    // Runs once per open; onClose identity changes are irrelevant here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
