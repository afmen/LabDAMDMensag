// services/list-service/list.routes.js

const express = require('express');
const { checkoutList, createList, getList } = require('../list.controller');
const router = express.Router();

// Rotas CRUD de Listas (Apenas para demonstração)
router.post('/', createList);
router.get('/:id', getList);

// Rota 🔑 CRÍTICA: Checkout (o Producer do evento)
// Exemplo: POST /lists/999/checkout
router.post('/:id/checkout', checkoutList);

module.exports = router;