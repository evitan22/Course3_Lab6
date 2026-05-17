const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');

const app = express();
const cache = new NodeCache({ stdTTL: 60 });
const SECRET_KEY = "secret123";

app.use(express.json());
app.use(helmet());
app.use(compression());

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10
});

app.use(limiter);

const products = [
    { id: 1, name: "Laptop", price: 30000 },
    { id: 2, name: "Phone", price: 20000 },
    { id: 3, name: "Tablet", price: 15000 },
    { id: 4, name: "Monitor", price: 8000 },
    { id: 5, name: "Keyboard", price: 1500 }
];

app.get('/products', (req, res) => {
    const authHeader = req.headers["authorization"]; // 🔒 Захищений маршрут

    if (!authHeader) {
        return res.status(401).json({ message: "Немає токена" });
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 3;
        const cacheKey = `products_page_${page}_limit_${limit}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json({
                source: 'cache',
                ...cachedData
            });
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedProducts = products.slice(startIndex, endIndex);

        const responseData = {
            page,
            limit,
            totalItems: products.length,
            data: paginatedProducts
        };

        cache.set(cacheKey, responseData);

        res.json({
            source: 'database',
            ...responseData
        });
    } catch (error) {
        res.status(401).json({ message: "Невірний токен" });
    }
});

app.post(
    '/products',
    body('name').trim().isLength({ min: 3 }).escape(),
    body('price').isNumeric(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors.array());
        }
        const product = {
            id: products.length + 1,
            name: req.body.name,
            price: req.body.price
        };
        products.push(product);
        
        // Очищаємо ВЕСЬ кеш товарів, бо дані змінилися
        const keys = cache.keys();
        const productKeys = keys.filter(key => key.startsWith('products_page_'));
        productKeys.forEach(key => cache.del(key));

        res.status(201).json(product);
    }
);

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
});

app.listen(3001, () => {
    console.log('Server started on port 3001');
});