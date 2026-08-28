import {ApiError} from '../api/client';
import {t, type MessageKey} from './index';

// Only codes with a customer-facing meaning are mapped. Anything else falls
// back to a generic message rather than showing the API's English text inside
// an otherwise Arabic page.
const messages: Record<string, MessageKey> = {
  UNAVAILABLE: 'error.unavailable',
  STALE_QUOTE: 'error.staleQuote',
  VALIDATION_ERROR: 'error.validation',
  CONFLICT: 'error.conflict',
  NOT_FOUND: 'error.notFound',
  UNAUTHENTICATED: 'error.unauthenticated',
  INVALID_CREDENTIALS: 'error.invalidCredentials',
  INVALID_TOTP: 'error.invalidTotp',
  ORDER_STATE_ERROR: 'error.orderState'
};

/** Turns any thrown value into a message safe to show the customer. */
export function errorMessage(reason: unknown, fallback: MessageKey): string {
  if (reason instanceof ApiError) {
    const key = messages[reason.code];
    if (key) return t(key);
    return t('error.generic');
  }
  // A failed fetch throws TypeError rather than an ApiError.
  if (reason instanceof TypeError) return t('error.network');
  return t(fallback);
}
