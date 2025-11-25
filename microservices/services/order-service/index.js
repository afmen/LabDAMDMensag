// services/order-service/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importações Locais
const { startOrderConsumer } = require('./rabbitmq.consumer');
const db = require('./order.database');

// Importação Compartilhada
const { startHeartbeat } = require('../../shared/utils/serviceRegistry');

const app = express();
const SERVICE_NAME = 'order-service';
const PORT = process.env.PORT || 3005; // Porta 3005
const HOST = process.env.HOST || 'localhost';

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Rotas ---

// GET /orders - Para visualizarmos os pedidos processados
app.get('/orders', async (req, res) => {
    const orders = await db.getAllOrders();
    res.json(orders);
});

// Health Check
app.get('/health', (req, res) => res.json({ status: 'Order Service OK' }));

// --- Inicialização ---

app.listen(PORT, () => {
    console.log(`🚀 Order Service rodando em http://${HOST}:${PORT}`);

    // 1. Registra no Redis (Para o Gateway encontrar a rota /orders)
    startHeartbeat(SERVICE_NAME, HOST, PORT);

    // 2. Inicia o Consumidor de Eventos (RabbitMQ)
    startOrderConsumer();
});