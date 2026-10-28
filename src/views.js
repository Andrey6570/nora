// Screens as HTML strings. Buttons carry data-act (and data-id) for the click handler in main.js.
import { t, LANGS, getLang } from "./i18n.js";
import { MINUTES, DIFFS, REPEAT_LABELS, STAGE_LABELS, STAGE_ICONS, PACKS, taskGroups, weekStats, dayKey } from "./domain.js";
import { stageStars } from "../functions/economy.js";

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const star = n => `<span class="star">★</span>${n}`;
const err = ui => ui.err ? `<p class="err" role="alert">${esc(ui.err)}</p>` : "";
const seg = (name, items, cur) => `<div class="seg" role="radiogroup">${items.map(([v, label]) =>
  `<button type="button" role="radio" aria-checked="${v == cur}" class="${v == cur ? "on" : ""}" data-act="set" data-name="${name}" data-v="${v}">${esc(t(label))}</button>`).join("")}</div>`;
const langChips = () => seg("lang", LANGS.map(([v, l]) => [v, l]), getLang());

export function setup() {
  return `<main class="center narrow"><div class="logo">🦊</div><h1>${t("Нора")}</h1>
    <p class="lead">${t("Сервер ещё не подключён, поэтому войти пока нельзя. Демо показывает все экраны на примерных данных, ничего не сохраняется.")}</p>
    <button class="btn primary big" data-act="demo">${t("Посмотреть демо")}</button>
    <div class="foot">${langChips()}</div></main>`;
}

export function loading() { return `<main class="center"><div class="logo pulse">🦊</div></main>`; }

export function signIn(ui) {
  return `<main class="center">
    <div class="logo">🦊</div>
    <h1>${t("Нора")}</h1>
    <p class="lead">${t("Дом — общее дело. Игра для двоих о быте и заботе друг о друге.")}</p>
    <button class="btn primary big" data-act="signin" ${ui.busy ? "disabled" : ""}>${t("Войти через Google")}</button>
    ${err(ui)}
    <div class="foot">${langChips()}</div>
  </main>`;
}

export function welcome(ui) {
  const consent = `<label class="check"><input type="checkbox" data-field="consent" ${ui.consent ? "checked" : ""}>
    <span>${t("Подтверждаю, что мне есть 18 лет, и принимаю условия и политику конфиденциальности")}</span></label>`;
  const name = `<label class="field"><span>${t("Как вас зовут")}</span>
    <input data-field="name" maxlength="40" autocomplete="given-name" value="${esc(ui.name)}" placeholder="${t("Имя")}"></label>`;
  let body;
  if (ui.welcome === "join") {
    body = `${name}
      <label class="field"><span>${t("Код от партнёра")}</span>
        <input data-field="code" class="code-in" maxlength="8" autocapitalize="characters" autocomplete="off" value="${esc(ui.code)}" placeholder="K7M2QX"></label>
      ${consent}
      <button class="btn primary big" data-act="join" ${ui.busy ? "disabled" : ""}>${t("Присоединиться")}</button>
      <button class="btn ghost" data-act="welcome" data-v="choose">${t("Назад")}</button>`;
  } else if (ui.welcome === "create") {
    body = `${name}${consent}
      <button class="btn primary big" data-act="create" ${ui.busy ? "disabled" : ""}>${t("Создать пару")}</button>
      <button class="btn ghost" data-act="welcome" data-v="choose">${t("Назад")}</button>`;
  } else {
    body = `<p class="lead">${t("Нора — для двоих. Создайте пару и пригласите партнёра или введите код, который партнёр вам прислал.")}</p>
      <button class="btn primary big" data-act="welcome" data-v="create">${t("Создать пару")}</button>
      <button class="btn big" data-act="welcome" data-v="join">${t("У меня есть код")}</button>
      <button class="btn ghost" data-act="signout">${t("Выйти из аккаунта")}</button>`;
  }
  return `<main class="center narrow"><div class="logo">🦊</div><h1>${t("Добро пожаловать")}</h1>${body}${err(ui)}</main>`;
}

