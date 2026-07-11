// Middleware — это функция, которая выполняется перед основным
// обработчиком запроса. Здесь мы решаем две задачи:
// 1) identifyOwner — определяем, кто делает запрос: залогиненный
//    пользователь или гость, и даём каждому уникальный "ключ"
//    для корзины (owner_key).
// 2) requireAuth — защищает роуты, которые доступны только
//    залогиненным пользователям (аккаунт, избранное).

const crypto = require('crypto');

// Определяем владельца корзины: если пользователь залогинен —
// используем "user:ID", если гость — генерируем случайный id
// и сохраняем его в сессии (cookie), чтобы при следующих
// запросах браузер присылал тот же самый id.
function identifyOwner(req, res, next) {
  if (req.session.userId) {
    req.ownerKey = `user:${req.session.userId}`;
  } else {
    if (!req.session.guestId) {
      req.session.guestId = crypto.randomBytes(12).toString('hex');
    }
    req.ownerKey = `guest:${req.session.guestId}`;
  }
  next();
}

// Проверка, что пользователь залогинен. Если нет — возвращаем 401
// (Unauthorized), фронтенд должен на это отреагировать и
// перенаправить на страницу входа.
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Необходимо войти в аккаунт' });
  }
  next();
}

module.exports = { identifyOwner, requireAuth };
