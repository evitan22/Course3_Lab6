const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { cache, SECRET_KEY } = require('../server'); 
const User = require('../models/User');

const products = [
    { id: 1, name: "Laptop", price: 30000 },
    { id: 2, name: "Phone", price: 20000 },
    { id: 3, name: "Tablet", price: 15000 },
    { id: 4, name: "Monitor", price: 8000 },
    { id: 5, name: "Keyboard", price: 1500 }
];

/**
* @swagger
* /products:
*   get:
*       summary: Отримати список продуктів
*       responses:
*           200:
*               description: Список продуктів
*/
router.get('/products', (req, res) => {
    const authHeader = req.headers["authorization"];

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

router.post(
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
        
        const keys = cache.keys();
        const productKeys = keys.filter(key => key.startsWith('products_page_'));
        productKeys.forEach(key => cache.del(key));

        res.status(201).json(product);
    }
);

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Створити нового користувача (без токена)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Успішно створено
 *       400:
 *         description: Помилка валідації або email зайнятий
 */
router.post(
    '/register',
    body('email').isEmail().withMessage('Некоректний формат email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль має бути від 6 символів'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const { email, password } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Цей email вже зареєстрований' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                email,
                password: hashedPassword
            });

            res.status(201).json({
                id: user.id,
                email: user.email,
                createdAt: user.createdAt
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ 
                message: 'Помилка на сервері при створенні користувача',
                error: error.message,
                stack: error.stack 
            });
        }
    }
);

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера" });
  }
});

module.exports = router;