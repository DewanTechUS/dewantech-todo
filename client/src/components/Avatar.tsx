/** Avatar colours, all readable with white initials. */
const COLORS = ['#006fef', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#16a34a', '#b45309', '#475569'];

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      // Only words that start with a letter, so "Alex (demo)" → "A", not "A(".
      .filter((w) => /^\p{L}/u.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

/** Stable colour per person, derived from their id. */
export function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

/** Coloured circle with a person's initials. Decorative: always show the name as text nearby. */
export function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colorFor(seed), fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}
