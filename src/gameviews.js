// Games for two: the list and the screen of every game. HTML strings like views.js; the buttons carry data-act.
import { t, getLang } from "./i18n.js";
import { esc } from "./util.js";
import { GAMES, gameName, isUnlocked } from "../functions/games.js";
import { WHEEL, DECKS, GUESS, WISHES, COUPONS, SCRIPTS, DAYS30, pick } from "../functions/gamedata.js";
import { dayKey } from "../functions/economy.js";

const star = n => `<span class="star">★</span>${n}`;
const name = (pair, u) => (pair.names && pair.names[u]) || t("Партнёр");
const other = (pair, me) => (pair.members || []).find(u => u !== me);
const lang = () => getLang();

// What each game is, in one line (Russian is the translation key).
const INFO = {
  guess: "Оба отвечают о себе и угадывают ответ партнёра. Ответы видны, когда ответили оба.",
  wheel: "Крутите колесо и получайте идею для свидания.",
  questions36: "36 вопросов от лёгких к самым личным: сближают за один вечер.",
  truth: "Мягкая романтическая версия: вопросы и задания.",
  wishes: "Каждый тайно отмечает «да / может быть / нет». Видны только совпадения, отказ не показывается никому.",
  flirt: "Игривые вопросы для вечера вдвоём.",
  coupons: "Дарите друг другу купоны: массаж, завтрак, вечер на выбор.",
  homeDate: "Сценарии вечера дома: по шагам, без суеты.",
  intimacy30: "Тридцать дней: одно маленькое дело в день, чтобы стать ближе.",
  dreams: "Вопросы о планах и мечтах на двоих.",
  memories: "Вопросы, которые возвращают в самые тёплые моменты."
};
const NEEDS_PARTNER = new Set(["guess", "wishes", "coupons", "intimacy30"]);

export function gameTitle(id) { return gameName(id, lang()); }

// ---------- the list ----------
export function gamesTab(S) {
  const p = S.pair, me = S.user.uid, partner = other(p, me), pot = p.pot || 0;
  const props = (S.orders || []).filter(o => o.kind === "game" && o.status === "proposed");
  const card = id => {
    const g = GAMES[id], open = isUnlocked(p, id), prop = props.find(o => o.ref === id);
    let action;
    if (NEEDS_PARTNER.has(id) && !partner) action = `<span class="muted small">${t("Нужен партнёр")}</span>`;
    else if (open) action = `<button class="btn primary" data-act="game-open" data-id="${id}">${t("Играть")}</button>`;
    else if (prop && prop.uid === me) action = `<span class="muted small">${t("Ждёт согласия: {name}", { name: esc(name(p, partner)) })}</span><button class="btn ghost" data-act="cancel-order" data-id="${esc(prop.id)}">${t("Отозвать")}</button>`;
    else if (prop) action = `<span class="muted small">${t("{name} предлагает открыть", { name: esc(name(p, prop.uid)) })}</span>
      <button class="btn primary" data-act="approve-order" data-id="${esc(prop.id)}" ${pot >= prop.cost ? "" : "disabled"}>${t("Согласен")}</button>
      <button class="btn ghost" data-act="cancel-order" data-id="${esc(prop.id)}">${t("Отклонить")}</button>`;
    else action = `<button class="btn" data-act="buy-game" data-id="${id}" ${pot >= g.cost && partner ? "" : "disabled"}>${t("Открыть")} ${star(g.cost)}</button>`;
    return `<article class="gcard ${open ? "" : "locked"}"><div class="gicon">${g.icon}</div>
      <div class="gbody"><h3>${esc(gameTitle(id))}</h3><p class="muted small">${t(INFO[id])}</p><div class="gact">${action}</div></div></article>`;
  };
  const ids = Object.keys(GAMES).filter(id => GAMES[id].ready);
  const free = ids.filter(id => GAMES[id].cost === 0), paid = ids.filter(id => GAMES[id].cost > 0);
  return `<section class="card"><h2>${t("Игры для двоих")}</h2>
      <p class="muted">${t("Для пар от 18 лет: флирт и романтика, ничего откровенного. Платные игры открываются звёздами копилки, когда партнёр согласен.")}</p>
      <p class="muted small">${t("В копилке")}: ${star(pot)}</p></section>
    <h2 class="sec">${t("Бесплатные")}</h2>${free.map(card).join("")}
    <h2 class="sec">${t("За звёзды копилки")}</h2>${paid.map(card).join("")}`;
}