function invite(pair) {
  return `<section class="card invite">
    <h2>${t("Пригласите партнёра")}</h2>
    <p class="muted">${t("Партнёр устанавливает Нору, входит и вводит этот код:")}</p>
    <div class="code">${esc(pair.inviteCode || "")}</div>
    <div class="row"><button class="btn" data-act="copy-code">${t("Скопировать")}</button>
    <button class="btn primary" data-act="share-code">${t("Отправить")}</button></div>
  </section>`;
}

const nameOf = (pair, u) => (pair.names && pair.names[u]) || t("Партнёр");
const partnerOf = (pair, me) => (pair.members || []).find(u => u !== me);

function summary(S) {
  const p = S.pair, me = S.user.uid, other = partnerOf(p, me), bal = p.balances || {};
  return `<div class="summary">
    <div><span class="muted">${t("Копилка")}</span><b>${star(p.pot || 0)}</b></div>
    <div><span class="muted">${esc(nameOf(p, me))}</span><b>${star(bal[me] || 0)}</b></div>
    ${other ? `<div><span class="muted">${esc(nameOf(p, other))}</span><b>${star(bal[other] || 0)}</b></div>` : ""}
  </div>`;
}

function stageBtn(S, v, s) {
  const icon = STAGE_ICONS[s.stage];
  if (s.mark) {
    const mine = s.mark.uid === S.user.uid;
    const got = s.mark.stars ? "+" + s.mark.stars : "…";
    return `<button class="stage done ${mine ? "mine" : ""}" ${mine ? `data-act="undo" data-id="${esc(s.id)}"` : "disabled"}
      aria-label="${esc(t(STAGE_LABELS[s.stage]))}: ${esc(nameOf(S.pair, s.mark.uid))}">${icon} ${esc(nameOf(S.pair, s.mark.uid))} <span class="star">★</span>${got}</button>`;
  }
  return `<button class="stage" data-act="claim" data-task="${esc(v.task.id)}" data-stage="${s.stage}">${icon} ${esc(t(STAGE_LABELS[s.stage]))} <span class="star">★</span>${s.stars}</button>`;
}

function taskCard(S, v) {
  const tk = v.task;
  const meta = [t("{n} мин", { n: tk.minutes }), t((DIFFS.find(d => d[0] === tk.difficulty) || DIFFS[0])[1]), t((REPEAT_LABELS.find(r => r[0] === tk.repeat) || REPEAT_LABELS[0])[1])];
  return `<article class="task ${v.done ? "is-done" : ""}">
    <div class="task-h"><h3>${esc(tk.title)}</h3><button class="icon" data-act="edit-task" data-id="${esc(tk.id)}" aria-label="${t("Изменить")}">⋯</button></div>
    <p class="meta">${meta.map(esc).join(" · ")}</p>
    <div class="stages">${v.stages.map(s => stageBtn(S, v, s)).join("")}</div>
  </article>`;
}

function tasksTab(S) {
  const g = taskGroups(S.tasks, S.logs, S.pair.scale, dayKey());
  const section = (title, list) => list.length ? `<h2 class="sec">${t(title)}</h2>${list.map(v => taskCard(S, v)).join("")}` : "";
  const empty = !S.tasks.length;
  return `${(S.pair.members || []).length < 2 ? invite(S.pair) : ""}
    ${summary(S)}
    ${empty ? `<section class="card empty"><h2>${t("Дел пока нет")}</h2>
      <p class="muted">${t("Добавьте свои дела или возьмите готовый набор. Звёзды считаются сами: из времени и сложности.")}</p>
      <div class="row"><button class="btn primary" data-act="new-task">${t("Добавить дело")}</button>
      <button class="btn" data-act="packs">${t("Готовые наборы")}</button></div></section>` : ""}
    ${section("Каждый день", g.daily)}${section("На этой неделе", g.weekly)}${section("Разовые", g.once)}${section("Готово сегодня", g.doneOnce)}
    ${empty ? "" : `<div class="row end"><button class="btn ghost" data-act="packs">${t("Готовые наборы")}</button></div>`}
    ${empty ? "" : `<button class="fab" data-act="new-task" aria-label="${t("Добавить дело")}">＋</button>`}`;
}

