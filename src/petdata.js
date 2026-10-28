// Texts of the pet: what it says in each situation, stage names, characters and album cards. Every text is
// [Russian, English, Greek]. The pet speaks in the first person without gendered forms. {pet}, {name}, {n}, {stage} are filled in.

export const STAGE_NAMES = {
  baby: ["Малыш", "Baby", "Μωρό"], teen: ["Подросток", "Teen", "Έφηβος"], adult: ["Взрослый", "Grown-up", "Ενήλικας"], wise: ["Мудрый хранитель", "Wise keeper", "Σοφός φύλακας"]
};
export const DEFAULT_NAMES = { fox: ["Рыжик", "Foxy", "Αλεπού"], cat: ["Мурка", "Kitty", "Γατούλα"], hedgehog: ["Колючка", "Spike", "Σκαντζόχοιρος"], panda: ["Бамбук", "Bamboo", "Μπαμπού"], raccoon: ["Полоскун", "Rascal", "Ρακούν"] };
export const KIND_NAMES = { fox: ["Лисёнок", "Fox", "Αλεπουδάκι"], cat: ["Котёнок", "Kitten", "Γατάκι"], hedgehog: ["Ёжик", "Hedgehog", "Σκαντζοχοιράκι"], panda: ["Панда", "Panda", "Πάντα"], raccoon: ["Енот", "Raccoon", "Ρακούν"] };

export const TRAIT_TEXT = {
  homebody: ["Хозяйственный: вы чаще всего делаете дела по дому", "Homebody: you mostly do chores around the house", "Νοικοκύρης: κάνετε κυρίως δουλειές στο σπίτι"],
  romantic: ["Романтик: вы много делаете вместе и играете", "Romantic: you do a lot together and play games", "Ρομαντικός: κάνετε πολλά μαζί και παίζετε"],
  chatty: ["Болтушка: вы часто говорите друг другу тёплые слова", "Chatterbox: you often say warm words to each other", "Φλύαρος: λέτε συχνά τρυφερά λόγια ο ένας στον άλλον"]
};

