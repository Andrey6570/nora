// Screens as HTML strings. Buttons carry data-act (and data-id) for the click handler in main.js.
import { t, LANGS, getLang } from "./i18n.js";
import { MINUTES, DIFFS, REPEAT_LABELS, STAGE_LABELS, STAGE_ICONS, PACKS, SCOPES, REWARD_PACKS, taskGroups, weekStats, dayKey, signalsLeft, reactionsByRef, unseenSignals, shopView } from "./domain.js";
import { gameName } from "../functions/games.js";
import { REACTIONS, MESSAGES, messageText } from "../functions/signals.js";
import { stageStars } from "../functions/economy.js";
import { LEGAL } from "./legal.js";
import { HELP } from "./help.js";

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
    ${docLinks()}
  </main>`;
}

const docLinks = () => `<p class="doc-links"><a href="#" data-act="doc" data-v="privacy">${t("Политика конфиденциальности")}</a> ·
  <a href="#" data-act="doc" data-v="terms">${t("Условия использования")}</a></p>`;

export function welcome(ui) {
  const consent = `<label class="check"><input type="checkbox" data-field="consent" ${ui.consent ? "checked" : ""}>
    <span>${t("Подтверждаю, что мне есть 18 лет, и принимаю {terms} и {privacy}", {
      terms: `<a href="#" data-act="doc" data-v="terms">${t("условия использования")}</a>`,
      privacy: `<a href="#" data-act="doc" data-v="privacy">${t("политику конфиденциальности")}</a>` })}</span></label>`;
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
  return `<main class="center narrow"><div class="logo">🦊</div><h1>${t("Добро пожаловать")}</h1>${body}${err(ui)}${docLinks()}</main>`;
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

function stageBtn(S, v, s, reactions) {
  const icon = STAGE_ICONS[s.stage];
  if (s.mark) {
    const mine = s.mark.uid === S.user.uid;
    const got = s.mark.stars ? "+" + s.mark.stars : "…";
    const who = s.mark.together ? "👫 " + esc(t("Вдвоём")) : icon + " " + esc(nameOf(S.pair, s.mark.uid));
    const rx = (reactions.get(s.id) || []).map(k => REACTIONS[k] || "").join("");
    // your own mark can be taken back, the partner's one can get a reaction
    const act = mine ? `data-act="undo" data-id="${esc(s.id)}"` : `data-act="react" data-id="${esc(s.id)}"`;
    return `<button class="stage done ${mine ? "mine" : "theirs"} ${s.mark.together ? "together" : ""}" ${act}
      aria-label="${esc(t(STAGE_LABELS[s.stage]))}: ${s.mark.together ? esc(t("Вдвоём")) : esc(nameOf(S.pair, s.mark.uid))}">${who} <span class="star">★</span>${got}${rx ? ` <span class="rx">${rx}</span>` : ""}</button>`;
  }
  const btn = `<button class="stage" data-act="claim" data-task="${esc(v.task.id)}" data-stage="${s.stage}">${icon} ${esc(t(STAGE_LABELS[s.stage]))} <span class="star">★</span>${s.stars}</button>`;
  // done together: double stars, all into the shared pot
  const both = s.together && (S.pair.members || []).length === 2
    ? `<button class="stage together" data-act="claim" data-together="1" data-task="${esc(v.task.id)}" data-stage="${s.stage}">👫 ${esc(t("Вдвоём"))} <span class="star">★</span>${s.together}</button>` : "";
  return btn + both;
}

function taskCard(S, v, reactions) {
  const tk = v.task;
  const meta = [t("{n} мин", { n: tk.minutes }), t((DIFFS.find(d => d[0] === tk.difficulty) || DIFFS[0])[1]), t((REPEAT_LABELS.find(r => r[0] === tk.repeat) || REPEAT_LABELS[0])[1])];
  return `<article class="task ${v.done ? "is-done" : ""}">
    <div class="task-h"><h3>${esc(tk.title)}</h3><button class="icon" data-act="edit-task" data-id="${esc(tk.id)}" aria-label="${t("Изменить")}">⋯</button></div>
    <p class="meta">${meta.map(esc).join(" · ")}</p>
    <div class="stages">${v.stages.map(s => stageBtn(S, v, s, reactions)).join("")}</div>
  </article>`;
}

function tasksTab(S) {
  const g = taskGroups(S.tasks, S.logs, S.pair.scale, dayKey());
  const reactions = reactionsByRef(S.signals || []);
  const section = (title, list) => list.length ? `<h2 class="sec">${t(title)}</h2>${list.map(v => taskCard(S, v, reactions)).join("")}` : "";
  const empty = !S.tasks.length;
  return `${(S.pair.members || []).length < 2 ? invite(S.pair) : ""}
    ${summary(S)}
    ${empty ? `<section class="card empty"><h2>${t("Дел пока нет")}</h2>
      <p class="muted">${t("Добавьте свои дела или возьмите готовый набор. Звёзды считаются сами: из времени и сложности.")}</p>
      <div class="row"><button class="btn primary" data-act="new-task">${t("Добавить дело")}</button>
      <button class="btn" data-act="packs">${t("Готовые наборы")}</button></div></section>` : ""}
    ${section("Каждый день", g.daily)}${section("На этой неделе", g.weekly)}${section("Разовые", g.once)}${section("Готово сегодня", g.doneOnce)}
    ${empty ? "" : `<div class="row"><button class="btn" data-act="packs">${t("Готовые наборы")}</button></div>`}
    ${empty ? "" : `<button class="fab" data-act="new-task" aria-label="${t("Добавить дело")}">＋</button>`}`;
}

const orderTitle = o => o.kind === "game" ? gameName(o.ref, getLang()) : o.title;

// Rewards: personal ones are bought from one's own stars at once, joint ones are proposed and spent from the pot when the partner agrees.
function shopSection(S) {
  const p = S.pair, me = S.user.uid, other = partnerOf(p, me), v = shopView(p, me, S.rewards || [], S.orders || []);
  const proposal = o => {
    const mine = o.uid === me;
    return `<li class="order"><div><b>${esc(orderTitle(o))}</b>
      <small>${mine ? t("Ждёт согласия: {name}", { name: esc(nameOf(p, other)) }) : t("{name} предлагает потратить копилку", { name: esc(nameOf(p, o.uid)) })} · ★${o.cost}</small></div>
      <div class="order-btns">${mine ? `<button class="btn" data-act="cancel-order" data-id="${esc(o.id)}">${t("Отозвать")}</button>`
        : `<button class="btn primary" data-act="approve-order" data-id="${esc(o.id)}" ${(p.pot || 0) >= o.cost ? "" : "disabled"}>${t("Согласен")}</button>
           <button class="btn ghost" data-act="cancel-order" data-id="${esc(o.id)}">${t("Отклонить")}</button>`}</div></li>`;
  };
  const reward = r => `<li class="order"><div><b>${esc(r.title)}</b></div>
    <div class="order-btns"><button class="btn" data-act="buy" data-id="${esc(r.id)}" ${v.canBuy(r) ? "" : "disabled"}>${r.scope === "joint" ? t("Предложить") : t("Купить")} <span class="star">★</span>${r.cost}</button>
    <button class="icon" data-act="edit-reward" data-id="${esc(r.id)}" aria-label="${t("Изменить")}">⋯</button></div></li>`;
  const group = (title, hint, list) => list.length ? `<h3 class="sub">${t(title)}</h3><p class="muted small">${t(hint)}</p><ul class="orders">${list.map(reward).join("")}</ul>` : "";
  const unused = o => `<li class="order"><div><b>${esc(orderTitle(o))}</b><small>${esc(nameOf(p, o.uid))} · ★${o.cost}</small></div>
    <div class="order-btns"><button class="btn" data-act="use-order" data-id="${esc(o.id)}">${t("Использовано")}</button></div></li>`;
  return `<section class="card shop"><h2>${t("Награды")}</h2>
    <p class="muted">${t("Звёзды можно потратить: свои на личное время, копилку на совместное, с согласия партнёра.")}</p>
    ${v.proposals.length ? `<h3 class="sub">${t("Ждут согласия")}</h3><ul class="orders">${v.proposals.map(proposal).join("")}</ul>` : ""}
    ${v.unused.length ? `<h3 class="sub">${t("Куплено, ещё не использовано")}</h3><ul class="orders">${v.unused.map(unused).join("")}</ul>` : ""}
    ${group("Из моих звёзд", "Личное время: баланс вычитается сразу, партнёр получает уведомление.", v.personal)}
    ${group("Из копилки, вдвоём", "Звёзды копилки уйдут, когда партнёр согласится.", v.joint)}
    ${!(S.rewards || []).length ? `<p class="muted">${t("Наград пока нет. Добавьте свои или возьмите готовые.")}</p>` : ""}
    <div class="row"><button class="btn" data-act="new-reward">${t("Добавить награду")}</button>
    <button class="btn" data-act="reward-packs">${t("Готовые награды")}</button></div>
  </section>`;
}

function usTab(S) {
  const p = S.pair, me = S.user.uid, members = p.members || [];
  const { by: stats, together } = weekStats(S.logList, members, dayKey());
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
      <p class="muted">${t("Каждая звезда идёт и тому, кто её заработал, и в общую копилку. Дела, сделанные вдвоём, приносят в копилку двойные звёзды.")}</p></section>
    ${members.length === 2 ? shopSection(S) : ""}
    <section class="card"><h2>${t("Вклад за 7 дней")}</h2>
      <p class="muted">${t("Не соревнование, а общая картина: кто замечает, кто планирует, кто делает.")}</p>
      ${members.map(bar).join("")}
      ${together ? `<div class="who"><div class="who-h"><b>👫 ${t("Вдвоём")}</b><span>${star(together)}</span></div>
        <p class="meta">${t("Дела, сделанные вместе: двойные звёзды в общую копилку")}</p></div>` : ""}
      <p class="legend"><span><i class="b-notice"></i>${t("Заметить")}</span><span><i class="b-plan"></i>${t("Спланировать")}</span><span><i class="b-do"></i>${t("Сделать")}</span></p>
    </section>`;
}

