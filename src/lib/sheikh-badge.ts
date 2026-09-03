import type { SheikhBadgeInfo } from '@/types/radio';

/**
 * Helper to generate consistent, distinct geometric gradient and initials for a sheikh / radio station.
 */
export function getSheikhBadgeInfo(name: string): SheikhBadgeInfo {
  const clean = name
    .replace(/^(إذاعة|الشيخ|القارئ|الدكتور|فضيلة الشيخ)\s+/gi, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0].charAt(0)} ${words[1].charAt(0)}`
      : clean.slice(0, 2);

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  const gradients = [
    'from-emerald-900 via-emerald-800 to-teal-950 text-emerald-200 border-emerald-500/30',
    'from-amber-950 via-amber-900 to-yellow-950 text-amber-200 border-amber-500/30',
    'from-blue-950 via-indigo-900 to-slate-950 text-blue-200 border-blue-500/30',
    'from-stone-900 via-stone-800 to-neutral-950 text-stone-200 border-stone-500/30',
    'from-rose-950 via-red-900 to-stone-950 text-rose-200 border-rose-500/30',
    'from-cyan-950 via-teal-900 to-emerald-950 text-cyan-200 border-cyan-500/30',
  ];
  const gradientClass = gradients[Math.abs(hash) % gradients.length];

  return { initials, gradientClass, displayName: clean };
}
