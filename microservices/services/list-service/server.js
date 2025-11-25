require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const listRoutes = require('./routes/list.routes'); 
const { startHeartbeat } = require('../../shared/utils/serviceRegistry'); // Importante!

const app = express();
const SERVICE_NAME = 'list-service';
const PORT = process.env.PORT || 3003; 
const HOST = process.env.HOST || 'localhost';

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Rota de Health Check
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'List Service OK', timestamp: new Date() });
});

// Rotas Principais
app.use('/lists', listRoutes); 

// Inicialização
app.listen(PORT, () => {
    console.log(`🚀 List Service rodando em http://${HOST}:${PORT}`);
    // Registra no Redis (Service Discovery)
    startHeartbeat(SERVICE_NAME, HOST, PORT);
});