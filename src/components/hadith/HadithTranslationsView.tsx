'use client';

import React, { useState, useEffect } from 'react';
import {
  SUPPORTED_TRANSLATION_LANGUAGES,
  fetchHadithTranslation,
  isBookTranslationAvailable,
  type HadithTranslationResult,
  type SupportedTranslationLanguage,
} from '@/lib/hadith';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy, Check, Globe, RefreshCw, Languages, AlertCircle } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';

interface HadithTranslationsViewProps {
  bookId: string;
  bookName: string;
  hadithNumber: number;
}

export function HadithTranslationsView({
  bookId,
  bookName,
  hadithNumber,
}: HadithTranslationsViewProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedTranslationLanguage>(
    SUPPORTED_TRANSLATION_LANGUAGES[0] // Default to English
  );
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<HadithTranslationResult | null>(null);
  const { copied, copy } = useClipboard();

  const isAvailable = isBookTranslationAvailable(bookId);

  useEffect(() => {
    if (!isAvailable) return;
    let active = true;

    async function load() {
      setLoading(true);
      const res = await fetchHadithTranslation(bookId, hadithNumber, selectedLang.code);
      if (active) {
        setTranslation(res);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [bookId, hadithNumber, selectedLang.code, isAvailable]);

  const handleCopy = () => {
    if (!translation?.text) return;
    const toCopy = `« ${translation.text} »\n\n[${bookName} - Hadith #${hadithNumber} (${selectedLang.nameEn})]\nSource: Noor Platform (منصة النور)`;
    copy(toCopy, `تم نسخ الترجمة (${selectedLang.nameAr}) بنجاح`);
  };


  if (!isAvailable) {
    return (
      <div className="py-12 px-4 text-center space-y-4 bg-muted/20 rounded-3xl border border-border/60">
        <div className="size-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center mx-auto">
          <Languages className="size-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="font-bold text-sm text-foreground">
            الترجمات غير متاحة لهذا الديوان حالياً
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تتوفر الترجمات العالمية المعتمدة حالياً للكتب التسعة الرئيسية (البخاري، مسلم، أبو داود، الترمذي، النسائي، ابن ماجه، موطأ مالك، والأربعينيات).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Language Switcher Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Globe className="size-3.5 text-primary" />
            اختر لغة الترجمة المعتمدة:
          </span>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            {SUPPORTED_TRANSLATION_LANGUAGES.length} لغات عالمية
          </Badge>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {SUPPORTED_TRANSLATION_LANGUAGES.map((lang) => {
            const isSelected = selectedLang.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang)}
                className={cn(
                  'px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 border flex items-center gap-2 shadow-2xs cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-102'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60'
                )}
              >
                <span className="text-sm">{lang.flag}</span>
                <span>{lang.nameEn}</span>
                <span className="text-[10px] opacity-70">({lang.nameAr})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Translation Content Area */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-muted-foreground animate-pulse">
              جاري جلب الترجمة المعتمدة بـ {selectedLang.nameAr}...
            </p>
          </div>
        ) : translation?.text ? (
          <>
            {/* Header info inside translation card */}
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedLang.flag}</span>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {selectedLang.nameEn} — {selectedLang.nameAr}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    طبعة معتمدة رسمية • حديث رقم {hadithNumber}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="rounded-xl text-xs gap-1.5 font-bold shrink-0"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? 'تم النسخ' : 'نسخ الترجمة'}</span>
              </Button>
            </div>

            {/* Translated Body */}
            <div
              dir={selectedLang.direction}
              className={cn(
                'text-sm sm:text-base leading-relaxed text-foreground font-sans pt-1',
                selectedLang.direction === 'rtl' ? 'font-serif text-right' : 'text-left'
              )}
            >
              {translation.text}
            </div>
          </>
        ) : (
          <div className="py-12 text-center space-y-3">
            <AlertCircle className="size-8 text-amber-500 mx-auto" />
            <h5 className="font-bold text-sm text-foreground">
              الترجمة غير متوفرة لهذا الحديث بـ {selectedLang.nameAr}
            </h5>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              يمكنك تجربة لغة أخرى مثل الإنجليزية (English) أو الفرنسية (Français) من شريط اللغات أعلاه.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLang(SUPPORTED_TRANSLATION_LANGUAGES[0])}
              className="rounded-xl text-xs gap-1.5 mt-2"
            >
              <RefreshCw className="size-3.5" />
              <span>التبديل إلى الإنجليزية</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
