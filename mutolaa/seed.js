// Namunaviy maʼlumotlar: baza boʻsh boʻlsa avtomatik toʻldiriladi.
// `npm run seed` — bazani tozalab, qaytadan toʻldiradi.
import crypto from 'node:crypto';
import { db, get, run, today, addDays, hueOf, hashPass } from './db.js';

const BOOKS = [
  ['Oʻtkan kunlar', 'Abdulla Qodiriy', 400, 'Roman', 1925, 'Oʻzbek adabiyotining ilk romani. Otabek va Kumushning muhabbati fonida XIX asr Turkistonining ijtimoiy hayoti, eskilik va yangilik oʻrtasidagi kurash tasvirlanadi.'],
  ['Mehrobdan chayon', 'Abdulla Qodiriy', 288, 'Roman', 1929, 'Qoʻqon xonligi davridagi saroy fitnalari, Anvar va Raʼnoning sof muhabbati hamda adolatsizlikka qarshi turgan halol inson haqida roman.'],
  ['Kecha va kunduz', 'Choʻlpon', 320, 'Roman', 1936, 'Zebi taqdiri orqali mustamlaka davridagi oʻzbek ayolining fojiasi va jamiyatning uygʻonish arafasidagi manzarasi.'],
  ['Yulduzli tunlar', 'Pirimqul Qodirov', 544, 'Tarixiy roman', 1978, 'Zahiriddin Muhammad Boburning murakkab hayot yoʻli: taxt uchun kurash, yoʻqotishlar, sheʼriyat va buyuk saltanatning barpo etilishi.'],
  ['Ikki eshik orasi', 'Oʻtkir Hoshimov', 624, 'Roman', 1986, 'Urush yillari va undan keyingi davrda bir necha avlod taqdiri. Har bir bob alohida qahramon tilidan hikoya qilinadi.'],
  ['Dunyoning ishlari', 'Oʻtkir Hoshimov', 224, 'Qissa', 1982, 'Ona haqidagi eng samimiy asarlardan biri. Bolalik xotiralari, mehr va kechikkan minnatdorchilik haqida novellalar turkumi.'],
  ['Shum bola', 'Gʻafur Gʻulom', 176, 'Qissa', 1936, 'Uydan qochgan shum bolaning sarguzashtlari — kulgi ortida davrning achchiq haqiqati yashiringan.'],
  ['Sariq devni minib', 'Xudoyberdi Toʻxtaboyev', 256, 'Sarguzasht', 1968, 'Hoshimjon sehrli qalpoqcha yordamida oson hayot izlaydi, ammo bilim va mehnatsiz hech narsaga erishib boʻlmasligini tushunadi.'],
  ['Ufq', 'Said Ahmad', 720, 'Roman', 1974, 'Urush davri front ortidagi oʻzbek qishlogʻi hayoti, Katta Fargʻona kanali qurilishi va oddiy odamlarning matonati haqida trilogiya.'],
  ['Boburnoma', 'Zahiriddin Muhammad Bobur', 480, 'Memuar', 1530, 'Jahon adabiyotidagi eng yorqin memuarlardan biri: tarix, geografiya, tabiat va inson ruhiyatining halol kundaligi.'],
  ['Jinoyat va jazo', 'Fyodor Dostoyevskiy', 608, 'Roman', 1866, 'Raskolnikovning nazariyasi va vijdon azobi. Jinoyatdan keyin boshlanadigan haqiqiy jazo — insonning oʻzi bilan yolgʻiz qolishi.'],
  ['Urush va tinchlik', 'Lev Tolstoy', 1300, 'Roman', 1869, 'Napoleon urushlari davridagi Rossiya: bir necha oila taqdiri orqali tarix, muhabbat va hayot mazmuni haqidagi epopeya.'],
  ['1984', 'Jorj Oruell', 328, 'Antiutopiya', 1949, 'Toʻliq nazorat ostidagi jamiyat, haqiqatni qayta yozish va erkin fikrning qadri haqida ogohlantiruvchi roman.'],
  ['Alkimyogar', 'Paulo Koelo', 208, 'Roman', 1988, 'Choʻpon Santyagoning xazina izlab qilgan safari — oʻz orzusiga ergashish va yoʻlning oʻzi xazina ekani haqida rivoyat.'],
  ['Kichkina shahzoda', 'Antuan de Sent-Ekzyuperi', 96, 'Ertak-qissa', 1943, 'Kattalar uchun yozilgan bolalar ertagi: doʻstlik, masʼuliyat va eng muhim narsalar koʻzga koʻrinmasligi haqida.'],
  ['Atom odatlar', 'Jeyms Klir', 320, 'Shaxsiy rivojlanish', 2018, 'Kichik oʻzgarishlar qanday qilib katta natijalarga olib kelishi haqida amaliy qoʻllanma: odat halqasi va tizimlar kuchi.'],
  ['Sapiens', 'Yuval Noy Harari', 512, 'Ilmiy-ommabop', 2011, 'Insoniyatning qisqacha tarixi: kognitiv, agrar va ilmiy inqiloblar bizni qanday qilib bugungi holatga keltirgani haqida.'],
  ['Boy ota, kambagʻal ota', 'Robert Kiyosaki', 336, 'Moliya', 1997, 'Pulga boʻlgan ikki xil qarash: aktiv va passiv farqi, moliyaviy savodxonlikning ahamiyati.'],
  ['Oq kema', 'Chingiz Aytmatov', 160, 'Qissa', 1970, 'Ertaklarga ishongan yetti yashar bola va uning sof dunyosining kattalar shafqatsizligi bilan toʻqnashuvi.'],
  ['Asrga tatigulik kun', 'Chingiz Aytmatov', 432, 'Roman', 1980, 'Edigey Boʻronning bir kunlik dafn safari orqali xotira, manqurtlik va inson qadri haqidagi falsafiy roman.'],
  ['Martin Iden', 'Jek London', 480, 'Roman', 1909, 'Oddiy dengizchining yozuvchi boʻlish yoʻlidagi mashaqqatli mehnati va orzuga erishgandan keyingi boʻshliq.'],
  ['Yuz yil tanholik', 'Gabriel Garsiya Markes', 448, 'Roman', 1967, 'Buendia oilasining yetti avlodi va Makondo shaharchasi tarixi — sehrli realizmning durdonasi.'],
  ['Inson maʼno izlab', 'Viktor Frankl', 200, 'Psixologiya', 1946, 'Konslagerdan omon chiqqan psixiatrning xotiralari va logoterapiya asoslari: har qanday sharoitda maʼno topish mumkin.'],
  ['Chol va dengiz', 'Ernest Xeminguey', 112, 'Qissa', 1952, 'Keksa baliqchi Santyagoning ulkan baliq bilan olishuvi. «Insonni yoʻq qilish mumkin, ammo yengib boʻlmaydi».'],
];

