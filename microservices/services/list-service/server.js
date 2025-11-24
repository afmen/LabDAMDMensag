// services/list-service/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const listRoutes = require('./routes/list.routes'); // Supondo que você crie um arquivo de rotas

const app = express();
const PORT = process.env.PORT || 3003;
// A URL do RabbitMQ será carregada do ambiente no arquivo rabbitmq.service.js
const AMQP_URL = process.env.AMQP_URL;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rota de Health Check
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'List Service OK', timestamp: new Date() });
});

// Roteamento de Listas
app.use('/lists', listRoutes); 

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`🚀 List Service rodando na porta ${PORT}`);
});