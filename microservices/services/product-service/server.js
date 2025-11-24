// services/product-service/server.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');
const { register } = require('../../shared/utils/serviceRegistry'); 
const { startGrpcServer, GRPC_PORT } = require('./product.grpc.server'); // 🚨 NOVO: Importa o servidor gRPC

const app = express();
const SERVICE_NAME = 'product-service';
// 🚨 CORREÇÃO DE PORTA: Mudamos de 3002 para 3004 para evitar conflito com o API Gateway
const PORT = process.env.PORT || 3004; // Porta REST (3004)

// -----------------------------------------------------------------
// 1. Inicia o Servidor gRPC (Porta 50051 por padrão)
// -----------------------------------------------------------------
startGrpcServer();
console.log(`[SETUP] gRPC Service (ProductService) configurado na porta ${GRPC_PORT}.`);

// -----------------------------------------------------------------
// 2. Configuração e Inicialização do Servidor REST
// -----------------------------------------------------------------

// Middlewares de Segurança e Log
app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

// Rota de Health Check
app.get('/health', (req, res) => {
    res.status(200).send({ 
        service: SERVICE_NAME, 
        status: 'OK', 
        rest_port: PORT,
        grpc_port: GRPC_PORT,
        timestamp: new Date() 
    });
});

// Rotas da API de Produtos (REST)
app.use('/products', productRoutes);

app.listen(PORT, () => {
    console.log(`✅ REST Server rodando na porta ${PORT}`);
    
    // 🔑 Ação CRÍTICA: Registra o serviço no Service Discovery (Redis)
    // O Gateway buscará essa informação para roteamento REST.
    // O serviço gRPC usará um método de descoberta diferente (ou IP/Porta fixos).
    register(SERVICE_NAME, 'localhost', PORT); 
});