// Этот файл отвечает за подключение к базе данных SQLite.
// SQLite — это база данных в виде одного файла (database.db),
// не нужно ставить отдельный сервер базы данных.
//
// Используем node:sqlite — модуль, встроенный прямо в Node.js
// (начиная с версии 22.5). Он не требует компиляции и лишних
// установок, в отличие от пакета better-sqlite3, которому для
// установки нужны компиляторы C++ (Visual Studio на Windows).

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Путь к файлу базы данных — он появится в корне проекта
const DB_PATH = path.join(__dirname, '..', '..', 'database.db');

// Открываем (или создаём, если не существует) базу данных
const db = new DatabaseSync(DB_PATH);

// Включаем проверку внешних ключей (чтобы, например, нельзя было
// добавить в корзину несуществующий товар)
db.exec('PRAGMA foreign_keys = ON');

// Применяем схему (создаём таблицы, если их ещё нет)
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

module.exports = db;
