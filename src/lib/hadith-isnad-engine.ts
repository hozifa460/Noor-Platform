import { normalizeArabic } from './arabic-normalizer';

export interface IsnadNode {
  order: number;
  role: 'المصنف' | 'شيخ المصنف' | 'راوٍ' | 'التابعي' | 'الصحابي الجليل' | 'خاتم الأنبياء ﷺ';
  name: string;
  phrase: string;
  isSahabi?: boolean;
}

export interface ParsedIsnad {
  hasSanad: boolean;
  nodes: IsnadNode[];
  sanadText: string;
  matnText: string;
  narratorCount: number;
  chainTypeArabic: string; // ثلاثي، رباعي، خماسي، سداسي، سباعي...
}

const CHAIN_TYPES: Record<number, string> = {
  1: 'رواية مباشرة',
  2: 'إسناد ثنائي',
  3: 'إسناد ثلاثي (من عوالي الإسناد) 🌟',
  4: 'إسناد رباعي',
  5: 'إسناد خماسي',
  6: 'إسناد سداسي',
  7: 'إسناد سباعي',
  8: 'إسناد ثماني',
  9: 'إسناد تساعي',
};

const SAHABAH_PATTERNS = [
  /عمر(\s+بن\s+الخطاب)?/,
  /أب[وي]\s+هريرة/,
  /عائشة/,
  /أنس(\s+بن\s+مالك)?/,
  /جابر(\s+بن\s+عبد\s*الله)?/,
  /ابن\s+عمر/,
  /عبد\s*الله\s+بن\s+عمر/,
  /ابن\s+عباس/,
  /عبد\s*الله\s+بن\s+عباس/,
  /عبد\s*الله\s+بن\s+مسعود/,
  /ابن\s+مسعود/,
  /علي(\s+بن\s+أبي\s+طالب)?/,
  /عثمان(\s+بن\s+عفان)?/,
  /أب[وي]\s+بكر/,
  /أب[وي]\s+سعيد(\s+الخدري)?/,
  /أب[وي]\s+موسى(\s+الأشعري)?/,
  /حذيفة(\s+بن\s+اليمان)?/,
  /معاذ(\s+بن\s+جبل)?/,
  /سلمان(\s+الفارسي)?/,
  /أم\s+سلمة/,
  /سعد\s+بن\s+أبي\s+وقاص/,
  /طلحة(\s+بن\s+عبيد\s*الله)?/,
  /الزبير(\s+بن\s+العوام)?/,
  /عمرو\s+بن\s+العاص/,
  /بلال(\s+بن\s+رباح)?/,
  /خالد\s+بن\s+الوليد/,
  /أسامة\s+بن\s+زيد/,
  /زيد\s+بن\s+ثابت/,
  /البراء\s+بن\s+عازب/,
  /أبي\s+بن\s+كعب/,
];

const SANAD_MATN_SPLITTERS = [
  /أَنَّ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ/i,
  /أن رسول الله صلى الله عليه وسلم قال/i,
  /عَنْ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ/i,
  /عن رسول الله صلى الله عليه وسلم قال/i,
  /عَنِ النَّبِيِّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ/i,
  /عن النبي صلى الله عليه وسلم قال/i,
  /قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ/i,
  /قال رسول الله صلى الله عليه وسلم/i,
  /قَالَ النَّبِيُّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ/i,
  /قال النبي صلى الله عليه وسلم/i,
  /سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ يَقُولُ/i,
  /سمعت رسول الله صلى الله عليه وسلم يقول/i,
  /سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ/i,
  /سمعت رسول الله صلى الله عليه وسلم/i,
  /سَمِعْتُ النَّبِيَّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ/i,
  /سمعت النبي صلى الله عليه وسلم/i,
  /صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ :/i,
  /صلى الله عليه وسلم :/i,
];

/**
 * Parses and reconstructs the Isnad (chain of narrators) from hadith text.
 */