// ---------- a game ----------
export function initialGame(id) {
  if (id === "wheel") return { id, cur: null, spinning: false };
  if (DECKS[id]) return { id, idx: Number(deckPos(id)) || 0, order: id === "questions36" ? DECKS[id].map((_, i) => i) : shuffle(DECKS[id].length) };
  if (id === "guess") return { id, open: null, step: 0, v: null };
  if (id === "coupons") return { id, adding: false, text: "" };
  if (id === "homeDate") return { id, script: null, done: new Set() };
  return { id };
}
export function shuffle(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const deckKey = id => "nora-deck-" + id;
function deckPos(id) { try { return localStorage.getItem(deckKey(id)); } catch (e) { return 0; } }

export function gameScreen(S, ui) {
  const g = ui.game, id = g.id;
  const bodies = { wheel, guess, wishes, coupons, homeDate, intimacy30 };
  const body = DECKS[id] ? deck(S, g) : bodies[id](S, g);
  return `<header class="top game-top"><button class="icon" data-act="game-back" aria-label="${t("Назад")}">‹</button><b>${GAMES[id].icon} ${esc(gameTitle(id))}</b></header>
    <main class="page">${body}${ui.err ? `<p class="err" role="alert">${esc(ui.err)}</p>` : ""}</main>`;
}

function wheel(S, g) {
  const cur = g.cur;
  return `<section class="card wheel-box"><div class="wheel-face ${g.spinning ? "spin" : ""}" aria-live="polite">${cur == null ? "🎡" : esc(pick(WHEEL[cur], lang()))}</div>
    <button class="btn primary big" data-act="wheel-spin" ${g.spinning ? "disabled" : ""}>${cur == null ? t("Крутить") : t("Крутить ещё")}</button>
    <p class="muted small">${t("Идея не нравится? Крутите ещё. Выполнили вместе — отметьте дело в «Делах» как «Вдвоём».")}</p></section>`;
}

function deck(S, g) {
  const list = DECKS[g.id], n = list.length, i = g.idx;
  if (i >= n) return `<section class="card center-card"><h2>${t("Колода закончилась")}</h2><button class="btn primary" data-act="deck-restart">${t("Начать сначала")}</button></section>`;
  const card = list[g.order[i]];
  const part = g.id === "questions36" ? `<span class="chip">${t("Часть {n} из 3", { n: Math.floor(i / 12) + 1 })}</span>` : "";
  return `<section class="card deck-card">${part}<p class="deck-q">${esc(pick(card, lang()))}</p>
      <p class="muted small">${t("Читайте вслух и отвечайте по очереди.")} ${i + 1} / ${n}</p></section>
    <div class="row"><button class="btn" data-act="deck-prev" ${i ? "" : "disabled"}>${t("Назад")}</button>
    <button class="btn primary" data-act="deck-next">${i + 1 < n ? t("Дальше") : t("Закончить")}</button></div>`;
}

// ---- guess the answer ----
const dayOfYear = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5); };
export function guessStatus(S, item) {
  const me = S.user.uid;
  if (S.results.has("guess_" + item)) return "done";
  return S.answers.has(`guess_${item}_${me}`) ? "waiting" : "new";
}
export function guessScore(S) {
  const me = S.user.uid, partner = other(S.pair, me); let mine = 0, theirs = 0, n = 0;
  for (const r of S.results.values()) {
    if (r.game !== "guess" || !r.answers || !r.answers[me] || !r.answers[partner]) continue;
    n++; if (r.answers[me].g === r.answers[partner].v) mine++; if (r.answers[partner].g === r.answers[me].v) theirs++;
  }
  return { mine, theirs, n };
}
function guess(S, g) {
  const p = S.pair, me = S.user.uid, partner = other(p, me), q = (i) => pick(GUESS[i].q, lang()), opt = (i, k) => pick(GUESS[i].o[k], lang());
  if (g.open != null) {
    const i = g.open, st = guessStatus(S, i), back = `<button class="btn ghost" data-act="guess-close">${t("К списку вопросов")}</button>`;
    if (st === "done") {
      const r = S.results.get("guess_" + i), line = u => {
        const a = r.answers[u], o = r.answers[u === me ? partner : me], hit = a.g === o.v;
        return `<li><b>${esc(u === me ? t("Вы") : name(p, u))}</b><span>${t("выбор")}: ${esc(opt(i, a.v))}<br>${t("догадка")}: ${esc(opt(i, a.g))} ${hit ? "✅" : "❌"}</span></li>`;
      };
      return `<section class="card"><h2>${esc(q(i))}</h2><ul class="feed">${line(me)}${line(partner)}</ul></section>${back}`;
    }
    if (st === "waiting") return `<section class="card"><h2>${esc(q(i))}</h2><p class="muted">${t("Ответ принят. Когда ответит {name}, здесь появятся оба ответа.", { name: esc(name(p, partner)) })}</p></section>${back}`;
    const step = g.step, asking = step === 0 ? t("Что выберу я?") : t("Как думаете, что выберет {name}?", { name: esc(name(p, partner)) });
    return `<section class="card"><h2>${esc(q(i))}</h2><p class="muted">${asking}</p>
      <div class="opts">${GUESS[i].o.map((_, k) => `<button class="opt" data-act="guess-pick" data-k="${k}">${esc(opt(i, k))}</button>`).join("")}</div></section>${back}`;
  }
  const today = dayOfYear() % GUESS.length, sc = guessScore(S), stat = { done: "✅", waiting: "⏳", new: "•" };
  const row = i => `<button class="pick" data-act="guess-open" data-id="${i}"><span class="box">${stat[guessStatus(S, i)]}</span><span class="pick-t"><b>${esc(q(i))}</b></span></button>`;
  return `<section class="card"><h2>${t("Вопрос дня")}</h2><p class="deck-q">${esc(q(today))}</p>
      <button class="btn primary" data-act="guess-open" data-id="${today}">${guessStatus(S, today) === "new" ? t("Ответить") : t("Открыть")}</button></section>
    <section class="card"><h2>${t("Счёт пары")}</h2>
      <p class="muted">${sc.n ? t("Угадали: вы — {a} из {n}, {name} — {b} из {n}.", { a: sc.mine, b: sc.theirs, n: sc.n, name: esc(name(p, partner)) }) : t("Пока нет вопросов, на которые ответили оба.")}</p></section>
    <h2 class="sec">${t("Все вопросы")}</h2><div class="list-flat">${GUESS.map((_, i) => row(i)).join("")}</div>`;
}

