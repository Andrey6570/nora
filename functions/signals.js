// Warm signals and reactions: fixed catalogue, so the server can check them and write push text in the
// recipient's language. Plain data without imports, shared with the app.

export const REACTIONS = { heart: "❤️", clap: "👏", fire: "🔥", hug: "🤗", thanks: "🙏" };
export const LIMITS = { message: 10, reaction: 30 }; // per sender per day

export const MESSAGES = {
  thanks_dinner: { icon: "🍽", ru: "Спасибо за ужин!", en: "Thanks for dinner!", el: "Ευχαριστώ για το βραδινό!" },
  thanks_help: { icon: "🙏", ru: "Спасибо, что помогаешь", en: "Thanks for helping out", el: "Ευχαριστώ που βοηθάς" },
  noticed: { icon: "👀", ru: "Вижу, как много ты делаешь. Спасибо!", en: "I see how much you do. Thank you!", el: "Βλέπω πόσα κάνεις. Ευχαριστώ!" },
  proud: { icon: "🌟", ru: "Горжусь тобой", en: "I'm proud of you", el: "Είμαι περήφανος για σένα" },
  best: { icon: "🦊", ru: "Ты лучший партнёр", en: "You're the best partner", el: "Είσαι ο καλύτερος σύντροφος" },
  strong: { icon: "💪", ru: "У тебя всё получится", en: "You've got this", el: "Θα τα καταφέρεις" },
  tired: { icon: "🫶", ru: "Тяжёлый день? Давай я подхвачу", en: "Hard day? Let me take over", el: "Δύσκολη μέρα; Άσε με να αναλάβω" },
  love: { icon: "❤️", ru: "Люблю тебя", en: "I love you", el: "Σ' αγαπώ" },
  miss: { icon: "💭", ru: "Скучаю по тебе", en: "I miss you", el: "Μου λείπεις" },
  thinking: { icon: "☁️", ru: "Думаю о тебе", en: "Thinking of you", el: "Σε σκέφτομαι" },
  hug: { icon: "🤗", ru: "Обнимаю тебя", en: "Sending you a hug", el: "Σου στέλνω μια αγκαλιά" },
  tea: { icon: "☕", ru: "Сегодня за мной чай", en: "Tea is on me today", el: "Σήμερα το τσάι είναι δική μου υπόθεση" },
  movie: { icon: "🎬", ru: "Давай вечером кино вдвоём?", en: "Movie night, just us?", el: "Βραδινή ταινία οι δυο μας;" },
  walk: { icon: "🚶", ru: "Пойдём погуляем?", en: "Shall we go for a walk?", el: "Πάμε μια βόλτα;" }
};

export const KINDS = ["message", "reaction"];

export function isKnown(kind, key) {
  return kind === "reaction" ? key in REACTIONS : kind === "message" ? key in MESSAGES : false;
}

export function messageText(key, lang) {
  const m = MESSAGES[key];
  return m ? m[lang] || m.en : "";
}

// Text of the push notification for a signal. taskTitle is the chore a reaction refers to, if known.
export function pushText(kind, key, lang, taskTitle) {
  if (kind === "message") return messageText(key, lang);
  const emoji = REACTIONS[key] || "";
  if (!taskTitle) return emoji + " " + { ru: "Реакция на ваше дело", en: "A reaction to your chore", el: "Αντίδραση στη δουλειά σας" }[lang];
  const q = taskTitle.length > 40 ? taskTitle.slice(0, 40) + "…" : taskTitle;
  return emoji + " " + { ru: `Реакция на «${q}»`, en: `Reaction to “${q}”`, el: `Αντίδραση στο «${q}»` }[lang];
}
