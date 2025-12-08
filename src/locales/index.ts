import { environment, getPreferenceValues } from "@raycast/api";
import { en, Translations } from "./en";
import { cs } from "./cs";

const translations: Record<string, Translations> = {
  en,
  cs,
};

/**
 * Determine the active locale code to use for translations.
 *
 * Prefers the user's Raycast language preference when set and supported, otherwise derives the language from the Raycast environment locale, and defaults to `en` if no supported locale is found.
 *
 * @returns The locale code to use for translations (e.g., `en`, `cs`). `en` if no supported locale is found.
 */
function getLocale(): string {
  // Try to get language from Raycast preferences first
  const prefs = getPreferenceValues();
  if (typeof prefs.language === "string" && translations[prefs.language]) {
    return prefs.language;
  }

  // Fallback to Raycast environment locale
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raycastLocale = (environment as any).locale as string | undefined;
  if (!raycastLocale) {
    return "en";
  }
  const languageCode = raycastLocale.split(/[-_]/)[0].toLowerCase();
  return translations[languageCode] ? languageCode : "en";
}

let currentLocale = getLocale();
let currentTranslations = translations[currentLocale];

/**
 * Get the translations for the currently active locale.
 *
 * @returns The `Translations` object for the active locale.
 */
export function t(): Translations {
  return currentTranslations;
}

/**
 * Switches the active locale and its translations when the given locale is supported.
 *
 * @param locale - Locale code (e.g., "en", "cs"); if this locale is present in the translations map the active locale and translations are updated, otherwise no change occurs.
 */
export function setLocale(locale: string): void {
  if (translations[locale]) {
    currentLocale = locale;
    currentTranslations = translations[locale];
  }
}

/**
 * Get the currently active locale code.
 *
 * @returns The active locale code (for example `en` or `cs`).
 */
export function getCurrentLocale(): string {
  return currentLocale;
}

export type { Translations };
