import { CHINA_DENYLIST } from './denylist';
import { getPlaceholder } from './placeholder';

export function redactText(text: string): string {
  if (!text) return '';

  let redacted = text;
  CHINA_DENYLIST.forEach(pattern => {
    redacted = redacted.replace(pattern, '');
  });

  // Collapse multiple spaces and trim
  redacted = redacted.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing punctuation that might be left
  redacted = redacted.replace(/^[,.\-\s]+|[,.\-\s]+$/g, '');

  return redacted;
}

export function shouldUsePlaceholder(redactedText: string): boolean {
  return redactedText.length === 0 || redactedText.match(/^[,.\-\s]+$/) !== null;
}

export function applyRedaction(text: string): string {
  const redacted = redactText(text);
  return shouldUsePlaceholder(redacted) ? getPlaceholder() : redacted;
}
