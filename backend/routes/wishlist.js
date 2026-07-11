// Роуты избранного (wishlist). Доступны только залогиненным
// пользователям — requireAuth подключается в server.js.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/wishlist — список избранных товаров
router.get('/', (req, res) => {
  const items = db.prepare(`
    SELECT products.* FROM wishlist_items
    JOIN products ON products.id = wishlist_items.product_id
    WHERE wishlist_items.user_id = ?
    ORDER BY wishlist_items.created_at DESC
  `).all(req.session.userId);
  res.json(items);
});

// POST /api/wishlist — добавить товар в избранное
router.post('/', (req, res) => {
  const { product_id } = req.body;

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  const existing = db.prepare(
    'SELECT id FROM wishlist_items WHERE user_id = ? AND product_id = ?'
  ).get(req.session.userId, product_id);

  if (!existing) {
    db.prepare('INSERT INTO wishlist_items (user_id, product_id) VALUES (?, ?)')
      .run(req.session.userId, product_id);
  }

  res.status(201).json({ success: true });
});

// DELETE /api/wishlist/:productId — убрать товар из избранного
router.delete('/:productId', (req, res) => {
  db.prepare('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?')
    .run(req.session.userId, req.params.productId);
  res.json({ success: true });
});

module.exports = router;