function usTab(S) {
  const p = S.pair, me = S.user.uid, members = p.members || [];
  const stats = weekStats(S.logList, members, dayKey());
  const max = Math.max(1, ...members.map(u => stats[u].total));
  const bar = u => {
    const s = stats[u];
    const part = k => s[k] ? `<i class="b-${k}" style="width:${(s[k] / max) * 100}%"></i>` : "";
    return `<div class="who"><div class="who-h"><b>${esc(nameOf(p, u))}</b><span>${star(s.total)}</span></div>
      <div class="bar">${part("notice")}${part("plan")}${part("do")}</div>
      <p class="meta">👀 ${s.notice} · 🗓 ${s.plan} · ✅ ${s.do}</p></div>`;
  };
  return `${members.length < 2 ? invite(p) : `<section class="card pair"><div class="duo">🦊🦊</div>
      <h2>${members.map(u => esc(nameOf(p, u))).join(" & ")}</h2></section>`}
    <section class="card pot"><span class="muted">${t("Общая копилка")}</span><div class="big-num">${star(p.pot || 0)}</div>
      <p class="muted">${t("Каждая звезда идёт и тому, кто её заработал, и в общую копилку. Скоро на неё можно будет выбрать совместную награду.")}</p></section>
    <section class="card"><h2>${t("Вклад за 7 дней")}</h2>
      <p class="muted">${t("Не соревнование, а общая картина: кто замечает, кто планирует, кто делает.")}</p>
      ${members.map(bar).join("")}
      <p class="legend"><span><i class="b-notice"></i>${t("Заметить")}</span><span><i class="b-plan"></i>${t("Спланировать")}</span><span><i class="b-do"></i>${t("Сделать")}</span></p>
    </section>`;
}

function settingsTab(S, ui) {
  const p = S.pair;
  return `<section class="card"><h2>${t("Профиль")}</h2>
      <label class="field"><span>${t("Имя")}</span><input data-field="name" maxlength="40" value="${esc(ui.name)}"></label>
      <button class="btn" data-act="save-name">${t("Сохранить")}</button></section>
    <section class="card"><h2>${t("Язык")}</h2>${langChips()}</section>
    <section class="card"><h2>${t("Тема")}</h2>${seg("theme", [["system", "Как в системе"], ["light", "Светлая"], ["dark", "Тёмная"]], ui.theme)}</section>
    <section class="card"><h2>${t("Экономика звёзд")}</h2>
      <p class="muted">${t("Сколько минут работы стоит одна звезда. Меняет цену будущих отметок, заработанное не пересчитывается.")}</p>
      ${seg("scale", [5, 10, 15, 20, 30].map(n => [n, t("{n} мин", { n })]), p.scale || 10)}</section>
    <section class="card"><h2>${t("Пара")}</h2>
      ${(p.members || []).length < 2 ? `<button class="btn" data-act="new-invite">${t("Сменить код приглашения")}</button>` : ""}
      <button class="btn danger" data-act="leave">${t("Выйти из пары")}</button>
      <button class="btn ghost" data-act="signout">${t("Выйти из аккаунта")}</button></section>
    <p class="muted center-text small">${t("Нора")} 0.1</p>`;
}

const TABS = [["tasks", "📋", "Дела"], ["us", "🦊", "Мы"], ["settings", "⚙️", "Настройки"]];

