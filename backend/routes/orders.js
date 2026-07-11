// Роуты оформления заказа. Это ТЕСТОВЫЙ checkout — без подключения
// реальной оплаты. Заказ сразу получает статус "confirmed".

const express = require('express');
const db = require('../db/database');

const router = express.Router();

// POST /api/orders/checkout — оформить заказ из текущей корзины
router.post('/checkout', (req, res) => {
  const { shipping_name, shipping_address, shipping_phone } = req.body;

  if (!shipping_name || !shipping_address || !shipping_phone) {
    return res.status(400).json({ error: 'Заполните имя, адрес и телефон' });
  }

  const cartItems = db.prepare(`
    SELECT cart_items.quantity, products.id as product_id, products.name, products.price
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.owner_key = ?
  `).all(req.ownerKey);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Корзина пуста — нечего оформлять' });
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Всё оборачиваем в транзакцию вручную (BEGIN/COMMIT/ROLLBACK):
  // либо весь заказ создаётся целиком, либо (при ошибке) не
  // создаётся вообще ничего. node:sqlite не имеет готовой обёртки
  // db.transaction(), как в better-sqlite3, поэтому делаем это сами.
  let orderId;
  db.exec('BEGIN');
  try {
    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, total_price, status, shipping_name, shipping_address, shipping_phone)
      VALUES (?, ?, 'confirmed', ?, ?, ?)
    `).run(req.session.userId || null, total, shipping_name, shipping_address, shipping_phone);

    orderId = orderResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, quantity, price_at_purchase)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of cartItems) {
      insertItem.run(orderId, item.product_id, item.name, item.quantity, item.price);
    }

    // Очищаем корзину после успешного оформления
    db.prepare('DELETE FROM cart_items WHERE owner_key = ?').run(req.ownerKey);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  res.status(201).json({ ...order, items });
});

// GET /api/orders — список заказов текущего пользователя (нужен логин)
router.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Войдите в аккаунт, чтобы увидеть заказы' });
  }
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.session.userId);
  res.json(orders);
});

// GET /api/orders/:id — детали одного заказа
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

module.exports = router;
