// services/product-service/product.controller.js

const { getAllProducts, getProductById, createProduct } = require('../product.database.js'); 

/**
 * GET /products - Lista todos os produtos
 */
async function listProducts(req, res) {
    try {
        const products = await getAllProducts();
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
        const product = await getProductById(id);
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
    // Para simplificação, apenas valida name e price
    const { name, price, inventory } = req.body;
    
    if (!name || typeof price !== 'number') {
        return res.status(400).json({ error: "Nome e preço (numérico) são obrigatórios." });
    }

    try {
        const newProduct = await createProduct({ name, price, inventory: inventory || 0 });
        console.log(`[CRUD] Novo produto criado: ${newProduct.id}`);
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
    // Você adicionaria updateProductHandler e deleteProductHandler aqui
};