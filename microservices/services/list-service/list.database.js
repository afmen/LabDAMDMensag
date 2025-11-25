// services/list-service/list.database.js

// Dados iniciais para teste fácil (id: 999)
const SHOPPING_LISTS = [
    {
        id: '999',
        userId: 'user-teste-123',
        name: 'Lista de Teste Pronta',
        status: 'OPEN',
        total: 50.00,
        items: [
            { id: 'prod1', name: 'Notebook', price: 50.00, quantity: 1 }
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