// [username, ism, bio, kunlik maqsad, yillik maqsad, oʻqish ehtimoli, oxirgi kunlardagi seriya, kunlik sahifa oraligʻi]
const USERS = [
  ['demo', 'Mehmon Kitobxon', 'Mutolaa bilan tanishish uchun namunaviy sahifa.', 30, 24, 0.62, 6, [14, 46]],
  ['dilnoza', 'Dilnoza Karimova', 'Filolog. Oʻzbek nasri va jahon klassikasi shaydosi.', 40, 30, 0.86, 41, [25, 70]],
  ['jasur', 'Jasur Toʻxtayev', 'Dasturchi. Kechqurunlari non-fikshn oʻqiyman.', 25, 20, 0.7, 12, [15, 50]],
  ['madina', 'Madina Yoʻldosheva', 'Psixolog. Kitob — eng yaxshi suhbatdosh.', 30, 24, 0.78, 19, [20, 55]],
  ['bekzod', 'Bekzod Rahimov', 'Tarix oʻqituvchisi, Bobur ixlosmandi.', 30, 18, 0.66, 3, [20, 60]],
  ['sevara', 'Sevara Aliyeva', 'Talaba. Har oy kamida ikkita kitob.', 20, 24, 0.58, 8, [12, 40]],
  ['otabek', 'Otabek Nazarov', 'Tadbirkor. Ertalab 5 da — kitob va qahva.', 20, 15, 0.5, 0, [10, 35]],
  ['nigora', 'Nigora Saidova', 'Tarjimon. Sekin oʻqish tarafdoriman.', 15, 12, 0.72, 27, [8, 28]],
  ['sardor', 'Sardor Ergashev', 'Shifokor. Navbatchilik orasida ham oʻqiyman.', 20, 12, 0.42, 2, [10, 45]],
];

