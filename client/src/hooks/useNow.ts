import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs` while `active` (for "5 hours left" labels). */
export function useNow(active = true, intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
