// services/order-service/order.database.js

// Armazenamento em memória dos pedidos finalizados
const ORDERS = [];

/**
 * Salva um novo pedido processado.
 */
async function saveOrder(orderData) {
    // Aqui você faria: await OrderModel.create(orderData) (MongoDB/Postgres)
    ORDERS.push(orderData);
    console.log(`💾 [DB] Pedido ${orderData.orderId} salvo no banco.`);
    return orderData;
}

/**
 * Retorna todos os pedidos (para a gente ver via API).
 */
async function getAllOrders() {
    return ORDERS;
}

module.exports = { saveOrder, getAllOrders };