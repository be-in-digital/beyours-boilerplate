/**
 * i18n (Internationalization) integration
 *
 * Re-exports i18n utilities from @be-in-digital/core
 * for multilingual support in the restaurant-theme app.
 *
 * @example
 * ```ts
 * import { detectLocale, setLocale, createTranslator } from '@/lib/i18n'
 *
 * const locale = detectLocale({ supportedLocales: ['en', 'fr', 'es'] })
 * const t = createTranslator(locale, translations)
 * ```
 */

// Types
export type {
  Locale,
  TranslationKey,
  TranslationValue,
  TranslationMap,
  Direction,
  LanguageConfig,
  I18nConfig,
  TranslationContext,
  TranslationParams,
  TranslatorFunction,
  LocaleDetectionOptions,
  TranslatedItem,
  UseTranslationReturn,
  UseLocaleReturn,
  LanguageSwitcherProps,
} from '@be-in-digital/core'

// Configuration
export {
  RTL_LANGUAGES,
  DEFAULT_I18N_CONFIG,
  COMMON_LANGUAGES,
  isRtlLocale,
  getLocaleDirection,
  findLanguageConfig,
} from '@be-in-digital/core'

// Locale Detection
export {
  detectLocaleFromCookie,
  detectLocaleFromLocalStorage,
  detectLocaleFromBrowser,
  detectLocaleFromHeader,
  detectLocale,
} from '@be-in-digital/core'

// Locale Storage
export {
  setLocaleCookie,
  setLocaleLocalStorage,
  setLocale,
  clearLocale,
  getLocaleFromCookie,
  getLocaleFromLocalStorage,
} from '@be-in-digital/core'

// Translation Utilities
export {
  createTranslator,
  createTranslators,
  validateTranslationMap,
  mergeTranslations,
  getMissingKeys,
} from '@be-in-digital/core'

// GPT Translation (for admin auto-translation feature)
export {
  estimateTranslationCost,
  translateText,
  batchTranslate,
  calculateTotalCost,
  groupTranslationResults,
} from '@be-in-digital/core'

// Hook types (implementation in app)
export type {
  UseTranslation,
  UseLocale,
  UseTranslator,
  UseDirection,
  LanguageSwitcherComponent,
  I18nProviderProps,
  I18nProviderComponent,
} from '@be-in-digital/core'
