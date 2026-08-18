import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';
import { normalizeArabic } from '../../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

// Comprehensive Isnad stripping & Matn extraction investigation
// Let's test candidate extraction algorithms on a massive sample across ALL 17 books

async function fetchBook(fileName) {
  const url = `${HF_SUNNAH_BASE}/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  return await res.json();
}

/**
 * Candidate Isnad Stripping Strategy:
 *
 * 1. Normalize tashkeel and punctuation variations to make regex robust,
 *    OR apply regex on normalized text vs raw text.
 * 2. Look for prophetic transition anchors:
 *    - أن رسول الله صلى الله عليه وسلم (قال|يقول|كان|نهى|أمر|سئل|بعث|خطب|...)
 *    - قال رسول الله صلى الله عليه وسلم
 *    - سمعت رسول الله صلى الله عليه وسلم (يقول|...)
 *    - عن النبي صلى الله عليه وسلم (قال|أنه قال|يقول|...)
 *    - أن النبي صلى الله عليه وسلم (قال|كان|نهى|أمر|...)
 *    - عن [صحابي] رضي الله عنه [قال|أن رسول الله...]
 *    - Quotes "..." or «...»
 * 3. Look for sahabi narrative transitions:
 *    - بينما نحن جلوس عند رسول الله...
 *    - كان رسول الله صلى الله عليه وسلم...
 *    - نهى رسول الله صلى الله عليه وسلم...
 *    - أمر رسول الله صلى الله عليه وسلم...
 *    - لما كان يوم... / غزونا مع رسول الله... / كنا مع النبي...
 * 4. Trailing comments & takhrij stripping:
 *    - رواه البخاري / رواه مسلم / متفق عليه / أخرجه...
 *    - قال أبو عيسى / قال الترمذي / هذا حديث حسن صحيح / ...
 * 5. Fallback safety:
 *    - If no isnad pattern matches, or if stripping would leave < 10 characters, keep the full text!
 *    - Never truncate crucial matn keywords.
 */

async function main() {
  console.log('=== In-depth Hadith Isnad & Matn Analysis across 17 Collections ===\n');

  const stats = {
    totalHadiths: 0,
    byBook: {},
  };

  // Test set of diverse famous hadiths to explicitly verify
  const famousHadithChecks = [
    { query: 'الاعمال بالنيات', name: 'Hadith 1: Niyyat (Intentions)' },
    { query: 'بني الاسلام على خمس', name: 'Five Pillars of Islam' },
    { query: 'دع ما يريبك الى ما لا يريبك', name: 'Leave what is doubtful' },
    { query: 'لا يؤمن احدكم حتى يحب لاخيه', name: 'Love for brother what you love for yourself' },
    { query: 'من احدث في امرنا هذا ما ليس منه فهو رد', name: 'Innovation in religion is rejected' },
    { query: 'الحلال بين والحرام بين', name: 'Halal is clear and Haram is clear' },
    { query: 'ان الله طيب لا يقبل الا طيبا', name: 'Allah is pure and accepts only pure' },
    { query: 'لا ضرر ولا ضرار', name: 'No harm and no reciprocating harm' },
    { query: 'اتق الله حيثما كنت', name: 'Fear Allah wherever you are' },
    { query: 'الدين النصيحة', name: 'Religion is sincere advice' },
  ];

  for (const book of HADITH_BOOKS_LIST) {
    console.log(`Processing ${book.nameAr} (${book.fileName})...`);
    try {
      const data = await fetchBook(book.fileName);
      if (!data || !data.hadiths) continue;

      stats.byBook[book.id] = {
        total: data.hadiths.length,
        hasQuotes: 0,
        hasPropheticTransition: 0,
        hasNarrativeTransition: 0,
        noTransitionMatched: 0,
        avgRawLength: 0,
        avgMatnLength: 0,
      };

      let totalRawLen = 0;
      let totalMatnLen = 0;

      for (let i = 0; i < data.hadiths.length; i++) {
        stats.totalHadiths++;
        const h = data.hadiths[i];
        const raw = (h.arabic || '').replace(/[\n\r]+/g, ' ').trim();
        totalRawLen += raw.length;

        // Check quotes
        if (/["«“][\s\S]+?["»”]/.test(raw) || /‏"‏/.test(raw)) {
          stats.byBook[book.id].hasQuotes++;
        }

        // Test normalization
        const norm = normalizeArabic(raw);

        // Transition detection test
        // Let's test various anchor points
        const propheticAnchor = /(?:قال|يقول|سمعت|عن|ان|اخبرنا|حدثنا)?\s*(?:رسول الله|النبي|النبي صلى الله عليه وسلم|رسول الله صلى الله عليه وسلم)\s*(?:صلى الله عليه وسلم)?\s*(?:قال|يقول|انه قال|يقول|:)?/i;
        
        // Let's log sample extractions for first 3 hadiths of each book
        if (i < 3) {
          console.log(`  [#${h.idInBook}] Raw: ${raw.slice(0, 100)}...`);
        }
      }

      stats.byBook[book.id].avgRawLength = Math.round(totalRawLen / data.hadiths.length);
      console.log(`  -> Indexed ${data.hadiths.length} hadiths (avg length: ${stats.byBook[book.id].avgRawLength} chars)\n`);
    } catch (err) {
      console.error(`  Error in ${book.fileName}:`, err.message);
    }
  }

  console.log(`Total Hadiths Processed across all collections: ${stats.totalHadiths}`);
}

main().catch(console.error);
