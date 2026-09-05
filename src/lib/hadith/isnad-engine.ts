import { stripHarakat } from '@/lib/arabic';

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
  /معاوية(\s+بن\s+أبي\s+سفيان)?/,
  /أب[وي]\s+أيوب(\s+الأنصاري)?/,
  /أب[وي]\s+ذر(\s+الغفاري)?/,
];

/**
 * Parses and reconstructs the Isnad (chain of narrators) from hadith text.
 */
export function parseHadithIsnad(arabicText: string, bookAuthor = 'الإمام'): ParsedIsnad {
  // Normalize text by stripping harakat for robust regex matching
  const clean = stripHarakat(arabicText).trim();

  const splitters = [
    /أن رسول الله صلى الله عليه وسلم قال/i,
    /عن رسول الله صلى الله عليه وسلم قال/i,
    /عن النبي صلى الله عليه وسلم قال/i,
    /قال رسول الله صلى الله عليه وسلم/i,
    /قال النبي صلى الله عليه وسلم/i,
    /سمعت رسول الله صلى الله عليه وسلم يقول/i,
    /سمعت رسول الله صلى الله عليه وسلم/i,
    /سمعت النبي صلى الله عليه وسلم/i,
    /صلى الله عليه وسلم :/i,
    /صلى الله عليه وسلم/i,
  ];

  let sanadPart = '';
  let matnPart = clean;

  for (const splitter of splitters) {
    const match = splitter.exec(clean);
    if (match && match.index > 15) {
      sanadPart = clean.slice(0, match.index + match[0].length);
      matnPart = clean.slice(match.index + match[0].length);
      break;
    }
  }

  if (!sanadPart || sanadPart.length < 20) {
    return {
      hasSanad: false,
      nodes: [],
      sanadText: '',
      matnText: clean,
      narratorCount: 0,
      chainTypeArabic: 'متن مباشر',
    };
  }

  const keywords = ['حدثنا', 'حدثني', 'أخبرنا', 'أخبرني', 'أنبأنا', 'سمعت', 'أنه سمع', 'عن'];
  const pattern = new RegExp(`(?:^|\\s)(${keywords.join('|')})(?:\\s+|:)`, 'g');

  const rawMatches: { keyword: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(sanadPart)) !== null) {
    rawMatches.push({ keyword: m[1], index: m.index });
  }

  const nodes: IsnadNode[] = [];
  let order = 1;

  // 1. Author of the collection
  nodes.push({
    order: order++,
    role: 'المصنف',
    name: bookAuthor,
    phrase: 'خرّج وروى',
    isSahabi: false,
  });

  // 2. Sequential narrator nodes
  for (let i = 0; i < rawMatches.length; i++) {
    const current = rawMatches[i];
    const nextIndex = i + 1 < rawMatches.length ? rawMatches[i + 1].index : sanadPart.length;
    const chunk = sanadPart.slice(current.index, nextIndex);

    let name = chunk.replace(new RegExp(`^\\s*${current.keyword}[:\\s]*`, 'g'), '').trim();

    name = name
      .replace(/^قال\s*[:،]?\s*/g, '')
      .replace(/،\s*قال\s*[:،]?\s*/g, '')
      .replace(/رضي\s+الله\s+عنه(ما|م)?/g, '')
      .replace(/صلى\s+الله\s+عليه\s+وسلم/g, '')
      .replace(/على\s+المنبر/g, '')
      .replace(/يقول\s*[:،]?\s*/g, '')
      .replace(/[«»"،:.\-]/g, '')
      .trim();

    if (
      name.length >= 3 &&
      !name.startsWith('رسول الله') &&
      !name.startsWith('النبي') &&
      !name.startsWith('أن رسول')
    ) {
      // Sahabah are typically near the end of the chain (closest to the Prophet)
      const isPotentialSahabi = i >= Math.max(1, rawMatches.length - 2);
      const isSahabi = isPotentialSahabi && SAHABAH_PATTERNS.some((pat) => pat.test(name));

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

  // 3. The Prophet Muhammad ﷺ
  nodes.push({
    order: order++,
    role: 'خاتم الأنبياء ﷺ',
    name: 'سيدنا رسول الله محمد ﷺ',
    phrase: 'قال وبلّغ',
    isSahabi: false,
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
