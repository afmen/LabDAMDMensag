require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const productRoutes = require('./routes/product.routes');

const { startHeartbeat } = require('../../shared/utils/serviceRegistry'); 
const { startGrpcServer, GRPC_PORT } = require('./product.grpc.server'); 

const app = express();
const SERVICE_NAME = 'product-service';
const PORT = process.env.PORT || 3004; 
const HOST = process.env.HOST || 'localhost';

// -----------------------------------------------------------------
// 1. Inicia o Servidor gRPC (Com Tratamento de Erro)
// -----------------------------------------------------------------
console.log("🛠️  Iniciando configuração do gRPC...");
try {
    startGrpcServer();
    console.log(`[SETUP] gRPC iniciado (Porta alvo: ${GRPC_PORT || 'Padrão'}). Aguardando bind...`);
} catch (error) {
    console.error("❌ ERRO CRÍTICO ao iniciar servidor gRPC:", error.message);
    console.error("Dica: Verifique se o arquivo '../../protos/product.proto' realmente existe.");
    process.exit(1); // Encerra se o gRPC falhar
}

// -----------------------------------------------------------------
// 2. Configuração e Inicialização do Servidor REST
// -----------------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).send({ 
        service: SERVICE_NAME, 
        status: 'OK', 
        timestamp: new Date() 
    });
});

app.use('/products', productRoutes);

// Tenta subir o servidor REST
try {
    app.listen(PORT, () => {
        console.log(`✅ REST Server (Product) rodando em http://${HOST}:${PORT}`);
        startHeartbeat(SERVICE_NAME, HOST, PORT); 
    });
} catch (error) {
    console.error("❌ ERRO ao iniciar servidor Express:", error);
}