const REVIEWS = [
  'Bir oʻtirishda oʻqib chiqdim. Uzoq vaqt taʼsiridan chiqa olmadim.',
  'Har bir bobidan keyin toʻxtab, oʻylab qolasan. Qayta oʻqishga arziydi.',
  'Tili ravon, voqealar tez rivojlanadi. Tavsiya qilaman.',
  'Boshi biroz ogʻir boshlanadi, lekin sabr qilgan odam mukofotini oladi.',
  'Bu kitobni maktabdayoq oʻqishim kerak edi. Kech boʻlsa ham — yaxshi.',
  'Qahramonlar shu qadar jonliki, kitob tugagach sogʻinib qolasan.',
  'Kutganimdek chiqmadi, ammo bir-ikki fikri uchun oʻqishga arziydi.',
  'Yonimda qalam bilan oʻqidim — tagiga chizilgan joylar juda koʻp.',
];

const POSTS = [
  ['dilnoza', 'Oʻtkan kunlar', 'Otabek nega yutqazdi?', '«Oʻtkan kunlar»ni oʻn yildan keyin qayta oʻqib anglaganlarim',
    `<p>Maktabda bu romanni muhabbat qissasi deb oʻqiganmiz. Kumush, Otabek, Zaynab — uchburchak. Oʻn yil oʻtib qayta ochganimda esa butunlay boshqa kitobni koʻrdim: bu — <b>jim turishning bahosi</b> haqidagi roman ekan.</p>
<h2>Itoat ham tanlov</h2>
<p>Otabek aqlli, dunyo koʻrgan, zamonasidan oldinda yuradigan yigit. Ammo ota-onasi ikkinchi uylanishni talab qilganda u «yoʻq» deya olmaydi. Qodiriy bu yerda qahramonini ayamaydi: yaxshi odam boʻlish yetarli emas, yaxshilikni himoya qila bilish ham kerak.</p>
<blockquote>Moziyga qaytib ish koʻrish xayrlik, deydilar.</blockquote>
<p>Shu birgina jumla bilan Qodiriy butun romanning kalitini beradi. U oʻtmishni ideallashtirmaydi — u oʻtmishdan saboq chiqarishga chaqiradi.</p>
<h2>Uchta xulosa</h2>
<ul><li>Eng katta fojialar yovuzlikdan emas, «el nima deydi»dan tugʻiladi.</li><li>Zaynab — yovuz emas, u ham oʻsha tizimning qurboni.</li><li>Sevgi uchun kurashmagan odam uni yoʻqotishga rozi boʻlgan boʻladi.</li></ul>
<p>Agar bu kitobni faqat maktabda oʻqigan boʻlsangiz, yana bir bor oʻqing. U siz bilan birga ulgʻaygan.</p>`],
  ['jasur', 'Atom odatlar', 'Maqsad emas, tizim', '«Atom odatlar»dan hayotimga koʻchgan toʻrtta qoida',
    `<p>Men har yanvarda roʻyxat tuzardim: sport, ingliz tili, oyiga toʻrtta kitob. Fevralga borib roʻyxat ham, gʻayrat ham yoʻqolardi. Jeyms Klirning kitobi muammo irodada emas, <b>tizimda</b> ekanini koʻrsatdi.</p>
<h2>1. Bir foiz qoidasi</h2>
<p>Har kuni bir foizga yaxshilansangiz, bir yilda oʻttiz yetti barobar oʻsasiz. Bu raqamning oʻzi emas, gʻoyasi muhim: katta sakrash emas, kichik va toʻxtovsiz qadam yutadi.</p>
<h2>2. Kim boʻlishni tanlang</h2>
<p>«Kitob oʻqimoqchiman» emas, «men kitobxonman». Odat — shaxsiyatga berilgan ovoz. Har oʻqilgan sahifa yangi «men» uchun bitta ovoz.</p>
<blockquote>Siz maqsadlaringiz darajasiga koʻtarilmaysiz, tizimlaringiz darajasiga tushasiz.</blockquote>
<h2>3. Ikki daqiqa qoidasi</h2>
<p>Yangi odat ikki daqiqadan oshmasligi kerak. «Har kuni 30 sahifa» emas — «har kuni bitta sahifa». Boshlash odatga aylangach, davomi oʻzi keladi.</p>
<h2>4. Zanjirni uzmang</h2>
<p>Bir kun oʻtkazib yuborish — tasodif. Ikki kun — yangi odatning boshlanishi. Shuning uchun Mutolaadagi seriyamni koʻz qorachigʻidek asrayman: bugun 12-kun.</p>`],
  ['madina', 'Inson maʼno izlab', 'Azobning ham maʼnosi boʻlsa', 'Viktor Frankl oʻrgatgan eng ogʻir va eng kerakli saboq',
    `<p>Bu kitobni psixolog sifatida emas, oddiy inson sifatida oʻqidim. Frankl toʻrtta konslagerni boshidan kechirgan. Oilasidan deyarli hech kim qolmagan. Shunga qaramay u nafrat haqida emas, <b>maʼno</b> haqida yozadi.</p>
<blockquote>Insondan hamma narsani tortib olish mumkin, faqat bittasidan tashqari: har qanday sharoitda oʻz munosabatini tanlash erkinligi.</blockquote>
<p>Frankl kuzatgan narsa oddiy va shafqatsiz: lagerda eng baquvvatlar emas, kutadigan kishisi yoki tugatadigan ishi borlar omon qolgan. «Nima uchun» yashashni bilgan odam har qanday «qanday»ga chidaydi.</p>
<h2>Bugun uchun nima oladi?</h2>
<p>Biz baxtni quvamiz, Frankl esa baxtni quvib boʻlmasligini aytadi — u maʼnoli ishning <i>oqibati</i> sifatida keladi. Mijozlarim bilan ishlaganda endi «nima sizni baxtli qiladi?» deb emas, «hayot sizdan hozir nimani kutyapti?» deb soʻrayman.</p>
<p>Ikki yuz sahifalik kichik kitob. Ammo undan keyin shikoyat qilish biroz uyat boʻlib qoladi.</p>`],
  ['bekzod', 'Yulduzli tunlar', 'Bobur: yutqazib ulgʻaygan podshoh', 'Tarix darsida aytilmaydigan Bobur',
    `<p>Oʻquvchilarimga Boburni «buyuk sarkarda» deb oʻrgatamiz. Pirimqul Qodirov esa boshqa Boburni koʻrsatadi: oʻn ikki yoshida taxtga oʻtirgan, Samarqandni uch marta olib uch marta boy bergan, qishda togʻlarda yalangoyoq yurgan oʻspirin.</p>
<h2>Magʻlubiyat — maktab</h2>
<p>Roman Boburning gʻalabalarini emas, yoʻqotishlarini batafsil yozadi. Va aynan shu yoʻqotishlar uni shakllantiradi. Samarqandni yoʻqotmaganida, ehtimol, Hindistongacha bormagan boʻlardi.</p>
<blockquote>Har kimki vafo qilsa, vafo topqusidir.</blockquote>
<p>Meni eng koʻp hayratga solgani — Bobur eng ogʻir kunlarida ham yozishdan toʻxtamaydi. Sheʼr, kundalik, kuzatuv. «Boburnoma» shu odatdan tugʻilgan. Qilich saltanat berdi, qalam esa abadiyat.</p>
<p>Romandan keyin albatta «Boburnoma»ning oʻzini oʻqing — ikkisi bir-birini toʻldiradi.</p>`],
  ['nigora', 'Kichkina shahzoda', 'Sekin oʻqish sanʼati', 'Toʻqson olti sahifani bir oy oʻqidim — va afsuslanmayman',
    `<p>Biz tez oʻqish bilan maqtanamiz: haftasiga kitob, yiliga ellikta. Men bu yil teskarisini sinab koʻrdim. «Kichkina shahzoda»ni har kuni atigi uch-toʻrt sahifadan, bir oy davomida oʻqidim.</p>
<p>Tarjimon sifatida bilaman: Ekzyuperining har bir jumlasi oʻlchab qoʻyilgan. Tez oʻqiganda ular shunchaki chiroyli gap boʻlib oʻtib ketadi. Sekin oʻqiganda esa — savolga aylanadi.</p>
<blockquote>Eng muhim narsani koʻz bilan koʻrib boʻlmaydi, uni faqat qalb bilan his qilish mumkin.</blockquote>
<h2>Sekin oʻqish uchun uch odat</h2>
<ol><li>Bir oʻtirishda oz, lekin har kuni oʻqing.</li><li>Yoqqan jumlani qoʻlda koʻchirib yozing — qoʻl xotirasi kuchli.</li><li>Bobni tugatgach, bir daqiqa kitobni yopib jim oʻtiring.</li></ol>
<p>Reytingda men sahifalar boʻyicha hech qachon birinchi boʻlmayman. Ammo seriyam uzilmaydi — sekin, lekin har kuni.</p>`],
  ['sevara', '1984', '1984 bugun haqidami?', 'Oruell bashorat qilmagan, ogohlantirgan edi',
    `<p>Kursdoshlarim bu kitobni «zerikarli siyosat» deb oʻqishmadi. Men esa telefonimni chetga qoʻyib, ikki kechada tugatdim va endi oʻsha telefonga boshqacha qarayapman.</p>
<h2>Katta ogʻa emas, kichik ekran</h2>
<p>Oruell dunyosida odamlarni majburan kuzatishadi. Bizda esa hamma oʻz ixtiyori bilan hayotini ekranga yuklaydi. Farq bor, albatta. Lekin bitta savol umumiy: <b>oʻz fikrim qayerda tugaydi va menga singdirilgan fikr qayerdan boshlanadi?</b></p>
<blockquote>Erkinlik — ikki karra ikki toʻrt ekanini ayta olish huquqidir.</blockquote>
<p>Kitobdagi eng qoʻrqinchli gʻoya qiynoq emas, «yangi til». Soʻzlar kamaysa, fikr ham torayadi. Shundan beri oʻqiyotganimda notanish soʻzlarni yozib boryapman — lugʻatim qancha boy boʻlsa, oʻylashim shuncha erkin.</p>`],
  ['dilnoza', 'Dunyoning ishlari', 'Onamga aytolmagan gaplarim', 'Oʻtkir Hoshimovni oʻqib, telefon qilgan kecha',
    `<p>Bu kitob haqida tahlil yozib boʻlmaydi. Uni oʻqiysiz, yopasiz va onangizga qoʻngʻiroq qilasiz. Men ham shunday qildim — soat tungi oʻn birda.</p>
<p>Hoshimov katta voqealar haqida yozmaydi. Issiq non, yamoq solingan koʻylak, bemor bola tepasida oʻtgan tun. Ammo aynan shu mayda tafsilotlar yurakni ezadi, chunki har birimizning xotiramizda xuddi shundaylari bor.</p>
<blockquote>Onaning koʻngli — dengiz.</blockquote>
<p>Kitobdan olgan yagona, ammo eng muhim xulosam: minnatdorchilikni keyinga qoldirmang. «Keyin» degan vaqt hamisha ham kelavermaydi.</p>`],
];