export function main(S, ui) {
  const body = ui.tab === "us" ? usTab(S) : ui.tab === "settings" ? settingsTab(S, ui) : tasksTab(S);
  return `<header class="top"><b>${t("Нора")}</b>${S.demo ? `<span class="badge">${t("Демо")}</span>` : ""}</header>
    <main class="page">${body}${err(ui)}</main>
    <nav class="tabs">${TABS.map(([id, icon, label]) =>
      `<button class="${ui.tab === id ? "on" : ""}" data-act="tab" data-v="${id}" aria-current="${ui.tab === id}"><span>${icon}</span>${t(label)}</button>`).join("")}</nav>
    ${ui.sheet ? sheet(S, ui) : ""}`;
}

function taskForm(S, ui) {
  const d = ui.sheet.draft;
  const full = d.full;
  const preview = (full ? ["notice", "plan", "do"] : ["do"]).map(s => `${STAGE_ICONS[s]} ${star(stageStars(d, s, S.pair.scale))}`).join(" · ");
  return `<h2>${d.id ? t("Изменить дело") : t("Новое дело")}</h2>
    <label class="field"><span>${t("Что сделать")}</span><input data-field="d.title" maxlength="80" value="${esc(d.title)}" placeholder="${t("Например, помыть посуду")}"></label>
    <label class="field"><span>${t("Сколько времени")}</span><select data-field="d.minutes">${MINUTES.map(m => `<option value="${m}" ${m === d.minutes ? "selected" : ""}>${t("{n} мин", { n: m })}</option>`).join("")}</select></label>
    <div class="field"><span>${t("Сложность")}</span>${seg("d.difficulty", DIFFS, d.difficulty)}</div>
    <div class="field"><span>${t("Повтор")}</span>${seg("d.repeat", REPEAT_LABELS, d.repeat)}</div>
    <label class="check"><input type="checkbox" data-field="d.full" ${full ? "checked" : ""}>
      <span>${t("Учитывать этапы «заметить» и «спланировать»")}<small>${t("Для дел, которые сначала нужно заметить и организовать: запись к врачу, покупки, счета.")}</small></span></label>
    <p class="preview">${t("Звёзды")}: ${preview}</p>
    ${err(ui)}
    <div class="row"><button class="btn primary" data-act="save-task" ${ui.busy ? "disabled" : ""}>${t("Сохранить")}</button>
    <button class="btn ghost" data-act="close">${t("Отмена")}</button></div>
    ${d.id ? `<button class="btn danger ghost" data-act="delete-task" data-id="${esc(d.id)}">${t("Удалить дело")}</button>` : ""}`;
}

function packsSheet() {
  return `<h2>${t("Готовые наборы")}</h2>
    ${PACKS.map(p => `<div class="pack"><div><b>${p.icon} ${t(p.title)}</b>
      <p class="meta">${p.tasks.map(r => esc(t(r[0]))).join(", ")}</p></div>
      <button class="btn" data-act="add-pack" data-id="${p.id}">${t("Добавить")}</button></div>`).join("")}
    <button class="btn ghost" data-act="close">${t("Закрыть")}</button>`;
}

function confirmSheet(title, text, act, label, id) {
  return `<h2>${t(title)}</h2><p class="muted">${t(text)}</p>
    <div class="row"><button class="btn danger" data-act="${act}" ${id ? `data-id="${esc(id)}"` : ""}>${t(label)}</button>
    <button class="btn ghost" data-act="close">${t("Отмена")}</button></div>`;
}

function sheet(S, ui) {
  const k = ui.sheet.type;
  const inner = k === "task" ? taskForm(S, ui) : k === "packs" ? packsSheet()
    : k === "undo" ? confirmSheet("Отменить отметку?", "Звёзды за этот этап вернутся.", "undo-yes", "Отменить отметку", ui.sheet.id)
    : confirmSheet("Выйти из пары?", "Партнёр останется в паре и сможет пригласить вас снова по новому коду. Заработанные звёзды останутся в истории пары.", "leave-yes", "Выйти из пары");
  return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
}
