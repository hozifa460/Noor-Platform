import { toast } from 'sonner';

/**
 * Fallback copy mechanism using a hidden textarea and document.execCommand('copy').
 * Configured safely for mobile devices (no viewport jumps, no virtual keyboard popup).
 */
function fallbackCopyToClipboard(text: string): boolean {
  let textarea: HTMLTextAreaElement | null = null;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text ?? '';
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    return document.execCommand('copy');
  } catch (err) {
    console.error('Fallback execCommand copy failed:', err);
    return false;
  } finally {
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}

/**
 * Copies text to the system clipboard with graceful fallback and user feedback.
 *
 * Cascades from the modern Async Clipboard API (`navigator.clipboard.writeText`)
 * to `document.execCommand('copy')` if permissions or focus are lacking, or when
 * running in insecure contexts (HTTP) or iframe embeds.
 *
 * @param text The text string to copy to the clipboard.
 * @param successMessage Optional toast success message displayed upon successful copy.
 * @returns Promise<boolean> indicating whether copying succeeded.
 */
export async function copyToClipboard(text: string, successMessage?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  let copied = false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Async Clipboard API threw (e.g. document not focused, iframe permission policy); attempt fallback
      copied = fallbackCopyToClipboard(text);
    }
  } else {
    // Non-secure contexts or legacy browser environments
    copied = fallbackCopyToClipboard(text);
  }

  if (copied) {
    if (successMessage) {
      toast.success(successMessage);
    }
    return true;
  } else {
    console.error('Failed to copy to clipboard: all strategies failed');
    toast.error('تعذر نسخ النص إلى الحافظة');
    return false;
  }
}
