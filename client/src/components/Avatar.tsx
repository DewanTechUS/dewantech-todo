import type { Profile } from '../lib/types';

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

/** Coloured circle with a person's initials. Decorative: always show the name as text nearby. */
export function Avatar({ profile, size = 40 }: { profile: Pick<Profile, 'name' | 'color'>; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: profile.color, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials(profile.name)}
    </span>
  );
}
