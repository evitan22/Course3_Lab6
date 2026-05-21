const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const NodeCache = require('node-cache');
const sequelize = require('./config/database');
const User = require('./models/User'); 

const app = express();
const cache = new NodeCache({ stdTTL: 60 });
const SECRET_KEY = "secret123";

module.exports = { cache, SECRET_KEY };

const userRoutes = require('./routes/users');

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json());
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10
});

app.use(limiter);
app.use('/', userRoutes);

async function startApp() {
    try {
        await sequelize.authenticate();
        console.log('З’єднання з MySQL встановлено через mysql2!');

        await sequelize.sync({ alter: true }); 
        console.log('Таблиці в базі оновлено.');

        app.listen(3001, () => {
            console.log('Server started on port 3001');
        });

    } catch (error) {
        console.error('Помилка запуску додатка:', error.message);
        process.exit(1); 
    }
}

startApp();