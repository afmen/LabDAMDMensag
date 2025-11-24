/**
 * product.service.js
 * Contém a lógica de negócios para o Serviço de Produto.
 */
const { PRODUCTS } = require('./product.database');

class ProductService {
    constructor() {
        console.log("ProductService inicializado com os dados mockados.");
    }

    /**
     * Retorna todos os produtos disponíveis no 'banco de dados' mockado.
     * Corresponde à implementação do ListProducts no gRPC.
     * @returns {Array<Object>} Uma lista de objetos Product.
     */
    listAll() {
        // No mundo real, aqui haveria uma query ao banco de dados (ex: MongoDB, PostgreSQL)
        return PRODUCTS;
    }

    // Você adicionaria outros métodos de lógica de negócios aqui, como:
    /*
    getProductById(id) {
        return PRODUCTS.find(p => p.id === id);
    }
    createProduct(productData) {
        // Lógica de inserção
    }
    */
}

module.exports = {
    ProductService
};