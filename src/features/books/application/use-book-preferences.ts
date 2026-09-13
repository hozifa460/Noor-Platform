'use client';

import { useState } from 'react';
import type { ReadingTheme, TashkeelMode, FontFamily } from '../ui/ebook/types';

export function useBookPreferences() {
  const [fontSize, setFontSize] = useState<number>(20);
  const [theme, setTheme] = useState<ReadingTheme>('sepia');
  const [tashkeel, setTashkeel] = useState<TashkeelMode>('full');
  const [fontFamily, setFontFamily] = useState<FontFamily>('amiri');
  const [focusMode, setFocusMode] = useState<boolean>(false);

  return {
    fontSize,
    setFontSize,
    theme,
    setTheme,
    tashkeel,
    setTashkeel,
    fontFamily,
    setFontFamily,
    focusMode,
    setFocusMode,
  };
}
