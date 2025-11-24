// services/product-service/product.routes.js

const express = require('express');
const { listProducts, getProduct, createProductHandler } = require('../controllers/product.controller');
const router = express.Router();

// CRUD Básico de Produtos
router.get('/', listProducts);
router.post('/', createProductHandler);
router.get('/:id', getProduct);
// router.put('/:id', updateProductHandler);
// router.delete('/:id', deleteProductHandler);

module.exports = router;