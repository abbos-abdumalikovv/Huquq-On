# Mutolaa — kitobxonlar platformasi

Oʻqing, kuzating, xulosa yozing va ulashing. Toʻliq ishlaydigan veb-ilova: Node.js (Express) + SQLite, frontend — build bosqichisiz toza HTML/CSS/JS.

## Ishga tushirish

```bash
cd mutolaa
npm install
npm start          # http://localhost:3000
```

Node.js **22.13+** kerak (oʻrnatilgan `node:sqlite` ishlatiladi, alohida baza oʻrnatish shart emas).
Birinchi ishga tushganda baza namunaviy kitoblar, oʻquvchilar va xulosalar bilan toʻldiriladi.
Demo hisob: **demo / demo1234**.

| Oʻzgaruvchi | Vazifasi | Standart |
|---|---|---|
| `PORT` | server porti | `3000` |
| `DB_PATH` | SQLite fayli manzili | `data/mutolaa.db` |
| `NODE_ENV=production` | cookie'ga `Secure` qoʻshadi (HTTPS) | — |

`npm run seed` — bazani tozalab, namunaviy maʼlumotlarni qayta yuklaydi.

## Imkoniyatlar

- **Lenta** — Substack uslubidagi xulosalar: Yangi / Obunalar / Ommabop, yoqtirish, izoh, saqlab qoʻyish.
- **Muharrir** — chalgʻitmaydigan yozish muhiti: sarlavha, iqtibos, roʻyxat, qalin/kursiv, qoralamani avtomatik saqlash.
- **Kitoblar** — qidiruv, janrlar, saralash, kitob qoʻshish; har bir kitobda baho, taqrizlar, oʻquvchilar va xulosalar.
- **Javonim** — Oʻqimoqchiman / Oʻqiyapman / Oʻqib boʻldim, sahifa boʻyicha jarayon, yillik maqsad.
- **Kunlik mutolaa** — «Oʻqiganimni belgilash», kunlik maqsad halqasi, haftalik grafik, uzilmas seriya.
- **Reyting** — sahifalar, kitoblar va seriya boʻyicha; hafta / oy / barcha vaqt; oʻz oʻrningiz.
- **Profil** — statistika, daraja, mutolaa xaritasi (heatmap), yutuqlar, obuna boʻlish.
- Yorugʻ va tungi mavzu, telefon va kompyuterga moslashgan interfeys.

## Tuzilishi

```
server.js      API va statik fayllar
db.js          SQLite sxemasi va yordamchilar
seed.js        namunaviy maʼlumotlar
public/        index.html, styles.css, js/ (core, views, app)
```

## Joylashtirish (masalan, Render)

Root directory: `mutolaa`, build: `npm install`, start: `npm start`.
Maʼlumotlar saqlanib qolishi uchun doimiy disk ulang va `DB_PATH` ni oʻsha diskka yoʻnaltiring.
