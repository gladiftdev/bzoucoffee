// routes/orders.js — إنشاء الطلبات، تتبعها، وتحديث حالتها لحظياً
const express = require('express');
const db = require('../db');

const VALID_STATUSES = ['new', 'preparing', 'ready', 'completed'];

// نستقبل io (اتصال socket.io) عشان نبعث تحديثات لحظية لكل من فتح لوحة صاحب المقهى أو شاشة تتبع الزبون
module.exports = function ordersRouter(io) {
  const router = express.Router();

  function serializeOrder(row) {
    return {
      id: row.id,
      tableNumber: row.table_number,
      items: JSON.parse(row.items),
      total: row.total,
      status: row.status,
      createdAt: row.created_at,
    };
  }

  // GET /api/orders?status=new,preparing  → قائمة الطلبات (لوحة صاحب المقهى تستعملها عند فتح الصفحة)
  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    res.json(rows.map(serializeOrder));
  });

  // GET /api/orders/:id  → طلب واحد (شاشة "طلبي" عند الزبون تستعملها للتحديث الأولي)
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
    res.json(serializeOrder(row));
  });

  // POST /api/orders  → الزبون يؤكد طلبه من التطبيق
  // body: { tableNumber: 7, items: [{ name, qty, price, size, sugar }] }
  router.post('/', (req, res) => {
    const { tableNumber, items } = req.body;

    if (!tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'رقم الطاولة وعناصر الطلب مطلوبة' });
    }

    const total = items.reduce((sum, it) => sum + (it.price * it.qty), 0);

    const insert = db.prepare(
      `INSERT INTO orders (table_number, items, total, status) VALUES (?, ?, ?, 'new')`
    );
    const result = insert.run(tableNumber, JSON.stringify(items), total);

    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    const order = serializeOrder(row);

    // نبلّغ لوحة صاحب المقهى فوراً بطلب جديد
    io.emit('order:new', order);

    res.status(201).json(order);
  });

  // PATCH /api/orders/:id/status  → صاحب المقهى يحرّك الطلب بين الأعمدة (جديد → قيد التحضير → جاهز → تم التسليم)
  // body: { status: 'preparing' }
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `الحالة يجب أن تكون واحدة من: ${VALID_STATUSES.join(', ')}` });
    }

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'الطلب غير موجود' });

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const order = serializeOrder(row);

    // نبلّغ الجميع (لوحة صاحب المقهى + شاشة تتبع الزبون) بالتحديث
    io.emit('order:updated', order);

    res.json(order);
  });

  return router;
};
