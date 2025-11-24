// -----------------------------------------------------------
// product.database.js
// Contém a lógica de acesso a dados (simulação ou DB real)
// -----------------------------------------------------------
const crypto = require('crypto'); // Módulo nativo do Node.js

// Simulação de Coleção (substitua isso pela sua lógica de DB)
const products = [
    { id: crypto.randomUUID(), name: 'Tênis de Corrida Ultra', price: 450.00, inventory: 50 },
    { id: crypto.randomUUID(), name: 'Camiseta Dry-Fit', price: 99.00, inventory: 200 }
];

/**
 * @description Retorna todos os produtos.
 */
async function getAllProducts() {
    // Simulação: Retorna a lista completa de produtos
    return products;
}

/**
 * @description Busca um produto pelo ID.
 */
async function getProductById(id) {
    // Simulação: Busca na lista
    return products.find(p => p.id === id);
}

/**
 * @description Cria e armazena um novo produto.
 */
async function createProduct({ name, price, inventory = 0 }) {
    const newProduct = {
        id: crypto.randomUUID(), // Usando a função nativa para gerar o ID
        name,
        price,
        inventory
    };

    // Simulação: Adiciona o novo produto à lista
    products.push(newProduct);

    return newProduct;
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct
    // updateProduct,
    // deleteProduct
};