/**
 * Audio time formatting and player utilities.
 */

export function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Adjusts Ayah number for Warsh audio stream alignment.
 * In Surah Al-Fatihah, Warsh starts counting from verse 2 in some audio recordings.
 */
export function getWarshAyahAudioNumber(surahNo: number, ayahNo: number): number {
  if (surahNo === 1) {
    if (ayahNo <= 1) return 1;
    return Math.max(1, ayahNo - 1);
  }
  return ayahNo;
}
