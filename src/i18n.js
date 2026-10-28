// Russian is the source language and the lookup key. English and Greek live in their own tables;
// a missing Greek string falls back to English, a missing English string to Russian.
import { EN } from "./i18n-en.js";
import { EL } from "./i18n-el.js";

export const LANGS = [["ru", "Русский"], ["en", "English"], ["el", "Ελληνικά"]];
const KEY = "nora-lang";
const TABLES = { en: EN, el: EL };

function detect() {
  try { const s = localStorage.getItem(KEY); if (s && (s === "ru" || TABLES[s])) return s; } catch (e) {}
  const n = (typeof navigator !== "undefined" && navigator.language || "").slice(0, 2);
  return n === "ru" || n === "el" ? n : n === "uk" || n === "be" || n === "kk" ? "ru" : "en";
}
let lang = detect();

export const getLang = () => lang;
export function setLang(l) {
  lang = l === "ru" || TABLES[l] ? l : "en";
  try { localStorage.setItem(KEY, lang); } catch (e) {}
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

function raw(key) {
  if (lang === "ru") return key;
  return (TABLES[lang] && TABLES[lang][key]) || (lang === "el" && EN[key]) || key;
}

// t("Привет, {name}", { name }) — replaces {placeholders}.
export function t(key, vars) {
  const s = raw(key);
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
}

// Plural word for n: the key holds the Russian forms "one|few|many"; English and Greek hold "one|other".
const RU_INDEX = { one: 0, few: 1, many: 2, other: 2 };
export function plural(n, key) {
  const forms = raw(key).split("|");
  const cat = new Intl.PluralRules(lang).select(n);
  const i = lang === "ru" ? RU_INDEX[cat] : cat === "one" ? 0 : 1;
  return forms[Math.min(i, forms.length - 1)];
}

export const stars = n => n + " " + plural(n, "звезда|звезды|звёзд");
