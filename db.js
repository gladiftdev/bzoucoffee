// db.js — قاعدة البيانات (SQLite المدمجة في Node.js، بدون تثبيت أي حزمة خارجية)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, 'khalil.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,      -- 'قهوة' أو 'مخبوزات'
    price REAL NOT NULL,
    sizes TEXT,                  -- JSON array أو NULL لو ما فيه أحجام
    has_sugar INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER NOT NULL,
    items TEXT NOT NULL,         -- JSON array لعناصر الطلب [{name, qty, price, size, sugar}]
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',  -- new -> preparing -> ready -> completed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seedMenuIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM menu_items').get();
  if (c > 0) return;

  const insert = db.prepare(
    `INSERT INTO menu_items (name, category, price, sizes, has_sugar) VALUES (?, ?, ?, ?, ?)`
  );
  const items = [
    ['حليب',       'قهوة',     12, JSON.stringify(['صغير', 'كبير']), 1],
    ['نص نص',      'قهوة',     8,  JSON.stringify(['صغير', 'كبير']), 1],
    ['طاليان',     'قهوة',     10, null, 1],
    ['نورمال',     'قهوة',     7,  null, 1],
    ['كابوتشينو',  'قهوة',     14, JSON.stringify(['صغير', 'كبير']), 1],
    ['كافي كريم',  'قهوة',     10, null, 1],
    ['مسمن',       'مخبوزات',  6,  null, 0],
    ['حرشة',       'مخبوزات',  6,  null, 0],
    ['باسطة',      'مخبوزات',  5,  null, 0],
  ];
  for (const item of items) insert.run(...item);
  console.log(`✔ تمت إضافة ${items.length} عناصر افتراضية للقائمة`);
}

seedMenuIfEmpty();

module.exports = db;
