/**
 * Translations for the Settings → Language picker section.
 *
 * Lives next to the picker component because the picker is the second
 * surface (after the Life System backfill banner) to read its strings
 * through `pickTranslation`. Adding more languages means adding one
 * entry to each map below; adding a new picker option means adding it
 * to `SUPPORTED_LANGUAGES`.
 */

import { type TranslationMap } from "@/lib/i18n";

export interface LanguageSection {
  /** Card title — e.g. "Language" / "Idioma". */
  title: string;
  /** Card description shown under the title. */
  description: string;
  /** Label above the select. */
  selectLabel: string;
  /** Save-button label. */
  save: string;
  /** Save-button label while the mutation is pending. */
  saving: string;
  /** "Use my browser language" reset option label. */
  useBrowser: string;
  /** Toast title shown after a successful save. */
  savedToast: string;
}

export const LANGUAGE_SECTION_STRINGS: TranslationMap<LanguageSection> = {
  en: {
    title: "Language",
    description: "Choose the language DW uses for translatable surfaces.",
    selectLabel: "Preferred language",
    save: "Save language",
    saving: "Saving…",
    useBrowser: "Use my browser language",
    savedToast: "Language saved",
  },
  es: {
    title: "Idioma",
    description: "Elige el idioma que DW usa en las pantallas traducibles.",
    selectLabel: "Idioma preferido",
    save: "Guardar idioma",
    saving: "Guardando…",
    useBrowser: "Usar el idioma de mi navegador",
    savedToast: "Idioma guardado",
  },
  fr: {
    title: "Langue",
    description: "Choisissez la langue que DW utilise sur les écrans traduisibles.",
    selectLabel: "Langue préférée",
    save: "Enregistrer la langue",
    saving: "Enregistrement…",
    useBrowser: "Utiliser la langue de mon navigateur",
    savedToast: "Langue enregistrée",
  },
  de: {
    title: "Sprache",
    description: "Wähle die Sprache, in der DW übersetzbare Bereiche anzeigt.",
    selectLabel: "Bevorzugte Sprache",
    save: "Sprache speichern",
    saving: "Wird gespeichert…",
    useBrowser: "Browsersprache verwenden",
    savedToast: "Sprache gespeichert",
  },
  pt: {
    title: "Idioma",
    description: "Escolha o idioma que DW usa nas telas traduzíveis.",
    selectLabel: "Idioma preferido",
    save: "Salvar idioma",
    saving: "Salvando…",
    useBrowser: "Usar o idioma do meu navegador",
    savedToast: "Idioma salvo",
  },
  it: {
    title: "Lingua",
    description: "Scegli la lingua che DW usa nelle schermate traducibili.",
    selectLabel: "Lingua preferita",
    save: "Salva lingua",
    saving: "Salvataggio…",
    useBrowser: "Usa la lingua del browser",
    savedToast: "Lingua salvata",
  },
  ja: {
    title: "言語",
    description: "DW が翻訳済み画面で使用する言語を選びます。",
    selectLabel: "優先言語",
    save: "言語を保存",
    saving: "保存中…",
    useBrowser: "ブラウザの言語を使う",
    savedToast: "言語を保存しました",
  },
  "zh-cn": {
    title: "语言",
    description: "选择 DW 在可翻译界面使用的语言。",
    selectLabel: "首选语言",
    save: "保存语言",
    saving: "正在保存…",
    useBrowser: "使用浏览器语言",
    savedToast: "已保存语言",
  },
};

/**
 * The languages a user can pick from in Settings. The native label is
 * what we show inside the dropdown for each option (always rendered in
 * its own language, not the current UI language, so users can find their
 * own language even if the app is currently in one they don't read).
 */
export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: string; nativeLabel: string }> = [
  { code: "en", nativeLabel: "English" },
  { code: "es", nativeLabel: "Español" },
  { code: "fr", nativeLabel: "Français" },
  { code: "de", nativeLabel: "Deutsch" },
  { code: "pt", nativeLabel: "Português" },
  { code: "it", nativeLabel: "Italiano" },
  { code: "ja", nativeLabel: "日本語" },
  { code: "zh-cn", nativeLabel: "简体中文" },
];

/** True if `code` is one of the languages we ship translations for. */
export function isSupportedLanguage(code: string | null | undefined): boolean {
  if (!code) return false;
  const lower = code.toLowerCase();
  return SUPPORTED_LANGUAGES.some((l) => l.code === lower);
}
