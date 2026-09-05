import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from '@/lib/shared/clipboard';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Clipboard Cascading Fallback Utility (shared/clipboard.ts)', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
  });

  it('successfully copies text using modern Async Clipboard API', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('بسم الله الرحمن الرحيم', 'تم النسخ بنجاح');

    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('بسم الله الرحمن الرحيم');
    expect(toast.success).toHaveBeenCalledWith('تم النسخ بنجاح');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('copies successfully without showing success toast when no message is provided', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('نص تجريبي');

    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('نص تجريبي');
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('cascades to execCommand fallback when navigator.clipboard.writeText throws', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('نص الفتوى الفقهية', 'تم النسخ');

    expect(writeTextMock).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(result).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('تم النسخ');
  });

  it('uses fallback when navigator.clipboard is unavailable (HTTP / older context)', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const result = await copyToClipboard('حديث شريف', 'تم النسخ');

    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(result).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('تم النسخ');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('handles complete failure gracefully and triggers toast.error', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Not allowed'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    // Fallback execCommand also fails
    document.execCommand = vi.fn().mockReturnValue(false);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await copyToClipboard('فشل النسخ');

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('تعذر نسخ النص إلى الحافظة');
    expect(toast.success).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles exceptions in execCommand fallback gracefully', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand restricted');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await copyToClipboard('نص استثنائي');

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('تعذر نسخ النص إلى الحافظة');

    consoleSpy.mockRestore();
  });

  it('guarantees textarea element is cleaned up from document.body even when execCommand throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('SecurityError: The user agent disallowed clipboard write');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await copyToClipboard('اختبار تسريب الذاكرة');

    // Confirm no textarea elements are left leaked in document.body
    const leftoverTextareas = document.body.querySelectorAll('textarea');
    expect(leftoverTextareas.length).toBe(0);

    consoleSpy.mockRestore();
  });

  it('returns false immediately without throwing or calling toast when window is undefined (SSR)', async () => {
    const originalWindow = global.window;
    try {
      // @ts-expect-error simulating SSR
      delete global.window;
      const result = await copyToClipboard('نص SSR');
      expect(result).toBe(false);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    } finally {
      global.window = originalWindow;
    }
  });
});
