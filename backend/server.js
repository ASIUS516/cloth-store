// Главный файл сервера. Отсюда запускается весь сайт.
// Запуск: npm start

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');

const db = require('./db/database');
const seedDatabase = require('./db/seed');
const { identifyOwner, requireAuth } = require('./middleware/auth');

const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
const wishlistRouter = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 3000;
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (productCount === 0) {
  console.log('База пустая — автоматически заполняю тестовыми товарами...');
  seedDatabase();
}

// Разрешаем сайту принимать JSON в теле запросов (например, данные формы)
app.use(express.json());

// CORS — на всякий случай, если фронт будет открываться отдельно от бэкенда
app.use(cors({ origin: true, credentials: true }));

// Сессии — благодаря этому сервер "запоминает" пользователя между
// запросами через cookie в браузере (нужно для логина и гостевой корзины)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 дней
    httpOnly: true,
  },
}));

// Определяем владельца корзины (гость или пользователь) для каждого запроса
app.use(identifyOwner);

// Раздаём статические файлы фронтенда (html, css, js) из папки /frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Проверка живости сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Список уникальных категорий товаров (для фильтров на фронте)
app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products').all();
  res.json(rows.map((r) => r.category));
});

// Подключаем роуты
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/wishlist', requireAuth, wishlistRouter);

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
