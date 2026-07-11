// Роуты регистрации, входа и выхода из аккаунта.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

// POST /api/auth/register — регистрация нового пользователя
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Заполните имя, email и пароль' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }

  // Проверяем, что такой email ещё не зарегистрирован
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  // Хэшируем пароль — в базе никогда не хранится "открытый" текст пароля.
  // bcrypt сам добавляет случайную "соль", поэтому одинаковые пароли
  // у разных людей дают разные хэши.
  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), passwordHash, name);

  const userId = result.lastInsertRowid;

  // Переносим гостевую корзину (если она была) на аккаунт пользователя
  if (req.session.guestId) {
    db.prepare('UPDATE cart_items SET owner_key = ? WHERE owner_key = ?')
      .run(`user:${userId}`, `guest:${req.session.guestId}`);
  }

  // Сразу логиним пользователя — создаём сессию
  req.session.userId = userId;

  res.status(201).json({ id: userId, email: email.toLowerCase(), name });
});

// POST /api/auth/login — вход в аккаунт
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  // Сравниваем введённый пароль с хэшем из базы
  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  // Переносим гостевую корзину на аккаунт при входе
  if (req.session.guestId) {
    db.prepare('UPDATE cart_items SET owner_key = ? WHERE owner_key = ?')
      .run(`user:${user.id}`, `guest:${req.session.guestId}`);
  }

  req.session.userId = user.id;

  res.json({ id: user.id, email: user.email, name: user.name });
});

// POST /api/auth/logout — выход из аккаунта
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/me — вернуть данные текущего пользователя (если залогинен)
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  res.json(user);
});

module.exports = router;
