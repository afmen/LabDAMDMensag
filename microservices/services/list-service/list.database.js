// services/list-service/list.database.js

// Dados iniciais (Mock)
const SHOPPING_LISTS = [
    {
        id: '999', // ID usado no teste inicial
        userId: 'user-teste-123',
        name: 'Lista de Teste (RabbitMQ)',
        status: 'OPEN',
        total: 50.00,
        items: [
            { id: 'prod1', name: 'Notebook', price: 4500.00, quantity: 1 }
        ],
        createdAt: new Date()
    },
    // 🚨 ADICIONE ESTA LISTA (L002) PARA O FLUTTER FUNCIONAR
    {
        id: 'L002',
        userId: 'user-mobile-01',
        name: 'Reforma da Cozinha',
        status: 'OPEN', // Importante: Deve ser OPEN para permitir checkout
        total: 150.00,
        items: [
            { id: 'prod3', name: 'Mouse Gamer', price: 150.00, quantity: 1 }
        ],
        createdAt: new Date()
    }
];

async function saveList(list) {
    SHOPPING_LISTS.push(list);
    return list;
}

async function getListById(id) {
    return SHOPPING_LISTS.find(l => l.id === id);
}

module.exports = {
    saveList,
    getListById
};