function ago(at) {
  const min = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (min < 1) return t("только что");
  if (min < 60) return t("{n} мин назад", { n: min });
  const h = Math.round(min / 60);
  return h < 24 ? t("{n} ч назад", { n: h }) : t("{n} дн назад", { n: Math.round(h / 24) });
}

function warmthTab(S) {
  const p = S.pair, me = S.user.uid, today = dayKey(), alone = (p.members || []).length < 2;
  const left = signalsLeft(p, me, today, "message");
  const logs = S.logs;
  const feedLine = sg => {
    const mine = sg.from === me, who = mine ? t("Вы") : nameOf(p, sg.from);
    let text;
    if (sg.kind === "message") text = `${(MESSAGES[sg.key] || {}).icon || ""} ${esc(messageText(sg.key, getLang()))}`;
    else {
      const parsed = sg.ref && S.tasks.find(x => sg.ref.startsWith(x.id + "_"));
      text = `${REACTIONS[sg.key] || ""} ${parsed ? t("реакция на «{x}»", { x: esc(parsed.title) }) : t("реакция")}`;
    }
    return `<li class="${mine ? "mine" : ""}"><b>${esc(who)}</b><span>${text}</span><small>${esc(ago(sg.at || 0))}</small></li>`;
  };
  const recent = (S.signals || []).slice(0, 25);
  return `${alone ? invite(p) : ""}
    <section class="card"><h2>${t("Тёплые слова")}</h2>
      <p class="muted">${alone ? t("Когда партнёр присоединится, здесь можно будет отправлять тёплые слова одним нажатием.")
        : t("Одно нажатие, и партнёр получит уведомление. Осталось сегодня: {n}", { n: left })}</p>
      <div class="signals">${Object.entries(MESSAGES).map(([k, m]) =>
        `<button class="signal" data-act="signal" data-id="${k}" ${alone || !left ? "disabled" : ""}><span>${m.icon}</span>${esc(messageText(k, getLang()))}</button>`).join("")}</div>
    </section>
    <section class="card"><h2>${t("Лента")}</h2>
      ${recent.length ? `<ul class="feed">${recent.map(feedLine).join("")}</ul>` : `<p class="muted">${t("Здесь появятся реакции и тёплые слова.")}</p>`}
      <p class="muted small">${t("Реакцию на дело партнёра можно поставить во вкладке «Дела»: нажмите на его отметку.")}</p>
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
    <section class="card"><h2>${t("Помощь и документы")}</h2>
      <button class="btn" data-act="help">${t("Справка и вопросы")}</button>
      <button class="btn ghost" data-act="doc" data-v="privacy">${t("Политика конфиденциальности")}</button>
      <button class="btn ghost" data-act="doc" data-v="terms">${t("Условия использования")}</button></section>
    <section class="card"><h2>${t("Пара")}</h2>
      ${(p.members || []).length < 2 ? `<button class="btn" data-act="new-invite">${t("Сменить код приглашения")}</button>` : ""}
      <button class="btn danger" data-act="leave">${t("Выйти из пары")}</button>
      <button class="btn ghost" data-act="signout">${t("Выйти из аккаунта")}</button></section>
    <section class="card"><h2>${t("Аккаунт и данные")}</h2>
      <p class="muted">${t("Удаляет ваш профиль, имя в паре и запись входа. Партнёр останется в паре.")}</p>
      <button class="btn danger" data-act="delete-account">${t("Удалить аккаунт")}</button></section>
    <p class="muted center-text small">${t("Нора")} 0.1</p>`;
}

