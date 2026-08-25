// routes/menu.js — واجهة برمجية لقراءة قائمة المقهى
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/menu  → إرجاع كل عناصر القائمة
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM menu_items ORDER BY category, id').all();
  const items = rows.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    sizes: row.sizes ? JSON.parse(row.sizes) : null,
    hasSugar: !!row.has_sugar,
  }));
  res.json(items);
});

module.exports = router;