export const PHRASES = {
  grew: [
    ["Новая стадия роста: {stage}. Спасибо, что заботитесь о норе!", "A new stage of growth: {stage}. Thank you for taking care of the burrow!", "Νέο στάδιο ανάπτυξης: {stage}. Ευχαριστώ που φροντίζετε τη φωλιά!"],
    ["Со мной что-то происходит: теперь я — {stage}! Это всё ваши звёзды.", "Something is happening to me: I am now {stage}! It is all thanks to your stars.", "Κάτι μου συμβαίνει: τώρα είμαι {stage}! Όλα χάρη στα αστέρια σας."]
  ],
  hello: [
    ["Привет! Меня зовут {pet}. Давайте жить дружно.", "Hi! My name is {pet}. Let's get along.", "Γεια! Με λένε {pet}. Ας ζήσουμε αρμονικά."],
    ["Я здесь недавно. Покажете, как у вас тут всё устроено?", "I am new here. Will you show me how things work?", "Είμαι καινούργιος εδώ. Θα μου δείξετε πώς λειτουργούν τα πράγματα;"],
    ["Пока в норе тихо. Сделайте первое дело, и станет веселее.", "It is quiet in the burrow for now. Do the first chore and it will be livelier.", "Προς το παρόν η φωλιά είναι ήσυχη. Κάντε την πρώτη δουλειά και θα ζωντανέψει."],
    ["Мне нравится ваша нора. Здесь будет уютно.", "I like your burrow. It is going to be cosy here.", "Μου αρέσει η φωλιά σας. Θα είναι ζεστή."],
    ["Давайте сделаем что-нибудь маленькое вместе: я за вас болею!", "Let's do something small together: I am cheering for you!", "Ας κάνουμε κάτι μικρό μαζί: σας υποστηρίζω!"],
    ["Каждая ваша звезда для меня как угощение.", "Every star of yours is like a treat for me.", "Κάθε αστέρι σας είναι σαν λιχουδιά για μένα."]
  ],
  happy: [
    ["Мне так хорошо, когда вы вместе!", "I feel so good when you are together!", "Νιώθω τόσο όμορφα όταν είστε μαζί!"],
    ["В норе тепло и уютно. Спасибо вам!", "The burrow is warm and cosy. Thank you!", "Η φωλιά είναι ζεστή και άνετη. Ευχαριστώ!"],
    ["Сегодня отличный день. Чувствую это носом!", "Today is a great day. I can feel it in my nose!", "Σήμερα είναι υπέροχη μέρα. Το νιώθω στη μύτη μου!"],
    ["Вы молодцы! Я это вижу.", "Well done, you two! I can see it.", "Μπράβο σας! Το βλέπω."],
    ["Улыбаюсь во весь рот: всё идёт как надо.", "I am grinning from ear to ear: everything is going well.", "Χαμογελάω πλατιά: όλα πάνε καλά."],
    ["Вот это команда: вы двое и я!", "What a team: the two of you and me!", "Τι ομάδα: εσείς οι δύο κι εγώ!"]
  ],
  calm: [
    ["Спокойно и хорошо. Может, ещё одно маленькое дело?", "Calm and good. Maybe one more small chore?", "Ήρεμα και όμορφα. Ίσως μια ακόμη μικρή δουλειά;"],
    ["Тихий вечер. Мне нравится.", "A quiet evening. I like it.", "Ήσυχο βράδυ. Μου αρέσει."],
    ["Чем займёмся сегодня?", "What shall we do today?", "Τι θα κάνουμε σήμερα;"],
    ["Я рядом. Если что, зовите.", "I am here. Call me if you need me.", "Είμαι εδώ. Φωνάξτε με αν χρειαστείτε."],
    ["Нора живёт своей жизнью. Подбросите ей тёплых слов?", "The burrow lives its own life. Will you add some warm words?", "Η φωλιά κάνει τη ζωή της. Θα της προσθέσετε τρυφερά λόγια;"],
    ["Всё идёт своим чередом.", "Everything is taking its course.", "Όλα πάνε κανονικά."]
  ],
  sleepy: [
    ["Я немного дремлю... Разбудите меня маленьким делом?", "I am dozing a little... Will you wake me with a small chore?", "Μισοκοιμάμαι... Θα με ξυπνήσετε με μια μικρή δουλειά;"],
    ["Зеваю. Давно не было вестей из норы.", "Yawning. There has been no news from the burrow for a while.", "Χασμουριέμαι. Έχω καιρό να μάθω νέα από τη φωλιά."],
    ["Скучаю по нашим делам.", "I miss our chores.", "Μου λείπουν οι δουλειές μας."],
    ["Тут тихо. Загляните друг к другу — я подожду.", "It is quiet here. Check in with each other, I will wait.", "Εδώ είναι ήσυχα. Δείτε ο ένας τον άλλον, θα περιμένω."],
    ["Мне снился уютный вечер вдвоём.", "I was dreaming of a cosy evening for two.", "Ονειρευόμουν μια ζεστή βραδιά οι δυο σας."],
    ["Одно дело, и я проснусь!", "One chore and I will wake up!", "Μία δουλειά και ξυπνάω!"]
  ],
  comfortLow: [
    ["В норе стало немного пыльно. Одно маленькое дело — и сразу уютнее.", "It has got a little dusty in the burrow. One small chore and it is cosier at once.", "Η φωλιά γέμισε λίγη σκόνη. Μία μικρή δουλειά και γίνεται αμέσως πιο ζεστή."],
    ["Мне не хватает порядка. Может, вместе наведёте чистоту?", "I miss some order. Maybe you could tidy up together?", "Μου λείπει η τάξη. Μήπως καθαρίσετε μαζί;"],
    ["Посуда зовёт! Кто заметит первым?", "The dishes are calling! Who will notice first?", "Τα πιάτα φωνάζουν! Ποιος θα το προσέξει πρώτος;"],
    ["Давайте выберем одно дело и сделаем его вдвоём.", "Let's pick one chore and do it together.", "Ας διαλέξουμε μία δουλειά και ας την κάνουμε μαζί."],
    ["Уют просел. Достаточно одного дела, чтобы вернуть.", "Cosiness has dipped. One chore is enough to bring it back.", "Η ζεστασιά έπεσε. Αρκεί μία δουλειά για να επιστρέψει."]
  ],
  careLow: [
    ["Давно не было тёплых слов. Скажете друг другу что-нибудь приятное?", "There have not been warm words for a while. Will you say something nice to each other?", "Έχουν να ειπωθούν τρυφερά λόγια εδώ και καιρό. Θα πείτε κάτι ωραίο ο ένας στον άλλον;"],
    ["Мне кажется, пора послать «спасибо».", "I think it is time to send a “thank you”.", "Νομίζω ότι ήρθε η ώρα για ένα «ευχαριστώ»."],
    ["Одна реакция на отметку партнёра — и в норе станет теплее.", "One reaction to your partner's mark and the burrow gets warmer.", "Μία αντίδραση στη σημείωση του ταιριού σας και η φωλιά ζεσταίνεται."],
    ["Загляните во вкладку «Тепло»?", "How about a look at the Warmth tab?", "Ρίξτε μια ματιά στην καρτέλα «Ζεστασιά»;"],
    ["Тёплое слово ничего не стоит, а согревает надолго.", "A warm word costs nothing and warms for long.", "Ένα τρυφερό λόγο δεν κοστίζει τίποτα και ζεσταίνει για πολύ."]
  ],
  closeLow: [
    ["Давно не играли вместе. Может, колесо свиданий?", "You have not played together for a while. How about the date wheel?", "Έχετε καιρό να παίξετε μαζί. Τι θα λέγατε για τον τροχό ραντεβού;"],
    ["Как насчёт «Угадай ответ»? Мне любопытно, кто кого лучше знает.", "How about “Guess the answer”? I am curious who knows whom better.", "Τι θα λέγατε για το «Μάντεψε την απάντηση»; Θέλω να δω ποιος ξέρει καλύτερα τον άλλον."],
    ["Сделайте что-нибудь вдвоём: любое дело, но вместе.", "Do something together: any chore, but together.", "Κάντε κάτι μαζί: οποιαδήποτε δουλειά, αλλά μαζί."],
    ["Вечер без телефонов? Я не против!", "An evening without phones? I do not mind!", "Μια βραδιά χωρίς κινητά; Δεν έχω αντίρρηση!"],
    ["Близости не хватает. Придумайте свидание на двоих.", "Closeness is running low. Plan a date for two.", "Λείπει η οικειότητα. Σκεφτείτε ένα ραντεβού για δύο."]
  ],
  partnerBusy: [
    ["У {name} сегодня отметок: {n}. Скажете спасибо?", "{name} has marked {n} today. Will you say thanks?", "Ο/Η {name} έχει σημειώσει σήμερα {n}. Θα πείτε ευχαριστώ;"],
    ["Сегодня у {name} отметок: {n}. Это заметно!", "{name} has {n} marks today. It shows!", "Ο/Η {name} έχει σήμερα {n} σημειώσεις. Φαίνεται!"],
    ["Отметок от {name} сегодня: {n}. Может, ответите реакцией?", "{n} marks from {name} today. How about answering with a reaction?", "{n} σημειώσεις από τον/την {name} σήμερα. Τι θα λέγατε για μια αντίδραση;"]
  ],
  flame: [
    ["Огонёк пары горит: серия {n}. Горжусь нами!", "The flame of the pair is burning: a streak of {n}. I am proud of us!", "Η φλόγα του ζευγαριού καίει: σερί {n}. Νιώθω περηφάνια για μας!"],
    ["Вы оба здесь день за днём (серия {n}). Это и есть тепло.", "You are both here day after day (streak {n}). That is what warmth is.", "Είστε και οι δύο εδώ μέρα με τη μέρα (σερί {n}). Αυτή είναι η ζεστασιά."],
    ["Серия {n}! Не дайте огоньку погаснуть.", "A streak of {n}! Do not let the flame go out.", "Σερί {n}! Μην αφήσετε τη φλόγα να σβήσει."]
  ],
  invisible: [
    ["Сегодня кто-то заметил и спланировал дело. Это тоже работа!", "Today someone noticed and planned a chore. That is work too!", "Σήμερα κάποιος πρόσεξε και σχεδίασε μια δουλειά. Κι αυτό είναι δουλειά!"],
    ["Помнить о делах — тоже труд. Спасибо, что замечаете.", "Remembering chores is effort too. Thank you for noticing.", "Το να θυμάσαι τις δουλειές είναι κόπος. Ευχαριστώ που προσέχετε."],
    ["Заметить дело — это уже половина дела.", "Noticing a chore is half of the chore.", "Να προσέξεις μια δουλειά είναι το μισό της δουλειάς."],
    ["Невидимая работа теперь видна. Так держать!", "Invisible work is now visible. Keep it up!", "Η αόρατη δουλειά τώρα φαίνεται. Συνεχίστε έτσι!"]
  ],
  together: [
    ["Вдвоём вдвое веселее! Я это люблю.", "Twice the fun together! I love that.", "Μαζί είναι διπλά πιο διασκεδαστικά! Το λατρεύω."],
    ["Вы делали дело вместе — в копилке двойные звёзды.", "You did a chore together, so the pot gets double stars.", "Κάνατε μια δουλειά μαζί, οπότε ο κουμπαράς παίρνει διπλά αστέρια."],
    ["Командная работа! Я хлопаю лапками.", "Teamwork! I am clapping my paws.", "Ομαδική δουλειά! Χειροκροτώ με τα πατουσάκια μου."],
    ["Когда вы вместе, мне особенно тепло.", "When you are together, I feel especially warm.", "Όταν είστε μαζί, νιώθω ιδιαίτερη ζεστασιά."]
  ]
};