const TABS = [["tasks", "📋", "Дела"], ["us", "🦊", "Мы"], ["warm", "💌", "Тепло"], ["settings", "⚙️", "Настройки"]];

export function main(S, ui) {
  const body = ui.tab === "us" ? usTab(S) : ui.tab === "warm" ? warmthTab(S) : ui.tab === "settings" ? settingsTab(S, ui) : tasksTab(S);
  const unseen = ui.tab === "warm" ? 0 : unseenSignals(S.signals || [], S.user.uid, ui.seenAt || 0);
  return `<header class="top"><b>${t("Нора")}</b>${S.demo ? `<span class="badge">${t("Демо")}</span>` : ""}</header>
    <main class="page">${body}${err(ui)}</main>
    <nav class="tabs">${TABS.map(([id, icon, label]) =>
      `<button class="${ui.tab === id ? "on" : ""}" data-act="tab" data-v="${id}" aria-current="${ui.tab === id}"><span>${icon}${id === "warm" && unseen ? `<i class="dot" aria-label="${unseen}">${unseen}</i>` : ""}</span>${t(label)}</button>`).join("")}</nav>
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

// Ready-made chores as a checklist: pick single chores; ones the pair already has are marked.
function rewardForm(S, ui) {
  const d = ui.sheet.draft;
  return `<h2>${d.id ? t("Изменить награду") : t("Новая награда")}</h2>
    <label class="field"><span>${t("Что получаем")}</span><input data-field="d.title" maxlength="80" value="${esc(d.title)}" placeholder="${t("Например, вечер без домашних дел")}"></label>
    <label class="field"><span>${t("Цена в звёздах")}</span><input data-field="d.cost" type="number" inputmode="numeric" min="1" max="9999" value="${esc(d.cost)}"></label>
    <div class="field"><span>${t("Откуда звёзды")}</span>${seg("d.scope", SCOPES, d.scope)}</div>
    <p class="muted small">${d.scope === "joint" ? t("Копилка тратится вдвоём: партнёр должен согласиться.") : t("Тратятся ваши личные звёзды, партнёр получит уведомление.")}</p>
    ${err(ui)}
    <div class="row"><button class="btn primary" data-act="save-reward" ${ui.busy ? "disabled" : ""}>${t("Сохранить")}</button>
    <button class="btn ghost" data-act="close">${t("Отмена")}</button></div>
    ${d.id ? `<button class="btn danger ghost" data-act="delete-reward" data-id="${esc(d.id)}">${t("Удалить награду")}</button>` : ""}`;
}

function rewardPacksSheet(S, ui) {
  const have = new Set((S.rewards || []).map(x => x.title.trim().toLowerCase())), picked = ui.sheet.picked;
  const row = (p, r, i) => {
    const id = p.id + ":" + i, title = t(r[0]), exists = have.has(title.toLowerCase()), on = picked.has(id);
    return `<button class="pick ${on ? "on" : ""}" ${exists ? "disabled" : `data-act="pick" data-id="${id}"`} role="checkbox" aria-checked="${on}">
      <span class="box">${on ? "✓" : ""}</span><span class="pick-t"><b>${esc(title)}</b><small>${exists ? t("Уже есть") : `★${r[1]}`}</small></span></button>`;
  };
  return `<h2>${t("Готовые награды")}</h2><p class="muted">${t("Отметьте награды, которые подходят вам. Цену потом можно поменять.")}</p>
    ${REWARD_PACKS.map(p => `<div class="pack-h"><b>${p.icon} ${t(p.title)}</b></div>${p.rewards.map((r, i) => row(p, r, i)).join("")}`).join("")}
    <div class="sheet-foot row"><button class="btn primary" data-act="add-picked-rewards" ${picked.size && !ui.busy ? "" : "disabled"}>${t("Добавить ({n})", { n: picked.size })}</button>
    <button class="btn ghost" data-act="close">${t("Закрыть")}</button></div>`;
}

function packsSheet(S, ui) {
  const have = new Set(S.tasks.map(x => x.title.trim().toLowerCase()));
  const picked = ui.sheet.picked;
  const row = (p, r, i) => {
    const id = p.id + ":" + i, title = t(r[0]), exists = have.has(title.toLowerCase()), on = picked.has(id);
    const meta = [t("{n} мин", { n: r[1] }), t((REPEAT_LABELS.find(x => x[0] === r[3]) || REPEAT_LABELS[0])[1])].join(" · ");
    return `<button class="pick ${on ? "on" : ""}" ${exists ? "disabled" : `data-act="pick" data-id="${id}"`} role="checkbox" aria-checked="${on}">
      <span class="box">${on ? "✓" : ""}</span><span class="pick-t"><b>${esc(title)}</b><small>${exists ? t("Уже есть") : esc(meta)}</small></span></button>`;
  };
  return `<h2>${t("Готовые наборы")}</h2><p class="muted">${t("Отметьте дела, которые подходят вам.")}</p>
    ${PACKS.map(p => `<div class="pack-h"><b>${p.icon} ${t(p.title)}</b>
      <button class="btn ghost small-btn" data-act="pick-all" data-id="${p.id}">${t("Все")}</button></div>
      ${p.tasks.map((r, i) => row(p, r, i)).join("")}`).join("")}
    <div class="sheet-foot row"><button class="btn primary" data-act="add-picked" ${picked.size && !ui.busy ? "" : "disabled"}>${t("Добавить ({n})", { n: picked.size })}</button>
    <button class="btn ghost" data-act="close">${t("Закрыть")}</button></div>`;
}

function confirmSheet(title, text, act, label, id, plain) {
  return `<h2>${t(title)}</h2><p class="muted">${plain ? text : t(text)}</p>
    <div class="row"><button class="btn ${plain ? "primary" : "danger"}" data-act="${act}" ${id ? `data-id="${esc(id)}"` : ""}>${t(label)}</button>
    <button class="btn ghost" data-act="close">${t("Отмена")}</button></div>`;
}

function docSheet(kind) {
  const d = LEGAL[kind][getLang()] || LEGAL[kind].en;
  return `<h2>${d.title}</h2><p class="muted small">${d.updated}</p>
    <div class="doc">${d.sections.map(([h, body]) => `<h3>${h}</h3><div>${body}</div>`).join("")}</div>
    <div class="sheet-foot row"><button class="btn" data-act="close">${t("Закрыть")}</button></div>`;
}

function helpSheet(ui) {
  const h = HELP[getLang()] || HELP.en, tab = ui.sheet.tab || "guide";
  return `<h2>${t("Справка")}</h2>
    ${seg("help-tab", [["guide", "Как пользоваться"], ["faq", "Частые вопросы"]], tab)}
    <div class="help">${h[tab].map(([q, a]) => `<details ${tab === "guide" ? "open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
    <div class="sheet-foot row"><button class="btn" data-act="close">${t("Закрыть")}</button></div>`;
}

// Sheets that also open before sign-in: documents and help.
export function overlay(S, ui) {
  const k = ui.sheet && ui.sheet.type;
  if (k !== "doc" && k !== "help") return "";
  return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${k === "doc" ? docSheet(ui.sheet.v) : helpSheet(ui)}</div>`;
}

function reactSheet(S, ui) {
  const left = signalsLeft(S.pair, S.user.uid, dayKey(), "reaction");
  return `<h2>${t("Реакция на отметку")}</h2>
    <p class="muted">${left ? t("Партнёр получит уведомление. Осталось сегодня: {n}", { n: left }) : t("Лимит реакций на сегодня исчерпан.")}</p>
    <div class="reactions">${Object.entries(REACTIONS).map(([k, e]) =>
      `<button class="react" data-act="react-send" data-id="${k}" data-ref="${esc(ui.sheet.id)}" ${left ? "" : "disabled"} aria-label="${k}">${e}</button>`).join("")}</div>
    <div class="row"><button class="btn ghost" data-act="close">${t("Закрыть")}</button></div>`;
}

function sheet(S, ui) {
  const k = ui.sheet.type;
  if (k === "doc" || k === "help") return overlay(S, ui);
  if (k === "react") return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${reactSheet(S, ui)}</div>`;
  const buying = k === "buy" && (S.rewards || []).find(r => r.id === ui.sheet.id);
  const inner = k === "task" ? taskForm(S, ui) : k === "packs" ? packsSheet(S, ui)
    : k === "reward" ? rewardForm(S, ui) : k === "rewardpacks" ? rewardPacksSheet(S, ui)
    : k === "buy" ? (buying ? confirmSheet(buying.scope === "joint" ? "Предложить партнёру?" : "Купить награду?",
        buying.scope === "joint" ? t("«{x}» за {n} ★ из копилки. Звёзды уйдут, когда партнёр согласится.", { x: buying.title, n: buying.cost }) : t("«{x}» за {n} ★ из ваших звёзд. Они спишутся сразу.", { x: buying.title, n: buying.cost }),
        "buy-yes", buying.scope === "joint" ? "Предложить" : "Купить", buying.id, true) : confirmSheet("Награда не найдена", "Обновите экран.", "close", "Закрыть"))
    : k === "undo" ? confirmSheet("Отменить отметку?", "Звёзды за этот этап вернутся.", "undo-yes", "Отменить отметку", ui.sheet.id)
    : k === "delete" ? confirmSheet("Удалить аккаунт?", "Ваш профиль, имя в паре и запись входа будут удалены сразу, это нельзя отменить. Ваши отметки останутся в истории пары без имени. Для подтверждения нужно ещё раз войти через Google.", "delete-yes", "Удалить навсегда")
    : confirmSheet("Выйти из пары?", "Партнёр останется в паре и сможет пригласить вас снова по новому коду. Заработанные звёзды останутся в истории пары.", "leave-yes", "Выйти из пары");
  return `<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
}
