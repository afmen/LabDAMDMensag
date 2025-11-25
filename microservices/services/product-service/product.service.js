// services/product-service/product.service.js
const database = require('./product.database');

class ProductService {
    constructor() {
        console.log("📦 ProductService conectado ao Database.");
    }

    async listAll() {
        return await database.getAllProducts();
    }

    async getById(id) {
        return await database.getProductById(id);
    }

    async create(data) {
        // Aqui você pode colocar regras de negócio antes de salvar
        // Ex: if (data.price < 0) throw new Error("Preço inválido");
        return await database.createProduct(data);
    }
}

module.exports = new ProductService();