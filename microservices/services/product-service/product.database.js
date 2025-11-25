// services/product-service/product.database.js
const crypto = require('crypto');

// Dados iniciais (Seeds) para facilitar testes manuais e gRPC
const products = [
    { id: 'prod1', name: 'Notebook Ultrafino', price: 4500.00, inventory: 10 },
    { id: 'prod2', name: 'Monitor 4K', price: 1800.00, inventory: 5 },
    { id: 'prod3', name: 'Mouse Gamer RGB', price: 150.00, inventory: 50 },
    // Seus exemplos dinâmicos (opcional):
    { id: crypto.randomUUID(), name: 'Tênis de Corrida Ultra', price: 450.00, inventory: 50 }
];

async function getAllProducts() {
    return products; // Em um DB real: await Model.find()
}

async function getProductById(id) {
    return products.find(p => p.id === id); // Em um DB real: await Model.findById(id)
}

async function createProduct({ name, price, inventory = 0 }) {
    const newProduct = {
        id: crypto.randomUUID(),
        name,
        price,
        inventory
    };
    products.push(newProduct);
    return newProduct;
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct
};