const COMMENTS = [
  'Juda toʻgʻri yozibsiz, men ham xuddi shunday his qilganman.',
  'Rahmat! Shu xulosadan keyin kitobni roʻyxatimga qoʻshdim.',
  'Ikkinchi fikringizga qoʻshilmayman, lekin oʻylab koʻrishga arziydi.',
  'Iqtibos zoʻr tanlangan. Daftarimga koʻchirib oldim.',
  'Koʻpdan beri shunday samimiy xulosa oʻqimagandim.',
  'Qayta oʻqish haqidagi gapingiz rost — kitob biz bilan birga oʻzgaradi.',
];

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedIfEmpty(force = false) {
  if (!force && get(`SELECT COUNT(*) n FROM users`).n > 0) return;
  const rand = rng(20261112);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const t = today();
  const iso = (day, h = 9) => `${day}T${String(h + Math.floor(rand() * 10)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00.000Z`;

  db.exec('BEGIN');
  for (const tb of ['follows', 'comments', 'bookmarks', 'likes', 'posts', 'reading_logs', 'shelves', 'sessions', 'books', 'users']) db.exec(`DELETE FROM ${tb}`);

  const bookId = {};
  for (const [title, author, pages, genre, year, description] of BOOKS) {
    const r = run(`INSERT INTO books(title,author,pages,genre,year,description,hue,created_at) VALUES(?,?,?,?,?,?,?,?)`,
      title, author, pages, genre, year, description, hueOf(title), iso(addDays(t, -200)));
    bookId[title] = { id: Number(r.lastInsertRowid), pages };
  }
  const titles = BOOKS.map((b) => b[0]);

  const userId = {};
  for (const [username, name, bio, daily, yearly, prob, streak, range] of USERS) {
    const salt = crypto.randomBytes(12).toString('hex');
    const pass = username === 'demo' ? 'demo1234' : crypto.randomBytes(12).toString('hex');
    const u = Number(run(`INSERT INTO users(username,name,bio,pass_hash,salt,color,daily_goal,year_goal,created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
      username, name, bio, hashPass(pass, salt), salt, hueOf(name), daily, yearly, iso(addDays(t, -170))).lastInsertRowid);
    userId[username] = u;

    // Oʻqish tarixini kunma-kun simulyatsiya qilamiz.
    const authored = POSTS.filter((p) => p[0] === username).map((p) => p[1]);
    const queue = [...authored, ...titles.filter((x) => !authored.includes(x)).sort(() => rand() - 0.5)].filter((x) => bookId[x].pages < 800);
    let qi = 0, cur = 0, started = null;
    for (let d = -150; d <= 0 && qi < queue.length; d++) {
      const day = addDays(t, d);
      if (!(d > -streak || (d !== -streak && rand() < prob))) continue;
      const b = bookId[queue[qi]];
      let n = Math.min(b.pages - cur, Math.round(range[0] + rand() * (range[1] - range[0])));
      if (d === 0 && username === 'demo') n = Math.min(n, 12);
      started ??= iso(day);
      cur += n;
      run(`INSERT INTO reading_logs VALUES(?,?,?,?)`, u, b.id, day, n);
      if (cur >= b.pages) {
        const fin = iso(day, 12);
        run(`INSERT INTO shelves VALUES(?,?,?,?,?,?,?,?,?)`, u, b.id, 'done', b.pages, rand() < 0.85 ? 3 + Math.floor(rand() * 2.6) : 0,
          rand() < 0.45 ? pick(REVIEWS) : '', started, fin, fin);
        qi++; cur = 0; started = null;
      }
    }
    if (qi < queue.length && cur > 0) {
      run(`INSERT INTO shelves VALUES(?,?,?,?,0,'',?,NULL,?)`, u, bookId[queue[qi]].id, 'reading', cur, started, iso(t, 3));
      qi++;
    }
    for (const title of queue.slice(qi, qi + 2 + Math.floor(rand() * 2)))
      run(`INSERT INTO shelves VALUES(?,?,?,0,0,'',NULL,NULL,?)`, u, bookId[title].id, 'want', iso(addDays(t, -Math.floor(rand() * 20))));
  }

  const names = Object.keys(userId);
  POSTS.forEach(([username, book, title, subtitle, body], i) => {
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = text.slice(0, 240).replace(/\s+\S*$/, '') + '…';
    const created = iso(addDays(t, -(POSTS.length - i) * 3 + 1));
    const pid = Number(run(`INSERT INTO posts(user_id,book_id,title,subtitle,body,excerpt,read_min,created_at) VALUES(?,?,?,?,?,?,?,?)`,
      userId[username], bookId[book].id, title, subtitle, body, excerpt, Math.max(1, Math.round(text.split(' ').length / 180)), created).lastInsertRowid);
    const others = names.filter((n) => n !== username);
    for (const n of others) if (rand() < 0.62) run(`INSERT INTO likes VALUES(?,?)`, userId[n], pid);
    const cs = others.filter((n) => n !== 'demo').sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 3));
    cs.forEach((n, k) => run(`INSERT INTO comments(post_id,user_id,body,created_at) VALUES(?,?,?,?)`, pid, userId[n], COMMENTS[(i * 2 + k) % COMMENTS.length], iso(addDays(created.slice(0, 10), 1))));
  });

  for (const a of names) for (const b of names) if (a !== b && rand() < (b === 'dilnoza' ? 0.85 : 0.4)) run(`INSERT OR IGNORE INTO follows VALUES(?,?)`, userId[a], userId[b]);
  db.exec('COMMIT');
  console.log('Namunaviy maʼlumotlar yuklandi (kirish: demo / demo1234)');
}

if (process.argv.includes('--force')) seedIfEmpty(true);