// ---- wish map ----
function wishes(S) {
  const me = S.user.uid, mine = i => S.answers.get(`wishes_${i}_${me}`), hit = i => S.results.get("wishes_" + i);
  const matches = WISHES.map((_, i) => i).filter(i => hit(i));
  const icon = { yes: "🔥", maybe: "✨" };
  const chip = v => ({ yes: t("Да"), maybe: t("Может быть"), no: t("Нет") }[v]);
  return `<section class="card"><h2>${t("Совпадения")}</h2>
      ${matches.length ? `<ul class="feed">${matches.map(i => `<li><b>${icon[hit(i).level]}</b><span>${esc(pick(WISHES[i], lang()))}</span><small>${hit(i).level === "yes" ? t("оба «да»") : t("оба открыты")}</small></li>`).join("")}</ul>`
        : `<p class="muted">${t("Пока нет совпадений. Ответьте на пункты ниже: совпавшие появятся здесь сами.")}</p>`}</section>
    <p class="muted small">${t("Ответ нельзя изменить, и партнёр не увидит ваше «нет» и ваши ответы, только совпадения.")}</p>
    ${WISHES.map((_, i) => `<article class="wish"><p>${esc(pick(WISHES[i], lang()))}</p>${mine(i)
      ? `<span class="chip">${t("Ваш ответ")}: ${chip(mine(i).v)}</span>`
      : `<div class="wish-btns"><button class="btn" data-act="wish" data-id="${i}" data-v="yes">${t("Да")}</button><button class="btn" data-act="wish" data-id="${i}" data-v="maybe">${t("Может быть")}</button><button class="btn" data-act="wish" data-id="${i}" data-v="no">${t("Нет")}</button></div>`}</article>`).join("")}`;
}