export function parseHadithIsnad(arabicText: string, bookAuthor = 'الإمام'): ParsedIsnad {
  const trimmed = arabicText.trim();

  let sanadPart = '';
  let matnPart = trimmed;

  // 1. Find the split point between Sanad and Matn
  for (const splitter of SANAD_MATN_SPLITTERS) {
    const match = splitter.exec(trimmed);
    if (match && match.index > 15) {
      sanadPart = trimmed.slice(0, match.index + match[0].length);
      matnPart = trimmed.slice(match.index + match[0].length);
      break;
    }
  }

  // Fallback split point: check for generic صلى الله عليه وسلم before 60% of text
  if (!sanadPart) {
    const pbuhMatch = /صلى\s+الله\s+عليه\s+وسلم/i.exec(trimmed);
    if (pbuhMatch && pbuhMatch.index > 25 && pbuhMatch.index < trimmed.length * 0.6) {
      sanadPart = trimmed.slice(0, pbuhMatch.index + pbuhMatch[0].length);
      matnPart = trimmed.slice(pbuhMatch.index + pbuhMatch[0].length);
    }
  }

  if (!sanadPart || sanadPart.length < 20) {
    // Hadiths without formal chain (or matn-only representations)
    return {
      hasSanad: false,
      nodes: [],
      sanadText: '',
      matnText: trimmed,
      narratorCount: 0,
      chainTypeArabic: 'متن مباشر',
    };
  }

  // 2. Extract narrator tokens using Tahammul keywords
  const keywords = ['حدثنا', 'حدثني', 'أخبرنا', 'أخبرني', 'أنبأنا', 'سمعت', 'أنه سمع', 'عن'];
  const pattern = new RegExp(`(?:^|\\s)(${keywords.join('|')})(?:\\s+|:)`, 'g');

  const rawMatches: { keyword: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(sanadPart)) !== null) {
    rawMatches.push({ keyword: m[1], index: m.index });
  }

  const nodes: IsnadNode[] = [];
  let order = 1;

  // Node 1: Author of the collection
  nodes.push({
    order: order++,
    role: 'المصنف',
    name: bookAuthor,
    phrase: 'خرّج وروى',
  });

  // Intermediate narrator nodes
  for (let i = 0; i < rawMatches.length; i++) {
    const current = rawMatches[i];
    const nextIndex = i + 1 < rawMatches.length ? rawMatches[i + 1].index : sanadPart.length;
    const chunk = sanadPart.slice(current.index, nextIndex);

    let name = chunk.replace(new RegExp(`^\\s*${current.keyword}[:\\s]*`, 'g'), '').trim();

    // Clean extraneous words
    name = name
      .replace(/^قال\s*[:،]?\s*/g, '')
      .replace(/،\s*قال\s*[:،]?\s*/g, '')
      .replace(/رضي\s+الله\s+عنه(ما|م)?/g, '')
      .replace(/صلى\s+الله\s+عليه\s+وسلم/g, '')
      .replace(/على\s+المنبر/g, '')
      .replace(/يقول\s*[:،]?\s*/g, '')
      .replace(/[،:«»\-]/g, '')
      .trim();

    // Skip empty or generic Prophet mentions
    if (
      name.length >= 3 &&
      !name.startsWith('رسول الله') &&
      !name.startsWith('النبي') &&
      !name.startsWith('أن رسول')
    ) {
      const normName = normalizeArabic(name);
      const isSahabi = SAHABAH_PATTERNS.some((pat) => pat.test(normName) || pat.test(name));

      let role: IsnadNode['role'] = 'راوٍ';
      if (nodes.length === 1) {
        role = 'شيخ المصنف';
      } else if (isSahabi) {
        role = 'الصحابي الجليل';
      } else if (i === rawMatches.length - 2) {
        role = 'التابعي';
      }

      nodes.push({
        order: order++,
        role,
        name,
        phrase: current.keyword,
        isSahabi,
      });
    }
  }

  // Final Node: The Prophet Muhammad ﷺ
  nodes.push({
    order: order++,
    role: 'خاتم الأنبياء ﷺ',
    name: 'سيدنا رسول الله محمد ﷺ',
    phrase: 'قال وبلّغ',
  });

  const narratorCount = Math.max(1, nodes.length - 2);
  const chainTypeArabic = CHAIN_TYPES[narratorCount] || `إسناد (${narratorCount}) رواة`;

  return {
    hasSanad: true,
    nodes,
    sanadText: sanadPart.trim(),
    matnText: matnPart.trim(),
    narratorCount,
    chainTypeArabic,
  };
}