// Album cards: what the milestone is
export const MILESTONE_TEXT = {
  xp100: ["Первые 100 звёзд вдвоём", "The first 100 stars together", "Τα πρώτα 100 αστέρια μαζί"],
  xp500: ["500 звёзд вдвоём", "500 stars together", "500 αστέρια μαζί"],
  xp1000: ["1000 звёзд вдвоём", "1000 stars together", "1000 αστέρια μαζί"],
  teen: ["Питомец подрос", "The pet has grown up a bit", "Το κατοικίδιο μεγάλωσε λίγο"],
  adult: ["Питомец стал взрослым", "The pet is grown-up", "Το κατοικίδιο έγινε ενήλικας"],
  wise: ["Мудрый хранитель норы", "The wise keeper of the burrow", "Ο σοφός φύλακας της φωλιάς"],
  flame7: ["Огонёк горит неделю", "The flame burned for a week", "Η φλόγα έκαιγε μια εβδομάδα"],
  flame30: ["Огонёк горит месяц", "The flame burned for a month", "Η φλόγα έκαιγε έναν μήνα"],
  together1: ["Первое дело вдвоём", "The first chore done together", "Η πρώτη δουλειά μαζί"],
  together10: ["Десять дел вдвоём", "Ten chores done together", "Δέκα δουλειές μαζί"],
  signals1: ["Первые тёплые слова", "The first warm words", "Τα πρώτα τρυφερά λόγια"],
  signals50: ["Пятьдесят тёплых слов и реакций", "Fifty warm words and reactions", "Πενήντα τρυφερά λόγια και αντιδράσεις"],
  reveals1: ["Первая игра, где ответили оба", "The first game you both answered", "Το πρώτο παιχνίδι που απαντήσατε και οι δύο"],
  matches1: ["Первое совпадение в «Карте желаний»", "The first match in the “Wish map”", "Η πρώτη σύμπτωση στον «Χάρτη επιθυμιών»"],
  bought1: ["Первая общая покупка", "The first purchase together", "Η πρώτη κοινή αγορά"],
  decor5: ["Нора обжита: пять предметов", "The burrow is lived in: five items", "Η φωλιά έχει γεμίσει: πέντε αντικείμενα"]
};