// ---- coupons ----
function coupons(S, g) {
  const p = S.pair, me = S.user.uid, partner = other(p, me), list = S.coupons || [];
  const forMe = list.filter(c => c.from !== me), byMe = list.filter(c => c.from === me);
  const line = (c, mine) => `<li class="order"><div><b>${esc(c.title)}</b><small>${c.used ? t("использован") : mine ? t("ждёт, когда {name} использует", { name: esc(name(p, partner)) }) : t("можно использовать")}</small></div>
    <div class="order-btns">${c.used ? "✅" : mine ? `<button class="btn ghost" data-act="coupon-del" data-id="${esc(c.id)}">${t("Забрать")}</button>` : `<button class="btn primary" data-act="coupon-use" data-id="${esc(c.id)}">${t("Использовать")}</button>`}</div></li>`;
  const adding = g.adding ? `<section class="card"><h2>${t("Подарить купон")}</h2>
      <label class="field"><span>${t("Свой купон")}</span><input data-field="g.text" maxlength="80" value="${esc(g.text)}" placeholder="${t("Например, вечер с настолками")}"></label>
      <button class="btn primary" data-act="coupon-give-custom" ${g.text.trim() ? "" : "disabled"}>${t("Подарить")}</button>
      <h3 class="sub">${t("Или выберите готовый")}</h3>
      <ul class="orders">${COUPONS.map((c, i) => `<li class="order"><div><b>${esc(pick(c, lang()))}</b></div><div class="order-btns"><button class="btn" data-act="coupon-give" data-id="${i}">${t("Подарить")}</button></div></li>`).join("")}</ul>
      <button class="btn ghost" data-act="coupon-adding" data-v="0">${t("Закрыть")}</button></section>`
    : `<button class="btn primary big" data-act="coupon-adding" data-v="1">${t("Подарить купон")}</button>`;
  return `${adding}
    <section class="card"><h2>${t("Для вас")}</h2>${forMe.length ? `<ul class="orders">${forMe.map(c => line(c, false)).join("")}</ul>` : `<p class="muted">${t("Пока нет купонов от партнёра.")}</p>`}</section>
    <section class="card"><h2>${t("Вы подарили")}</h2>${byMe.length ? `<ul class="orders">${byMe.map(c => line(c, true)).join("")}</ul>` : `<p class="muted">${t("Вы ещё ничего не дарили.")}</p>`}</section>`;
}

// ---- evening scripts ----
function homeDate(S, g) {
  if (g.script == null) return `<section class="card"><h2>${t("Выберите вечер")}</h2><ul class="orders">${SCRIPTS.map((s, i) =>
    `<li class="order"><div><b>${esc(pick(s.title, lang()))}</b><small>${t("{n} шагов", { n: s.steps.length })}</small></div><div class="order-btns"><button class="btn primary" data-act="script-open" data-id="${i}">${t("Начать")}</button></div></li>`).join("")}</ul></section>`;
  const sc = SCRIPTS[g.script], all = g.done.size === sc.steps.length;
  return `<section class="card"><h2>${esc(pick(sc.title, lang()))}</h2>
      ${sc.steps.map((st, i) => `<button class="pick ${g.done.has(i) ? "on" : ""}" data-act="script-step" data-id="${i}" role="checkbox" aria-checked="${g.done.has(i)}"><span class="box">${g.done.has(i) ? "✓" : ""}</span><span class="pick-t"><b>${esc(pick(st, lang()))}</b></span></button>`).join("")}
      ${all ? `<p class="deck-q">${t("Отличный вечер! Отметьте его в «Делах» как дело «Вдвоём».")}</p>` : ""}</section>
    <button class="btn ghost" data-act="script-close">${t("К списку вечеров")}</button>`;
}

// ---- 30 days of closeness ----
export function dayNumber(start, today) {
  const a = start.split("-").map(Number), b = today.split("-").map(Number);
  return Math.floor((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 864e5) + 1;
}
function intimacy30(S) {
  const pr = S.progress;
  if (!pr) return `<section class="card"><h2>${t("30 дней близости")}</h2><p class="muted">${t("Каждый день — одно маленькое дело для двоих. Открывается по одному в день, а пропущенное можно отметить позже.")}</p>
    <button class="btn primary big" data-act="days-start">${t("Начать сегодня")}</button></section>`;
  const today = Math.max(1, Math.min(30, dayNumber(pr.start, dayKey()))), done = new Set(pr.done || []);
  return `<section class="card"><h2>${t("День {n} из 30", { n: today })}</h2><p class="deck-q">${esc(pick(DAYS30[today - 1], lang()))}</p>
      ${done.has(today) ? `<p class="muted">${t("Сегодня уже отмечено. До завтра!")}</p>` : `<button class="btn primary" data-act="days-done" data-id="${today}">${t("Сделали!")}</button>`}
      <p class="muted small">${t("Отмечено дней: {n}", { n: done.size })}</p></section>
    <div class="days">${DAYS30.map((_, i) => { const d = i + 1, open = d <= today;
      return `<button class="day ${done.has(d) ? "on" : ""} ${d === today ? "now" : ""}" ${open && !done.has(d) ? `data-act="days-done" data-id="${d}"` : "disabled"} aria-label="${t("День {n} из 30", { n: d })}">${done.has(d) ? "✓" : d}</button>`; }).join("")}</div>
    <h2 class="sec">${t("Уже открытые дни")}</h2><ul class="feed">${DAYS30.slice(0, today).map((c, i) => `<li><b>${i + 1}</b><span>${esc(pick(c, lang()))}</span><small>${done.has(i + 1) ? "✅" : ""}</small></li>`).reverse().join("")}</ul>`;
}
