/**
 * Translations for the one-time "We set up your Life System" banner that
 * shows after a backfill, plus a formatter that turns server-emitted
 * structured tags into a localized string.
 *
 * This module is the single source of truth for every user-visible string the
 * backfill banner introduces — both the chrome (title / body / dismiss label)
 * and the bullet list of carried items. Adding a new language means adding
 * one entry to each map below; adding a new carried tag means extending
 * `LifeSystemBackfillCarriedItem` in `@shared/lifeSystemBackfill` and adding
 * a case to `formatCarriedItem`.
 */

import { pickTranslation, type TranslationMap } from "@/lib/i18n";
import type {
  LifeSystemBackfillCarriedItem,
  LifeSystemDailyRhythmPart,
} from "@shared/lifeSystemBackfill";

export interface BackfillBannerStrings {
  title: string;
  body: string;
  dismiss: string;
}

export const BACKFILL_BANNER_STRINGS: TranslationMap<BackfillBannerStrings> = {
  en: {
    title: "We set up your Life System",
    body:
      "We carried over what you'd already shared into your new three-level system — review and edit anything to make it yours.",
    dismiss: "Dismiss",
  },
  es: {
    title: "Configuramos tu Sistema de Vida",
    body:
      "Trasladamos lo que ya habías compartido a tu nuevo sistema de tres niveles: revisa y edita lo que quieras para hacerlo tuyo.",
    dismiss: "Descartar",
  },
  fr: {
    title: "Nous avons configuré votre Système de Vie",
    body:
      "Nous avons repris ce que vous aviez déjà partagé dans votre nouveau système à trois niveaux — passez‑le en revue et modifiez ce que vous voulez pour qu'il vous ressemble.",
    dismiss: "Ignorer",
  },
  de: {
    title: "Wir haben dein Lebenssystem eingerichtet",
    body:
      "Wir haben deine bisherigen Angaben in dein neues dreistufiges System übernommen – sieh es dir an und passe alles an, damit es zu dir passt.",
    dismiss: "Schließen",
  },
  pt: {
    title: "Configuramos o seu Sistema de Vida",
    body:
      "Levamos o que você já tinha compartilhado para o seu novo sistema de três níveis — revise e edite o que quiser para deixá-lo do seu jeito.",
    dismiss: "Dispensar",
  },
  it: {
    title: "Abbiamo configurato il tuo Sistema di Vita",
    body:
      "Abbiamo riportato ciò che avevi già condiviso nel tuo nuovo sistema a tre livelli — rivedi e modifica ciò che vuoi per renderlo tuo.",
    dismiss: "Chiudi",
  },
  ja: {
    title: "Life Systemをセットアップしました",
    body:
      "これまでに共有してくださった内容を、新しい3層構造のシステムに引き継ぎました。内容を見直して、自由に編集してください。",
    dismiss: "閉じる",
  },
  "zh-cn": {
    title: "已为你设置好生活系统",
    body: "我们已将你之前分享的内容迁移到新的三层系统中——查看并随意编辑，让它真正属于你。",
    dismiss: "关闭",
  },
};

interface DailyRhythmPartStrings {
  wake: string;
  sleep: string;
  peakTime: string;
  /** The pillar name "Daily Rhythm" in this language. */
  pillar: string;
  /** Joiner used between parts (e.g. "wake + sleep"). */
  joiner: string;
}

const DAILY_RHYTHM_PART_STRINGS: TranslationMap<DailyRhythmPartStrings> = {
  en: { wake: "wake", sleep: "sleep", peakTime: "peak time", pillar: "Daily Rhythm", joiner: " + " },
  es: { wake: "despertar", sleep: "dormir", peakTime: "hora pico", pillar: "Ritmo Diario", joiner: " + " },
  fr: { wake: "réveil", sleep: "sommeil", peakTime: "moment de pic", pillar: "Rythme Quotidien", joiner: " + " },
  de: { wake: "Aufwachen", sleep: "Schlafen", peakTime: "Hochphase", pillar: "Tagesrhythmus", joiner: " + " },
  pt: { wake: "acordar", sleep: "dormir", peakTime: "horário de pico", pillar: "Ritmo Diário", joiner: " + " },
  it: { wake: "sveglia", sleep: "sonno", peakTime: "ora di picco", pillar: "Ritmo Quotidiano", joiner: " + " },
  ja: { wake: "起床", sleep: "就寝", peakTime: "ピーク時間", pillar: "デイリーリズム", joiner: "・" },
  "zh-cn": { wake: "起床", sleep: "睡眠", peakTime: "高峰时间", pillar: "每日节奏", joiner: "、" },
};

interface CarriedItemStrings {
  goalsToProjectsOne: string;
  goalsToProjectsMany: (count: number) => string;
  starterTemplateProjects: string;
  /** Renders e.g. "wake + sleep → Daily Rhythm". */
  dailyRhythm: (parts: string, pillar: string) => string;
  responsibility: string;
  purpose: string;
  physicalHealth: string;
  foundation: string;
}

