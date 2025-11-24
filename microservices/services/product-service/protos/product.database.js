/**
 * Módulo de Acesso a Dados (Mock) para o Serviço de Produto.
 * Contém dados estáticos para simular o banco de dados.
 */
const products = [
    { id: '1', name: 'Laptop Ultraleve X900', description: 'Notebook de alto desempenho.', price: 1500.00, stock: 5 },
    { id: '2', name: 'Smartphone M7 Pro', description: 'Câmera tripla e bateria de longa duração.', price: 799.50, stock: 12 },
    { id: '3', name: 'Monitor 4K', description: 'Monitor curvo 32 polegadas.', price: 450.99, stock: 3 },
    { id: '4', name: 'Mouse Gamer RGB', description: 'Alta precisão.', price: 45.00, stock: 25 },
];

/**
 * Retorna todos os produtos.
 */
exports.findAll = () => {
    return products;
};

/**
 * Encontra um produto pelo ID.
 */
exports.findById = (id) => {
    return products.find(p => p.id === id);
};