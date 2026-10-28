// Catalogue of games for two. cost 0 = free; otherwise the pair buys the game with stars from the shared pot
// (the partner has to agree). Plain data without imports, shared with the app. ready: false = planned, not shown yet.

export const GAMES = {
  guess: { name: { ru: "Угадай ответ", en: "Guess the answer", el: "Μάντεψε την απάντηση" }, icon: "🔮", cost: 0, ready: false },
  wheel: { name: { ru: "Колесо свиданий", en: "Date wheel", el: "Τροχός ραντεβού" }, icon: "🎡", cost: 0, ready: false },
  questions36: { name: { ru: "36 вопросов", en: "36 questions", el: "36 ερωτήσεις" }, icon: "💬", cost: 0, ready: false },
  truth: { name: { ru: "Правда или действие: романтика", en: "Truth or dare: romance", el: "Αλήθεια ή πρόκληση: ρομαντικό" }, icon: "🎭", cost: 0, ready: false },
  wishes: { name: { ru: "Карта желаний", en: "Wish map", el: "Χάρτης επιθυμιών" }, icon: "🗝", cost: 20, ready: false },
  flirt: { name: { ru: "Колода «Флирт»", en: "Deck “Flirt”", el: "Τράπουλα «Φλερτ»" }, icon: "😏", cost: 20, ready: false },
  coupons: { name: { ru: "Купоны", en: "Coupons", el: "Κουπόνια" }, icon: "🎟", cost: 10, ready: false },
  homeDate: { name: { ru: "Квест-свидание дома", en: "Date quest at home", el: "Ραντεβού-αποστολή στο σπίτι" }, icon: "🕯", cost: 30, ready: false },
  intimacy30: { name: { ru: "30 дней близости", en: "30 days of closeness", el: "30 ημέρες οικειότητας" }, icon: "🔥", cost: 25, ready: false },
  dreams: { name: { ru: "Колода «Мечты и планы»", en: "Deck “Dreams and plans”", el: "Τράπουλα «Όνειρα και σχέδια»" }, icon: "🌠", cost: 10, ready: false },
  memories: { name: { ru: "Колода «Воспоминания»", en: "Deck “Memories”", el: "Τράπουλα «Αναμνήσεις»" }, icon: "📷", cost: 10, ready: false }
};

export const gameName = (id, lang) => { const n = GAMES[id] && GAMES[id].name; return n ? n[lang] || n.en : id; };
export const isPaidGame = id => !!GAMES[id] && GAMES[id].cost > 0;
export const isUnlocked = (pair, id) => !!GAMES[id] && (GAMES[id].cost === 0 || !!(pair && pair.games && pair.games[id]));
