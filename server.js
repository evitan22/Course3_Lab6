const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const NodeCache = require('node-cache');

// Імпорти для роботи з базою даних (колишній app.js)
const sequelize = require('./config/database');
const User = require('./models/User'); // Залишаємо імпорт моделі, щоб Sequelize знав про неї при синхронізації

const app = express();
const cache = new NodeCache({ stdTTL: 60 });
const SECRET_KEY = "secret123";

// Експортуємо змінні (якщо вони все ще потрібні вашому файлу ./routes/users.js)
module.exports = { cache, SECRET_KEY };

// Імпортуємо маршрути
const userRoutes = require('./routes/users');

// Налаштування Swagger
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Users API',
            version: '1.0.0',
        },
    },
    apis: ['./routes/*.js'], 
};
const swaggerSpec = swaggerJsdoc(options);

// Підключення Middlewares
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10
});
app.use(limiter);

// Підключаємо маршрути
app.use('/', userRoutes);

// Об'єднана функція запуску: спочатку База Даних, потім Сервер
async function startApp() {
    try {
        // 1. Перевіряємо з'єднання з базою
        await sequelize.authenticate();
        console.log('З’єднання з MySQL встановлено через mysql2!');

        // 2. Синхронізуємо моделі з таблицями
        await sequelize.sync({ alter: true }); 
        console.log('Таблиці в базі оновлено.');

        // 3. Запускаємо сервер тільки після успішного підключення до БД
        app.listen(3001, () => {
            console.log('Server started on port 3001');
        });

    } catch (error) {
        console.error('Помилка запуску додатка:', error.message);
        process.exit(1); // Завершуємо процес, якщо база не доступна
    }
}

// Викликаємо функцію старту
startApp();