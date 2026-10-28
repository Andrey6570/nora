// Privacy policy and terms of use, shown in the app and built into legal/*.html for a public address
// (tools/build-legal.mjs). Highlighted <mark> parts must be filled in before a public release, and the texts
// should be reviewed by a lawyer. Change POLICY_VERSION in config.js when the meaning changes.

const OWNER = { ru: "<mark>[Имя или название компании]</mark>", en: "<mark>[Name or company name]</mark>", el: "<mark>[Όνομα ή επωνυμία εταιρείας]</mark>" };
const ADDRESS = { ru: "<mark>[Адрес, Кипр]</mark>", en: "<mark>[Address, Cyprus]</mark>", el: "<mark>[Διεύθυνση, Κύπρος]</mark>" };
const EMAIL = "<mark>[email@example.com]</mark>";
const DPA = `<a href="https://www.dataprotection.gov.cy" target="_blank" rel="noopener">www.dataprotection.gov.cy</a>`;

export const LEGAL = {
  privacy: {
    ru: { title: "Политика конфиденциальности", updated: "Действует с 28 октября 2026 г.", sections: [
      ["Кто отвечает за данные", `Оператор данных приложения «Нора» — ${OWNER.ru}, ${ADDRESS.ru}. По любым вопросам о данных пишите на ${EMAIL}.`],
      ["Какие данные мы обрабатываем", `<ul>
        <li><b>Учётная запись Google:</b> идентификатор, адрес почты и имя из профиля Google. Их хранит сервис входа Firebase Authentication.</li>
        <li><b>Имя в приложении,</b> которое вы указали сами.</li>
        <li><b>Данные пары:</b> код приглашения, дела (название, время, сложность, повтор), отметки этапов с датой и временем, звёзды и общая копилка.</li>
        <li><b>Питомец пары:</b> его вид и имя, которые вы выбрали, купленные предметы норы и общие счётчики (опыт, «огонёк» пары, число общих дел, тёплых слов и игр), по которым питомец растёт и собирается альбом.</li>
        <li><b>Игры:</b> ваши ответы в играх «Угадай ответ» и «Карта желаний» (хранятся приватно, партнёр видит их только по правилам игры: оба ответа вместе или только совпадение), купоны, которые вы дарите, и прогресс «30 дней близости».</li>
        <li><b>Награды:</b> названия и цены наград, которые вы добавили, и ваши покупки с датой.</li>
        <li><b>Реакции и тёплые слова,</b> которые вы отправляете партнёру: какая именно, когда и к какому делу.</li>
        <li><b>Данные для уведомлений</b> (только в приложении для Android и только если вы разрешили уведомления): токен вашего устройства и язык интерфейса.</li>
        <li><b>Настройки:</b> язык, а также версия и дата вашего согласия с этой политикой.</li>
        <li><b>Технические журналы</b> Google (например, IP-адрес при обращении к серверу) — для безопасности работы сервиса.</li>
      </ul>Мы не собираем геолокацию, контакты, фотографии и рекламные идентификаторы, не используем аналитику и рекламу.`],
      ["Зачем и на каком основании", `<ul>
        <li>Чтобы приложение работало: вход, пара, дела и звёзды — исполнение договора с вами (ст. 6(1)(b) GDPR).</li>
        <li>Защита от злоупотреблений и безопасность — наш законный интерес (ст. 6(1)(f) GDPR).</li>
        <li>Хранение записи о вашем согласии — исполнение обязанности подтверждать соблюдение GDPR (ст. 6(1)(c) и 7(1) GDPR).</li>
      </ul>`],
      ["Кто видит ваши данные", `<ul>
        <li><b>Ваш партнёр по паре</b> видит ваше имя в приложении, дела, отметки, звёзды, реакции и тёплые слова. Ваша почта партнёру не показывается.</li>
        <li><b>Google</b> (Firebase: Authentication, Cloud Firestore, Cloud Functions, Cloud Messaging для уведомлений) обрабатывает данные по нашему поручению как обработчик. Данные хранятся в Европейском союзе (регионы eur3 и europe-west1). Если отдельные данные передаются в США, передача основана на EU-US Data Privacy Framework и стандартных договорных условиях ЕС.</li>
      </ul>Мы не продаём данные и не передаём их третьим лицам для рекламы.`],
      ["Сколько мы храним данные", `<ul>
        <li>Пока у вас есть учётная запись.</li>
        <li>Если вы выйдете из пары, ваше имя и отметки остаются в её истории, пока пара существует или пока вы не удалите учётную запись.</li>
        <li>При удалении учётной записи («Настройки → Удалить аккаунт») мы сразу удаляем ваш профиль, имя в паре и запись входа. Ваши отметки остаются в истории пары без имени, только с техническим идентификатором, и удаляются вместе с парой.</li>
        <li>Токен устройства для уведомлений удаляется, когда вы выходите из аккаунта или из пары, удаляете аккаунт, а также когда Google сообщает, что токен больше не действует.</li>
        <li>Когда из пары вышли оба партнёра, пара удаляется со всеми делами и отметками автоматически.</li>
        <li>Технические журналы и резервные копии Google удаляются в сроки, установленные Google.</li>
      </ul>`],
      ["Ваши права", `По GDPR вы можете запросить доступ к своим данным и их копию, исправление, удаление, ограничение обработки, перенос данных, а также возразить против обработки и отозвать согласие. Удалить учётную запись можно в самом приложении; остальные запросы присылайте на ${EMAIL}. Мы отвечаем в течение одного месяца. Вы также вправе подать жалобу в надзорный орган: на Кипре это Уполномоченный по защите персональных данных (${DPA}), или в орган вашей страны в ЕС.`],
      ["Возраст", "«Нора» предназначена только для людей старше 18 лет. Мы сознательно не обрабатываем данные несовершеннолетних."],
      ["Безопасность", "Доступ к данным пары есть только у двух её участников: это проверяют правила базы данных на сервере. Звёзды начисляет только сервер. Соединение с сервером шифруется."],
      ["Изменения политики", "Если политика изменится по существу, мы покажем это в приложении и при необходимости попросим согласие заново. Действующая версия всегда доступна в «Настройках»."]
    ] },
    en: { title: "Privacy policy", updated: "Effective from 28 October 2026", sections: [
      ["Who is responsible for your data", `The data controller for the Nora app is ${OWNER.en}, ${ADDRESS.en}. For any question about your data, write to ${EMAIL}.`],
      ["What data we process", `<ul>
        <li><b>Google account:</b> identifier, email address and name from your Google profile, stored by the Firebase Authentication sign-in service.</li>
        <li><b>Your name in the app,</b> which you enter yourself.</li>
        <li><b>Pair data:</b> invite code, chores (title, time, difficulty, repeat), stage marks with date and time, stars and the shared pot.</li>
        <li><b>The pair's pet:</b> its kind and name that you choose, the burrow items you buy and shared counters (experience, the pair's “flame”, the number of joint chores, warm words and games) from which the pet grows and the album is filled.</li>
        <li><b>Games:</b> your answers in “Guess the answer” and “Wish map” (stored privately; your partner sees them only as the game's rules allow: both answers together, or only a match), coupons you give and the progress of “30 days of closeness”.</li>
        <li><b>Rewards:</b> titles and prices of the rewards you add, and your purchases with their date.</li>
        <li><b>Reactions and warm words</b> you send to your partner: which one, when and to which chore.</li>
        <li><b>Notification data</b> (Android app only, and only if you allow notifications): your device's token and the interface language.</li>
        <li><b>Settings:</b> language, and the version and date of your consent to this policy.</li>
        <li><b>Technical logs</b> kept by Google (for example, the IP address of a request to the server) for the security of the service.</li>
      </ul>We do not collect location, contacts, photos or advertising identifiers, and we use no analytics or advertising.`],
      ["Why and on what legal basis", `<ul>
        <li>To run the app — sign-in, the pair, chores and stars — performance of our contract with you (Art. 6(1)(b) GDPR).</li>
        <li>Security and protection against abuse — our legitimate interest (Art. 6(1)(f) GDPR).</li>
        <li>Keeping a record of your consent — our duty to demonstrate GDPR compliance (Art. 6(1)(c) and 7(1) GDPR).</li>
      </ul>`],
      ["Who sees your data", `<ul>
        <li><b>Your partner in the pair</b> sees your name in the app, chores, marks, stars, reactions and warm words. Your email is not shown to them.</li>
        <li><b>Google</b> (Firebase: Authentication, Cloud Firestore, Cloud Functions, Cloud Messaging for notifications) processes data on our behalf as a processor. Data is stored in the European Union (regions eur3 and europe-west1). Where some data is transferred to the United States, the transfer relies on the EU-US Data Privacy Framework and the EU Standard Contractual Clauses.</li>
      </ul>We do not sell data or share it with third parties for advertising.`],
      ["How long we keep data", `<ul>
        <li>As long as you have an account.</li>
        <li>If you leave a pair, your name and marks stay in its history while the pair exists or until you delete your account.</li>
        <li>When you delete your account (Settings → Delete account), we immediately delete your profile, your name in the pair and your sign-in record. Your marks stay in the pair's history without your name, only with a technical identifier, and are deleted together with the pair.</li>
        <li>Your device's notification token is deleted when you sign out, leave the pair or delete your account, and when Google reports that the token is no longer valid.</li>
        <li>When both partners have left a pair, it is deleted automatically with all its chores and marks.</li>
        <li>Technical logs and Google's backups are deleted within the periods set by Google.</li>
      </ul>`],
      ["Your rights", `Under the GDPR you may request access to your data and a copy of it, rectification, erasure, restriction of processing and data portability, object to processing and withdraw consent. You can delete your account in the app itself; send other requests to ${EMAIL}. We reply within one month. You also have the right to lodge a complaint with a supervisory authority: in Cyprus, the Commissioner for Personal Data Protection (${DPA}), or the authority of your EU country.`],
      ["Age", "Nora is intended only for people aged 18 and over. We do not knowingly process data of minors."],
      ["Security", "Only the two members of a pair can access its data; database rules on the server enforce this. Only the server awards stars. The connection to the server is encrypted."],
      ["Changes to this policy", "If this policy changes materially, we will show it in the app and ask for consent again where required. The current version is always available in Settings."]
    ] },
    el: { title: "Πολιτική απορρήτου", updated: "Ισχύει από 28 Οκτωβρίου 2026", sections: [
      ["Υπεύθυνος επεξεργασίας", `Υπεύθυνος επεξεργασίας για την εφαρμογή Νόρα είναι ${OWNER.el}, ${ADDRESS.el}. Για οποιαδήποτε ερώτηση σχετικά με τα δεδομένα σας, γράψτε στο ${EMAIL}.`],
      ["Ποια δεδομένα επεξεργαζόμαστε", `<ul>
        <li><b>Λογαριασμός Google:</b> αναγνωριστικό, διεύθυνση email και όνομα από το προφίλ Google, που αποθηκεύονται από την υπηρεσία σύνδεσης Firebase Authentication.</li>
        <li><b>Το όνομά σας στην εφαρμογή,</b> το οποίο εισάγετε εσείς.</li>
        <li><b>Δεδομένα ζευγαριού:</b> κωδικός πρόσκλησης, δουλειές (τίτλος, χρόνος, δυσκολία, επανάληψη), σημειώσεις σταδίων με ημερομηνία και ώρα, αστέρια και κοινός κουμπαράς.</li>
        <li><b>Το κατοικίδιο του ζευγαριού:</b> το είδος και το όνομα που επιλέγετε, τα αντικείμενα της φωλιάς που αγοράζετε και κοινοί μετρητές (εμπειρία, η «φλόγα» του ζευγαριού, ο αριθμός κοινών δουλειών, τρυφερών λόγων και παιχνιδιών) από τους οποίους μεγαλώνει το κατοικίδιο και γεμίζει το άλμπουμ.</li>
        <li><b>Παιχνίδια:</b> οι απαντήσεις σας στα «Μάντεψε την απάντηση» και «Χάρτης επιθυμιών» (αποθηκεύονται ιδιωτικά· το ταίρι σας τις βλέπει μόνο όπως ορίζουν οι κανόνες του παιχνιδιού: και οι δύο απαντήσεις μαζί ή μόνο μια σύμπτωση), τα κουπόνια που χαρίζετε και η πρόοδος των «30 ημερών οικειότητας».</li>
        <li><b>Ανταμοιβές:</b> τίτλοι και τιμές των ανταμοιβών που προσθέτετε και οι αγορές σας με την ημερομηνία τους.</li>
        <li><b>Αντιδράσεις και τρυφερά λόγια</b> που στέλνετε στο ταίρι σας: ποιο, πότε και σε ποια δουλειά.</li>
        <li><b>Δεδομένα ειδοποιήσεων</b> (μόνο στην εφαρμογή Android και μόνο αν επιτρέψετε ειδοποιήσεις): το διακριτικό (token) της συσκευής σας και η γλώσσα της εφαρμογής.</li>
        <li><b>Ρυθμίσεις:</b> γλώσσα, καθώς και η έκδοση και η ημερομηνία της συναίνεσής σας σε αυτή την πολιτική.</li>
        <li><b>Τεχνικά αρχεία καταγραφής</b> της Google (για παράδειγμα, η διεύθυνση IP ενός αιτήματος προς τον διακομιστή) για την ασφάλεια της υπηρεσίας.</li>
      </ul>Δεν συλλέγουμε τοποθεσία, επαφές, φωτογραφίες ή διαφημιστικά αναγνωριστικά και δεν χρησιμοποιούμε αναλυτικά εργαλεία ή διαφημίσεις.`],
      ["Για ποιο σκοπό και με ποια νομική βάση", `<ul>
        <li>Για τη λειτουργία της εφαρμογής — σύνδεση, ζευγάρι, δουλειές και αστέρια — εκτέλεση της σύμβασης μαζί σας (άρθρο 6 παρ. 1 στοιχ. β΄ ΓΚΠΔ).</li>
        <li>Ασφάλεια και προστασία από καταχρήσεις — έννομο συμφέρον μας (άρθρο 6 παρ. 1 στοιχ. στ΄ ΓΚΠΔ).</li>
        <li>Τήρηση αρχείου της συναίνεσής σας — υποχρέωσή μας να αποδεικνύουμε τη συμμόρφωση με τον ΓΚΠΔ (άρθρα 6 παρ. 1 στοιχ. γ΄ και 7 παρ. 1 ΓΚΠΔ).</li>
      </ul>`],
      ["Ποιος βλέπει τα δεδομένα σας", `<ul>
        <li><b>Το ταίρι σας στο ζευγάρι</b> βλέπει το όνομά σας στην εφαρμογή, τις δουλειές, τις σημειώσεις, τα αστέρια, τις αντιδράσεις και τα τρυφερά λόγια. Το email σας δεν εμφανίζεται.</li>
        <li><b>Η Google</b> (Firebase: Authentication, Cloud Firestore, Cloud Functions, Cloud Messaging για ειδοποιήσεις) επεξεργάζεται δεδομένα για λογαριασμό μας ως εκτελών την επεξεργασία. Τα δεδομένα αποθηκεύονται στην Ευρωπαϊκή Ένωση (περιοχές eur3 και europe-west1). Όπου ορισμένα δεδομένα διαβιβάζονται στις Ηνωμένες Πολιτείες, η διαβίβαση βασίζεται στο Πλαίσιο Προστασίας Δεδομένων ΕΕ-ΗΠΑ και στις Τυποποιημένες Συμβατικές Ρήτρες της ΕΕ.</li>
      </ul>Δεν πωλούμε δεδομένα και δεν τα κοινοποιούμε σε τρίτους για διαφήμιση.`],
      ["Για πόσο διατηρούμε τα δεδομένα", `<ul>
        <li>Όσο διατηρείτε λογαριασμό.</li>
        <li>Αν αποχωρήσετε από ένα ζευγάρι, το όνομα και οι σημειώσεις σας παραμένουν στο ιστορικό του όσο υπάρχει το ζευγάρι ή μέχρι να διαγράψετε τον λογαριασμό σας.</li>
        <li>Με τη διαγραφή του λογαριασμού (Ρυθμίσεις → Διαγραφή λογαριασμού) διαγράφουμε αμέσως το προφίλ σας, το όνομά σας στο ζευγάρι και το αρχείο σύνδεσης. Οι σημειώσεις σας παραμένουν στο ιστορικό του ζευγαριού χωρίς όνομα, μόνο με τεχνικό αναγνωριστικό, και διαγράφονται μαζί με το ζευγάρι.</li>
        <li>Το διακριτικό ειδοποιήσεων της συσκευής σας διαγράφεται όταν αποσυνδέεστε, αποχωρείτε από το ζευγάρι ή διαγράφετε τον λογαριασμό σας, καθώς και όταν η Google αναφέρει ότι το διακριτικό δεν ισχύει πλέον.</li>
        <li>Όταν αποχωρήσουν και τα δύο μέλη, το ζευγάρι διαγράφεται αυτόματα με όλες τις δουλειές και τις σημειώσεις.</li>
        <li>Τα τεχνικά αρχεία καταγραφής και τα αντίγραφα ασφαλείας της Google διαγράφονται εντός των προθεσμιών που ορίζει η Google.</li>
      </ul>`],
      ["Τα δικαιώματά σας", `Σύμφωνα με τον ΓΚΠΔ μπορείτε να ζητήσετε πρόσβαση στα δεδομένα σας και αντίγραφό τους, διόρθωση, διαγραφή, περιορισμό της επεξεργασίας και φορητότητα, να αντιταχθείτε στην επεξεργασία και να ανακαλέσετε τη συναίνεσή σας. Μπορείτε να διαγράψετε τον λογαριασμό σας μέσα από την εφαρμογή· τα υπόλοιπα αιτήματα στείλτε στο ${EMAIL}. Απαντούμε εντός ενός μηνός. Έχετε επίσης δικαίωμα να υποβάλετε καταγγελία σε εποπτική αρχή: στην Κύπρο, στον Επίτροπο Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (${DPA}), ή στην αρχή της χώρας σας στην ΕΕ.`],
      ["Ηλικία", "Η Νόρα προορίζεται μόνο για άτομα άνω των 18 ετών. Δεν επεξεργαζόμαστε εν γνώσει μας δεδομένα ανηλίκων."],
      ["Ασφάλεια", "Πρόσβαση στα δεδομένα ενός ζευγαριού έχουν μόνο τα δύο μέλη του· αυτό το επιβάλλουν οι κανόνες της βάσης δεδομένων στον διακομιστή. Τα αστέρια απονέμονται μόνο από τον διακομιστή. Η σύνδεση με τον διακομιστή είναι κρυπτογραφημένη."],
      ["Αλλαγές στην πολιτική", "Αν η πολιτική αλλάξει ουσιωδώς, θα το εμφανίσουμε στην εφαρμογή και, όπου απαιτείται, θα ζητήσουμε ξανά συναίνεση. Η ισχύουσα έκδοση είναι πάντα διαθέσιμη στις Ρυθμίσεις."]
    ] }
  },
  terms: {
    ru: { title: "Условия использования", updated: "Действуют с 28 октября 2026 г.", sections: [
      ["О сервисе", `«Нора» — бесплатное приложение для пар, в котором двое отмечают домашние дела и получают виртуальные звёзды. Сервис предоставляет ${OWNER.ru}, ${ADDRESS.ru} (${EMAIL}).`],
      ["Кто может пользоваться", "Только люди старше 18 лет. Входя в приложение, вы подтверждаете свой возраст и принимаете эти условия и политику конфиденциальности."],
      ["Учётная запись и пара", "Вы входите через свою учётную запись Google и отвечаете за её безопасность. В паре может быть два человека. Код приглашения передавайте только тому, с кем хотите играть: по нему можно присоединиться к вашей паре, пока в ней есть свободное место."],
      ["Ваши материалы", "Вы отвечаете за то, что вводите в приложение: имя и названия дел. Не вводите чужие персональные данные, оскорбления и незаконное содержимое. Ваш партнёр видит то, что вы вводите."],
      ["Звёзды", "Звёзды и копилка — игровые очки. У них нет денежной стоимости, их нельзя продать, обменять на деньги или передать вне пары."],
      ["Доступность", "Мы стараемся, чтобы приложение работало без перебоев, но не гарантируем этого. Мы можем менять функции приложения, в том числе правила начисления звёзд."],
      ["Ответственность", "Приложение предоставляется «как есть». В пределах, допустимых законом, мы не отвечаем за косвенные убытки. Ничто в этих условиях не ограничивает ваши права потребителя, которые нельзя ограничить по закону."],
      ["Прекращение", "Вы можете в любой момент выйти из пары или удалить учётную запись в «Настройках». Мы можем ограничить доступ при нарушении этих условий."],
      ["Право и споры", "Условия регулируются правом Республики Кипр. Если вы потребитель из другой страны ЕС, за вами сохраняется защита обязательных норм вашей страны."],
      ["Изменения", "Если условия изменятся по существу, мы сообщим об этом в приложении. Продолжая пользоваться приложением после изменения, вы принимаете новые условия."]
    ] },
    en: { title: "Terms of use", updated: "Effective from 28 October 2026", sections: [
      ["About the service", `Nora is a free app for couples in which two people mark household chores and earn virtual stars. The service is provided by ${OWNER.en}, ${ADDRESS.en} (${EMAIL}).`],
      ["Who may use it", "Only people aged 18 and over. By signing in you confirm your age and accept these terms and the privacy policy."],
      ["Account and pair", "You sign in with your Google account and are responsible for keeping it secure. A pair can have two people. Share the invite code only with the person you want to play with: anyone with it can join your pair while there is a free place."],
      ["Your content", "You are responsible for what you enter in the app: your name and chore titles. Do not enter other people's personal data, insults or unlawful content. Your partner sees what you enter."],
      ["Stars", "Stars and the pot are game points. They have no monetary value and cannot be sold, exchanged for money or transferred outside the pair."],
      ["Availability", "We do our best to keep the app running without interruption but do not guarantee it. We may change the app's features, including how stars are awarded."],
      ["Liability", "The app is provided “as is”. To the extent permitted by law, we are not liable for indirect losses. Nothing in these terms limits consumer rights that cannot be limited by law."],
      ["Termination", "You may leave the pair or delete your account at any time in Settings. We may restrict access if these terms are breached."],
      ["Law and disputes", "These terms are governed by the law of the Republic of Cyprus. If you are a consumer in another EU country, you keep the protection of the mandatory rules of your country."],
      ["Changes", "If these terms change materially, we will tell you in the app. By continuing to use the app after a change, you accept the new terms."]
    ] },
    el: { title: "Όροι χρήσης", updated: "Ισχύουν από 28 Οκτωβρίου 2026", sections: [
      ["Σχετικά με την υπηρεσία", `Η Νόρα είναι μια δωρεάν εφαρμογή για ζευγάρια, στην οποία δύο άτομα σημειώνουν δουλειές του σπιτιού και κερδίζουν εικονικά αστέρια. Την υπηρεσία παρέχει ${OWNER.el}, ${ADDRESS.el} (${EMAIL}).`],
      ["Ποιος μπορεί να τη χρησιμοποιεί", "Μόνο άτομα άνω των 18 ετών. Με τη σύνδεση επιβεβαιώνετε την ηλικία σας και αποδέχεστε αυτούς τους όρους και την πολιτική απορρήτου."],
      ["Λογαριασμός και ζευγάρι", "Συνδέεστε με τον λογαριασμό σας Google και είστε υπεύθυνοι για την ασφάλειά του. Ένα ζευγάρι μπορεί να έχει δύο άτομα. Δώστε τον κωδικό πρόσκλησης μόνο στο άτομο με το οποίο θέλετε να παίξετε: όποιος τον έχει μπορεί να μπει στο ζευγάρι σας όσο υπάρχει ελεύθερη θέση."],
      ["Το περιεχόμενό σας", "Είστε υπεύθυνοι για ό,τι εισάγετε στην εφαρμογή: το όνομά σας και τους τίτλους των δουλειών. Μην εισάγετε προσωπικά δεδομένα άλλων, προσβολές ή παράνομο περιεχόμενο. Το ταίρι σας βλέπει ό,τι εισάγετε."],
      ["Αστέρια", "Τα αστέρια και ο κουμπαράς είναι πόντοι παιχνιδιού. Δεν έχουν χρηματική αξία και δεν μπορούν να πωληθούν, να ανταλλαχθούν με χρήματα ή να μεταβιβαστούν εκτός του ζευγαριού."],
      ["Διαθεσιμότητα", "Καταβάλλουμε κάθε προσπάθεια ώστε η εφαρμογή να λειτουργεί χωρίς διακοπές, αλλά δεν το εγγυόμαστε. Μπορούμε να αλλάζουμε τις λειτουργίες της εφαρμογής, μεταξύ άλλων τον τρόπο απονομής των αστεριών."],
      ["Ευθύνη", "Η εφαρμογή παρέχεται «ως έχει». Στο μέτρο που επιτρέπει ο νόμος, δεν ευθυνόμαστε για έμμεσες ζημίες. Τίποτα σε αυτούς τους όρους δεν περιορίζει δικαιώματα καταναλωτή που δεν μπορούν να περιοριστούν κατά τον νόμο."],
      ["Λήξη", "Μπορείτε οποτεδήποτε να αποχωρήσετε από το ζευγάρι ή να διαγράψετε τον λογαριασμό σας στις Ρυθμίσεις. Μπορούμε να περιορίσουμε την πρόσβαση σε περίπτωση παραβίασης αυτών των όρων."],
      ["Δίκαιο και διαφορές", "Οι όροι διέπονται από το δίκαιο της Κυπριακής Δημοκρατίας. Αν είστε καταναλωτής σε άλλη χώρα της ΕΕ, διατηρείτε την προστασία των υποχρεωτικών διατάξεων της χώρας σας."],
      ["Αλλαγές", "Αν οι όροι αλλάξουν ουσιωδώς, θα σας ενημερώσουμε στην εφαρμογή. Συνεχίζοντας να χρησιμοποιείτε την εφαρμογή μετά από μια αλλαγή, αποδέχεστε τους νέους όρους."]
    ] }
  }
};
