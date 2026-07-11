// Роуты каталога товаров: список с фильтрами, один товар, категории.

const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/products — список товаров с фильтрами, поиском, сортировкой и пагинацией
router.get('/', (req, res) => {
  const {
    category, minPrice, maxPrice, size, color, search,
    sort, page = 1, limit = 12,
  } = req.query;

  // В SQL-запросе оставляем только те фильтры, где регистр не важен
  // (категория/размер/цвет у нас всегда хранятся в одном регистре).
  // Поиск по названию/описанию делаем в JavaScript, а не через SQL LOWER() —
  // встроенная функция LOWER() в SQLite умеет приводить к нижнему регистру
  // только латинские буквы и ломается на кириллице (например "Футболка"
  // не превращается в "футболка"). JS-метод .toLowerCase() работает
  // с кириллицей правильно.
  const conditions = [];
  const params = {};

  if (category) {
    conditions.push('category = @category');
    params.category = category;
  }
  if (minPrice) {
    conditions.push('price >= @minPrice');
    params.minPrice = Number(minPrice);
  }
  if (maxPrice) {
    conditions.push('price <= @maxPrice');
    params.maxPrice = Number(maxPrice);
  }
  if (size) {
    conditions.push('size = @size');
    params.size = size;
  }
  if (color) {
    conditions.push('color = @color');
    params.color = color;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let products = db.prepare(`SELECT * FROM products ${whereClause}`).all(params);

  // Поиск — фильтруем в JavaScript, с учётом кириллицы
  if (search) {
    const query = search.toLowerCase();
    products = products.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }

  // Сортировка — разрешаем только конкретные безопасные варианты
  if (sort === 'price_asc') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    products.sort((a, b) => b.price - a.price);
  } else {
    // newest по умолчанию
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const total = products.length;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const offset = (pageNum - 1) * limitNum;

  const pageItems = products.slice(offset, offset + limitNum);

  res.json({ products: pageItems, total, page: pageNum, limit: limitNum });
});

// GET /api/products/:id — один товар со всеми деталями
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }
  res.json(product);
});

module.exports = router;
