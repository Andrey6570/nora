// Builds public pages of the privacy policy and terms from src/legal.js into hosting/ for Firebase Hosting:
// /legal/privacy-ru.html, /legal/terms-en.html and so on, plus /legal/ with links to all of them.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LEGAL } from "../src/legal.js";

const OUT = fileURLToPath(new URL("../hosting/legal/", import.meta.url));
const LANG_NAMES = { ru: "Русский", en: "English", el: "Ελληνικά" };
const css = `body{margin:0;background:#FBF7F2;color:#2B211B;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 48px}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:24px 0 6px}
.muted{color:#7A6A5E}a{color:#C8643B}ul{padding-left:20px}nav{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;font-size:14px}
mark{background:#FFE58A;padding:0 2px;border-radius:3px}
@media (prefers-color-scheme:dark){body{background:#1B1714;color:#F3EAE2}.muted{color:#B0A194}a{color:#E58A5F}mark{color:#2B211B}}`;

const page = (lang, title, body) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Nora</title><style>${css}</style></head><body><main>${body}</main></body></html>
`;

mkdirSync(OUT, { recursive: true });
const links = [];
for (const kind of Object.keys(LEGAL)) {
  for (const [lang, d] of Object.entries(LEGAL[kind])) {
    const nav = Object.keys(LEGAL[kind]).map(l => l === lang ? `<b>${LANG_NAMES[l]}</b>` : `<a href="${kind}-${l}.html">${LANG_NAMES[l]}</a>`).join(" ");
    const body = `<nav>${nav}</nav><h1>${d.title}</h1><p class="muted">${d.updated}</p>` +
      d.sections.map(([h, html]) => `<h2>${h}</h2><div>${html}</div>`).join("");
    writeFileSync(OUT + `${kind}-${lang}.html`, page(lang, d.title, body));
    links.push(`<li><a href="${kind}-${lang}.html">${d.title}</a> (${LANG_NAMES[lang]})</li>`);
  }
}
writeFileSync(OUT + "index.html", page("en", "Nora", `<h1>Nora</h1><ul>${links.join("")}</ul>`));
console.log("legal pages written to hosting/legal/");