const CARRIED_ITEM_STRINGS: TranslationMap<CarriedItemStrings> = {
  en: {
    goalsToProjectsOne: "1 goal → Creation projects",
    goalsToProjectsMany: (n) => `${n} goals → Creation projects`,
    starterTemplateProjects: "Starter Template projects to get you started",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Responsibilities → Responsibility pillar",
    purpose: "Priorities & long-term goals → Purpose pillar",
    physicalHealth: "Wellness focus → Physical Health pillar",
    foundation: "Active habits → Foundation non-negotiables",
  },
  es: {
    goalsToProjectsOne: "1 meta → proyectos de Creación",
    goalsToProjectsMany: (n) => `${n} metas → proyectos de Creación`,
    starterTemplateProjects: "Proyectos de la plantilla inicial para comenzar",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Responsabilidades → pilar de Responsabilidad",
    purpose: "Prioridades y metas a largo plazo → pilar de Propósito",
    physicalHealth: "Enfoque de bienestar → pilar de Salud Física",
    foundation: "Hábitos activos → no negociables de la Base",
  },
  fr: {
    goalsToProjectsOne: "1 objectif → projets de Création",
    goalsToProjectsMany: (n) => `${n} objectifs → projets de Création`,
    starterTemplateProjects: "Projets du modèle de départ pour bien commencer",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Responsabilités → pilier Responsabilité",
    purpose: "Priorités et objectifs à long terme → pilier Sens",
    physicalHealth: "Axe bien-être → pilier Santé Physique",
    foundation: "Habitudes actives → non‑négociables de la Fondation",
  },
  de: {
    goalsToProjectsOne: "1 Ziel → Schöpfungs-Projekte",
    goalsToProjectsMany: (n) => `${n} Ziele → Schöpfungs-Projekte`,
    starterTemplateProjects: "Starter-Vorlagenprojekte für den Anfang",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Verantwortlichkeiten → Säule Verantwortung",
    purpose: "Prioritäten & Langfristziele → Säule Sinn",
    physicalHealth: "Wellness-Fokus → Säule Körperliche Gesundheit",
    foundation: "Aktive Gewohnheiten → Fundament-Nicht-Verhandelbares",
  },
  pt: {
    goalsToProjectsOne: "1 meta → projetos de Criação",
    goalsToProjectsMany: (n) => `${n} metas → projetos de Criação`,
    starterTemplateProjects: "Projetos do modelo inicial para você começar",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Responsabilidades → pilar de Responsabilidade",
    purpose: "Prioridades e metas de longo prazo → pilar de Propósito",
    physicalHealth: "Foco de bem-estar → pilar de Saúde Física",
    foundation: "Hábitos ativos → inegociáveis do Alicerce",
  },
  it: {
    goalsToProjectsOne: "1 obiettivo → progetti di Creazione",
    goalsToProjectsMany: (n) => `${n} obiettivi → progetti di Creazione`,
    starterTemplateProjects: "Progetti del modello iniziale per partire",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "Responsabilità → pilastro Responsabilità",
    purpose: "Priorità e obiettivi a lungo termine → pilastro Scopo",
    physicalHealth: "Focus benessere → pilastro Salute Fisica",
    foundation: "Abitudini attive → non negoziabili delle Fondamenta",
  },
  ja: {
    goalsToProjectsOne: "1件の目標 → Creationプロジェクトへ",
    goalsToProjectsMany: (n) => `${n}件の目標 → Creationプロジェクトへ`,
    starterTemplateProjects: "始めるためのスターターテンプレートのプロジェクト",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "責任 → Responsibility柱",
    purpose: "優先事項と長期目標 → Purpose柱",
    physicalHealth: "ウェルネスの焦点 → Physical Health柱",
    foundation: "アクティブな習慣 → Foundationの絶対条件",
  },
  "zh-cn": {
    goalsToProjectsOne: "1 个目标 → 创造类项目",
    goalsToProjectsMany: (n) => `${n} 个目标 → 创造类项目`,
    starterTemplateProjects: "入门模板项目，助你起步",
    dailyRhythm: (parts, pillar) => `${parts} → ${pillar}`,
    responsibility: "责任 → 责任支柱",
    purpose: "优先事项与长期目标 → 目标支柱",
    physicalHealth: "健康重点 → 身体健康支柱",
    foundation: "活跃习惯 → 基础不可妥协项",
  },
};

/** Pick the banner chrome strings (title / body / dismiss) for a language. */
export function getBackfillBannerStrings(lang: string): BackfillBannerStrings {
  return pickTranslation(BACKFILL_BANNER_STRINGS, lang);
}

/** Translate a single carried-over tag into a display string. */
export function formatCarriedItem(
  item: LifeSystemBackfillCarriedItem,
  lang: string,
): string {
  const carried = pickTranslation(CARRIED_ITEM_STRINGS, lang);
  switch (item.kind) {
    case "goalsToProjects":
      return item.count === 1
        ? carried.goalsToProjectsOne
        : carried.goalsToProjectsMany(item.count);
    case "starterTemplateProjects":
      return carried.starterTemplateProjects;
    case "dailyRhythm": {
      const parts = pickTranslation(DAILY_RHYTHM_PART_STRINGS, lang);
      const order: LifeSystemDailyRhythmPart[] = ["wake", "sleep", "peakTime"];
      const seen = new Set(item.parts);
      const labels = order.filter((p) => seen.has(p)).map((p) => parts[p]);
      return carried.dailyRhythm(labels.join(parts.joiner), parts.pillar);
    }
    case "responsibility":
      return carried.responsibility;
    case "purpose":
      return carried.purpose;
    case "physicalHealth":
      return carried.physicalHealth;
    case "foundation":
      return carried.foundation;
  }
}

/**
 * Backwards-compat shim. Earlier builds of the server returned plain English
 * strings, so any value persisted to localStorage from those builds is still
 * a `string`. The banner accepts either shape and renders it through this
 * helper, so we don't lose people's note across the upgrade.
 */
export function formatCarriedEntry(
  entry: LifeSystemBackfillCarriedItem | string,
  lang: string,
): string {
  if (typeof entry === "string") return entry;
  return formatCarriedItem(entry, lang);
}
