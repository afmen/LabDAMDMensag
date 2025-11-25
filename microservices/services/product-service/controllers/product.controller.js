// services/product-service/controllers/product.controller.js

// 🚨 MUDANÇA: Importamos o Service (Lógica), não o Database (Dados Brutos)
const productService = require('../product.service'); 

/**
 * GET /products - Lista todos os produtos
 */
async function listProducts(req, res) {
    try {
        // Usa o método unificado do Service
        const products = await productService.listAll();
        return res.status(200).json(products);
    } catch (error) {
        console.error("Erro ao listar produtos:", error.message);
        return res.status(500).json({ error: "Falha ao recuperar o catálogo de produtos." });
    }
}

/**
 * GET /products/:id - Busca um produto específico
 */
async function getProduct(req, res) {
    const { id } = req.params;
    try {
        const product = await productService.getById(id);
        
        if (product) {
            return res.status(200).json(product);
        }
        return res.status(404).json({ error: `Produto com ID ${id} não encontrado.` });
    } catch (error) {
        console.error(`Erro ao buscar produto ${id}:`, error.message);
        return res.status(500).json({ error: "Falha ao buscar produto." });
    }
}

/**
 * POST /products - Cria um novo produto
 */
async function createProductHandler(req, res) {
    const { name, price, inventory } = req.body;
    
    if (!name || typeof price !== 'number') {
        return res.status(400).json({ error: "Nome e preço (numérico) são obrigatórios." });
    }

    try {
        // Delega a criação para o Service (onde regras de negócio residem)
        const newProduct = await productService.create({ 
            name, 
            price, 
            inventory: inventory || 0 
        });
        
        console.log(`[REST] Novo produto criado via API: ${newProduct.id}`);
        return res.status(201).json(newProduct);
    } catch (error) {
        console.error("Erro ao criar produto:", error.message);
        return res.status(500).json({ error: "Falha ao criar produto." });
    }
}

module.exports = {
    listProducts,
    getProduct,
    createProductHandler
};