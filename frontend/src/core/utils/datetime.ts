import { formatDistanceToNow } from "date-fns";
import { enUS as dateFnsEnUS } from "date-fns/locale";

import { detectLocale, type Locale } from "@/core/i18n";
import { getLocaleFromCookie } from "@/core/i18n/cookies";

function getDateFnsLocale(_locale: Locale) {
  return dateFnsEnUS;
}

export function formatTimeAgo(date: Date | string | number, locale?: Locale) {
  const effectiveLocale =
    locale ??
    (getLocaleFromCookie() as Locale | null) ??
    // Fallback when cookie is missing (or on first render)
    detectLocale();
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: getDateFnsLocale(effectiveLocale),
  });
}
