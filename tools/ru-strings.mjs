// Lists every Russian string literal in src/ (the translation keys). Used by the test that checks translations.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
// demo.js holds sample data, i18n files hold the translations themselves,
// legal.js and help.js keep whole texts per language
const SKIP = new Set(["demo.js", "i18n.js", "i18n-en.js", "i18n-el.js", "legal.js", "help.js"]);

export function ruStrings() {
  const keys = new Set();
  for (const f of readdirSync(SRC).filter(f => f.endsWith(".js") && !SKIP.has(f))) {
    const src = readFileSync(SRC + f, "utf8");
    // t("...") calls (also inside HTML attributes) and plain literals such as labels in tables and toast messages
    for (const re of [/\bt\("((?:[^"\\\n]|\\.)*)"/g, /"((?:[^"\\\n]|\\.)*)"/g])
      for (const m of src.matchAll(re)) if (/[А-Яа-яЁё]/.test(m[1])) keys.add(m[1]);
  }
  keys.add("звезда|звезды|звёзд");
  return [...keys].sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(ruStrings().join("\n"));
