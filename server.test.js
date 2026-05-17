const request = require('supertest');
const express = require('express');

describe('API testing', () => {
    test('GET /products', async () => {
        const response = await request('http://localhost:3001').get('/products');
        expect(response.statusCode).toBe(200);
    });

    test('GET /products-pagination1', async () => {
        const response = await request('http://localhost:3001').get('/products').query({ page: 2, limit: 2 });
        expect(response.body.data.length).toBeLessThanOrEqual(2);
        expect(response.body.data[0].name).toBe('Tablet');
    });

    test('GET /products-pagination2', async () => {
        const response = await request('http://localhost:3001').get('/products').query({ page: 1, limit: 4 });
        expect(response.body.data.length).toBeLessThanOrEqual(4);
    });
});