// user-service/index.js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

// Módulos Essenciais
// ATENÇÃO: Agora importamos 'startHeartbeat' em vez de apenas 'register'
const { startHeartbeat } = require('../../shared/utils/serviceRegistry.js'); 
const { connectAmqp } = require('../../shared/utils/amqpConnector.js');

// Inicialização do Banco de Dados
require('./user.database'); 

const userRoutes = require('./routes/user.routes'); 

const app = express();
const SERVICE_NAME = 'user-service';
const PORT = process.env.PORT || 3001; 
// Importante para Docker: permite definir o IP/Nome do container via env
const HOST = process.env.HOST || 'localhost'; 

let amqpChannel;

// Middlewares Globais
app.use(helmet());
app.use(cors());
app.use(morgan('dev')); // 'dev' é melhor para ver logs coloridos durante o desenvolvimento
app.use(express.json());

// Rota de Health Check
app.get('/health', (req, res) => {
    const amqpStatus = amqpChannel ? 'Conectado' : 'Desconectado';
    res.status(200).send({ 
        service: SERVICE_NAME, 
        status: 'OK', 
        amqp: amqpStatus,
        uptime: process.uptime(),
        timestamp: new Date() 
    });
});

// Middleware para injetar o canal AMQP nas rotas
// Dica: Isso garante que as rotas só tentem usar o RabbitMQ se ele estiver conectado
app.use((req, res, next) => {
    req.amqpChannel = amqpChannel;
    next();
});

// Rotas da API
app.use('/users', userRoutes);

/**
 * Inicialização do Serviço
 */
async function startService() {
    try {
        // 1. Conectar ao RabbitMQ
        console.log("⏳ Conectando ao RabbitMQ...");
        amqpChannel = await connectAmqp();
        console.log("✅ Conexão AMQP estabelecida.");

        // 2. Iniciar o Servidor Express
        app.listen(PORT, () => {
            console.log(`✅ ${SERVICE_NAME} rodando em http://${HOST}:${PORT}`);

            // 3. Inicia o Heartbeat automático (Lógica centralizada no Registry)
            // Isso registra o serviço e mantém ele vivo no Redis a cada 5s
            startHeartbeat(SERVICE_NAME, HOST, PORT);
        });

    } catch (error) {
        console.error(`❌ ERRO FATAL ao iniciar ${SERVICE_NAME}:`, error.message);
        process.exit(1);
    }
}

startService();