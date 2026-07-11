// Роуты корзины. Работает и для гостей, и для залогиненных —
// req.ownerKey уже вычислен в middleware identifyOwner (см. server.js)

const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Достаём содержимое корзины вместе с данными о товаре (название, цена)
function getCartWithDetails(ownerKey) {
  const items = db.prepare(`
    SELECT cart_items.id as cart_item_id, cart_items.quantity,
           products.id as product_id, products.name, products.price,
           products.category, products.size, products.color
    FROM cart_items
    JOIN products ON products.id = cart_items.product_id
    WHERE cart_items.owner_key = ?
  `).all(ownerKey);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, total };
}

// GET /api/cart — содержимое корзины
router.get('/', (req, res) => {
  res.json(getCartWithDetails(req.ownerKey));
});

// POST /api/cart — добавить товар в корзину
router.post('/', (req, res) => {
  const { product_id, quantity = 1 } = req.body;

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  // Если товар уже есть в корзине этого пользователя — увеличиваем количество,
  // а не создаём новую строку
  const existing = db.prepare(
    'SELECT id, quantity FROM cart_items WHERE owner_key = ? AND product_id = ?'
  ).get(req.ownerKey, product_id);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
      .run(existing.quantity + Number(quantity), existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (owner_key, product_id, quantity) VALUES (?, ?, ?)')
      .run(req.ownerKey, product_id, quantity);
  }

  res.status(201).json(getCartWithDetails(req.ownerKey));
});

// PATCH /api/cart/:itemId — изменить количество
router.patch('/:itemId', (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Количество должно быть не меньше 1' });
  }

  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND owner_key = ?')
    .get(req.params.itemId, req.ownerKey);
  if (!item) {
    return res.status(404).json({ error: 'Позиция не найдена в вашей корзине' });
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, item.id);
  res.json(getCartWithDetails(req.ownerKey));
});

// DELETE /api/cart/:itemId — удалить одну позицию
router.delete('/:itemId', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND owner_key = ?')
    .run(req.params.itemId, req.ownerKey);
  res.json(getCartWithDetails(req.ownerKey));
});

// DELETE /api/cart — очистить всю корзину
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE owner_key = ?').run(req.ownerKey);
  res.json({ items: [], total: 0 });
});

module.exports = router;
