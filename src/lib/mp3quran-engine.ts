export interface RiwayahReciterEntry {
  reciterId: number;
  reciterName: string;
  moshafId: number;
  moshafName: string;
  server: string;
  surahTotal: number;
  surahList: number[];
}

export interface Mp3Moshaf {
  id: number;
  name: string;
  server: string;
  surahTotal: number;
  surahList: number[];
}

export interface Mp3Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Mp3Moshaf[];
}

let cachedRiwayaatMap: Record<string, RiwayahReciterEntry[]> | null = null;
let cachedReciters: Mp3Reciter[] | null = null;

/**
 * Loads the Riwayaat-to-Reciters mapping (compatible with both Browser and Node/SSR)
 */
export async function loadRiwayaatRecitersMap(): Promise<Record<string, RiwayahReciterEntry[]>> {
  if (cachedRiwayaatMap) return cachedRiwayaatMap;

  // If running on server or in test script
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'data', 'quran', 'riwayaat_reciters_map.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        cachedRiwayaatMap = data;
        return data;
      }
    } catch {
      /* fallback */
    }
  }

  try {
    const res = await fetch('/data/quran/riwayaat_reciters_map.json');
    if (res.ok) {
      const data = await res.json();
      cachedRiwayaatMap = data;
      return data;
    }
  } catch (err) {
    console.warn('Failed to load riwayaat map:', err);
  }

  return {};
}

/**
 * Gets the list of reciters who have recorded a specific Riwayah
 */
export async function getRecitersForRiwayah(riwayahId: string): Promise<RiwayahReciterEntry[]> {
  const map = await loadRiwayaatRecitersMap();
  const list = map[riwayahId] || [];
  if (list.length > 0) return list;

  // Fallback to Hafs if none found
  return map['hafs'] || [];
}

/**
 * Loads the full catalog of 240+ Quran Reciters from MP3Quran
 */
export async function loadMp3QuranReciters(): Promise<Mp3Reciter[]> {
  if (cachedReciters && cachedReciters.length > 0) {
    return cachedReciters;
  }

  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'data', 'quran', 'mp3quran_reciters.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Mp3Reciter[];
        cachedReciters = data;
        return data;
      }
    } catch {
      /* fallback */
    }
  }

  try {
    const res = await fetch('/data/quran/mp3quran_reciters.json');
    if (res.ok) {
      const data = (await res.json()) as Mp3Reciter[];
      cachedReciters = data;
      return data;
    }
  } catch {
    /* fallback to direct API */
  }

  try {
    const res = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
    if (res.ok) {
      const data = await res.json();
      const reciters = data.reciters.map((r: any) => ({
        id: r.id,
        name: r.name,
        letter: r.letter,
        moshaf: (r.moshaf || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          server: m.server.endsWith('/') ? m.server : `${m.server}/`,
          surahTotal: m.surah_total,
          surahList: (m.surah_list || '').split(',').map((s: string) => Number(s.trim())).filter(Boolean),
        })),
      }));
      cachedReciters = reciters;
      return reciters;
    }
  } catch (err) {
    console.error('Failed to load MP3Quran reciters:', err);
  }

  return [];
}

/**
 * Builds the direct MP3 audio streaming URL for a Surah
 */
export function getMp3QuranSurahUrl(serverUrl: string, surahNo: number): string {
  const sStr = String(surahNo).padStart(3, '0');
  const base = serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
  return `${base}${sStr}.mp3`;
}
