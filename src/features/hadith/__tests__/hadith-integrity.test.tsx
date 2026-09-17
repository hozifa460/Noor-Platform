import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  normalizeGradeText,
  getHadithGrade,
  isMuttafaqunAlayh,
  findNarratorBio,
  getBookTranslationSupport,
  isBookTranslationAvailable,
  fetchHadithTranslation,
  parseMicroIndexPayload,
  findHadithSharh,
  type HadeethEncSharhItem,
  type HadithBookMeta,
  type HadithItem,
  HadithCard,
  HadithTranslationsView,
} from '../index';
import { FakeHadithResultCard } from '../ui/fake-hadith/FakeHadithResultCard';
import { HadithDetailModal } from '../ui/HadithDetailModal';

describe('Hadith Scientific Integrity & Attribution Safeguards', () => {
  describe('1. Grade Normalization & Fallbacks', () => {
    it('normalizes curly apostrophes, commas, and space variants in Daif', () => {
      expect(normalizeGradeText("Da'if")).toBe('ضعيف');
      expect(normalizeGradeText('Da’if')).toBe('ضعيف'); // Right single quotation mark \u2019
      expect(normalizeGradeText('Da‘if')).toBe('ضعيف'); // Left single quotation mark \u2018
      expect(normalizeGradeText('Da,if')).toBe('ضعيف'); // Comma typo
      expect(normalizeGradeText('Da if')).toBe('ضعيف'); // Space typo
      expect(normalizeGradeText('Munkar')).toBe('ضعيف');
      expect(normalizeGradeText('Shadh')).toBe('ضعيف');
      expect(normalizeGradeText("Maqtu'")).toBe('ضعيف');
    });

    it('normalizes Mawdu and Batil to موضوع', () => {
      expect(normalizeGradeText('Mawdu’')).toBe('موضوع');
      expect(normalizeGradeText('باطل وموضوع')).toBe('موضوع');
      expect(normalizeGradeText('Batil')).toBe('موضوع');
    });

    it('normalizes Sahih and Hasan properly', () => {
      expect(normalizeGradeText('Sahih')).toBe('صحيح');
      expect(normalizeGradeText('Sahih Lighairihi')).toBe('صحيح');
      expect(normalizeGradeText('Hasan')).toBe('حسن');
      expect(normalizeGradeText('Hasan Sahih')).toBe('صحيح');
    });

    it('defaults unknown or missing grade to غير محدد (NEVER مقبول)', () => {
      expect(normalizeGradeText('')).toBe('غير محدد');
      expect(normalizeGradeText(undefined)).toBe('غير محدد');
      expect(normalizeGradeText(null)).toBe('غير محدد');
      expect(normalizeGradeText('Unknown Grade Text')).toBe('غير محدد');
    });

    it('returns غير محدد for books without authenticated grades', () => {
      const ahmadGrade = getHadithGrade('ahmad', 100);
      expect(ahmadGrade.grade).toBe('غير محدد');
      expect(ahmadGrade.scholar).toBeUndefined();
      expect(ahmadGrade.rawGrade).toBeUndefined();
      expect(ahmadGrade.source).toContain('لم نقف على حكم مسند');
    });

    it('removes automatic blanket Sahih attribution for Nawawi 40 and Riyad as-Salihin', () => {
      const nawawiGrade = getHadithGrade('nawawi40', 1);
      expect(nawawiGrade.grade).toBe('غير محدد');
      expect(nawawiGrade.scholar).toBeUndefined();

      const riyadGrade = getHadithGrade('riyad', 1);
      expect(riyadGrade.grade).toBe('غير محدد');
      expect(riyadGrade.scholar).toBeUndefined();
    });

    it('parses micro index payload defaulting missing grade to غير محدد', () => {
      const payload: any = [
        ['bukhari', 1, 1, 'إنما الأعمال بالنيات'], // index 4 (grade) missing!
      ];
      const entries = parseMicroIndexPayload(payload);
      expect(entries.length).toBe(1);
      expect(entries[0].g).toBe('غير محدد');
    });
  });

  describe('2. Muttafaqun Alayh Safeguards', () => {
    it('does not falsely classify Bukhari or Muslim hadiths as Muttafaqun Alayh without text proof', () => {
      expect(isMuttafaqunAlayh('bukhari', 1)).toBe(false);
      expect(isMuttafaqunAlayh('muslim', 1)).toBe(false);
    });

    it('classifies as Muttafaqun Alayh when explicit wording is present in text', () => {
      expect(isMuttafaqunAlayh('bukhari', 1, 'أخرجه الشيخان ومتفق عليه')).toBe(true);
      expect(isMuttafaqunAlayh('muslim', 1, 'رواه البخاري ومسلم في صحيحيهما')).toBe(true);
      expect(isMuttafaqunAlayh('nawawi40', 1, 'رواه البخاري ومسلم متفق عليه')).toBe(true);
    });
  });

  describe('3. Unknown Narrator Safeguards', () => {
    it('does not invent ثقة مقبول الرواية for unknown narrators', () => {
      const profile = findNarratorBio('راوٍ غير معروف في المعجم');
      expect(profile).toBeDefined();
      expect(profile?.grade).toBe('راوٍ من رجال الأسانيد (يحتاج لمراجعة كتب الجرح والتعديل)');
      expect(profile?.grade).not.toContain('مقبول الرواية');
      expect(profile?.grade).not.toContain('ثقة');
    });
  });

  describe('4. Divergent Numbering & Translation Guard', () => {
    it('guards Sahih Muslim from unverified automatic translation lookup', async () => {
      expect(getBookTranslationSupport('muslim')).toBe('concordance_required');
      expect(isBookTranslationAvailable('muslim')).toBe(false);

      const translation = await fetchHadithTranslation('muslim', 1, 'eng');
      expect(translation).toBeNull();
    });

    it('allows verified concordant books for translations', () => {
      expect(getBookTranslationSupport('bukhari')).toBe('verified');
      expect(isBookTranslationAvailable('bukhari')).toBe(true);
    });
  });

  describe('5. Sharh Threshold Safeguard', () => {
    it('rejects sharh candidates when similarity score is below 0.85 even if words match', async () => {
      // Hadith text with common words that doesn't match any specific sharh entry
      const hadithMatn = 'حدثنا فلان قال رأيت رجلا يصلي في بستانه بالمدينة ومعه كتاب يقرأ فيه بالبركة';
      const match = await findHadithSharh(hadithMatn);
      expect(match).toBeNull();
    });
  });

  describe('6. UI Rendering Integrity (Static Markup)', () => {
    const sampleBook: HadithBookMeta = {
      id: 'ahmad',
      nameAr: 'مسند أحمد بن حنبل',
      nameEn: 'Musnad Ahmad',
      authorAr: 'الإمام أحمد بن حنبل',
      authorEn: 'Imam Ahmad ibn Hanbal',
      fileName: 'ahmad.json',
      category: 'masanid',
      hadithCount: 27000,
      description: 'مسند الإمام أحمد',
    };

    const sampleHadith: HadithItem = {
      id: 1,
      idInBook: 1,
      chapterId: 1,
      bookId: 1,
      arabic: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
    };

    it('renders neutral badge for غير محدد in HadithCard', () => {
      const html = renderToStaticMarkup(
        <HadithCard
          hadith={sampleHadith}
          book={sampleBook}
          onOpenDetail={() => {}}
        />
      );

      expect(html).toContain('غير محدد');
      expect(html).toContain('bg-muted/80');
    });

    it('renders concordance warning notice for Sahih Muslim in HadithTranslationsView', () => {
      const html = renderToStaticMarkup(
        <HadithTranslationsView
          bookId="muslim"
          bookName="صحيح مسلم"
          hadithNumber={100}
        />
      );

      expect(html).toContain('تنبيه بشأن ترقيم الترجمات لهذا الكتاب');
      expect(html).toContain('صحيح مسلم');
      expect(html).toContain('ترقيم عبد الباقي');
    });

    it('renders neutral scientific disclaimer in FakeHadithResultCard for authentic match', () => {
      const html = renderToStaticMarkup(
        <FakeHadithResultCard
          result={{
            query: 'إنما الأعمال بالنيات',
            status: 'authentic',
            matchedFake: null,
            authenticMatches: [
              {
                hadith: sampleHadith,
                book: sampleBook,
              },
            ],
          }}
        />
      );

      expect(html).toContain('الحديث مخرّج في دواوين السنة (يُرجى مراجعة حكم المحدثين على سنده)');
      expect(html).not.toContain('الحديث ثابت ومخرّج');
      expect(html).toContain('مسند أحمد بن حنبل');
      expect(html).toContain('غير محدد');
    });

    it('renders clarification that absence from quick index does not prove fabrication', () => {
      const html = renderToStaticMarkup(
        <FakeHadithResultCard
          result={{
            query: 'نص غير مفهرس',
            status: 'unverified',
            matchedFake: null,
            authenticMatches: [],
          }}
        />
      );

      expect(html).toContain('لم نجد حكماً مباشراً على هذا النص بعينه في الفهرس السريع');
      expect(html).toContain('عدم العثور على الحديث في الفهرس السريع لا يعني تلقائياً أنه مكذوب');
    });

    it('severs sharh.grade from dictating the hadith grade in HadithDetailModal', () => {
      const html = renderToStaticMarkup(
        <HadithDetailModal
          hadith={sampleHadith}
          book={sampleBook}
          sharh={{
            id: 'fake-sharh',
            title: 'شرح',
            hadeeth: sampleHadith.arabic,
            explanation: 'شرح تجريبي',
            grade: 'صحيح لغيره بمجموع الطرق', // This should NOT override hadith grade!
          }}
          loadingSharh={false}
          onClose={() => {}}
        />
      );

      // Hadith in Musnad Ahmad has unrecorded grade in engine, so it must display 'غير محدد', NOT 'صحيح لغيره بمجموع الطرق'
      expect(html).toContain('غير محدد');
    });
  });
});
