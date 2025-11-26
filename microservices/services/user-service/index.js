require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
// 1. Mudança: Usamos amqplib direto, igual aos outros serviços
const amqplib = require('amqplib'); 

const { startHeartbeat } = require('../../shared/utils/serviceRegistry.js'); 
require('./user.database'); 
const userRoutes = require('./routes/user.routes'); 

const app = express();
const SERVICE_NAME = 'user-service';
const PORT = process.env.PORT || 3001; 
const HOST = process.env.HOST || 'localhost';
// Pega a URL do CloudAMQP do .env
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';

let amqpChannel = null;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
    // Verifica se o canal está ativo
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
app.use((req, res, next) => {
    req.amqpChannel = amqpChannel;
    next();
});

app.use('/users', userRoutes);

// Função dedicada para conectar ao RabbitMQ (Padrão Singleton/Resiliente)
async function connectToRabbit() {
    try {
        console.log(`⏳ [RABBIT] Conectando em ${AMQP_URL.replace(/:.*@/, ':***@')}...`);
        const connection = await amqplib.connect(AMQP_URL);
        
        connection.on('error', (err) => {
            console.error('[RABBIT CONN ERROR]', err.message);
            amqpChannel = null;
            setTimeout(connectToRabbit, 5000); // Tenta reconectar
        });

        connection.on('close', () => {
            console.warn('[RABBIT CONN CLOSE] Conexão fechada.');
            amqpChannel = null;
            setTimeout(connectToRabbit, 5000);
        });

        amqpChannel = await connection.createChannel();
        console.log("✅ [RABBIT] Canal criado e pronto.");

    } catch (error) {
        console.error("❌ [RABBIT FATAL] Falha na conexão:", error.message);
        setTimeout(connectToRabbit, 5000);
    }
}

async function startService() {
    try {
        // 2. Inicia conexão RabbitMQ
        await connectToRabbit();

        app.listen(PORT, () => {
            console.log(`✅ ${SERVICE_NAME} rodando em http://${HOST}:${PORT}`);
            // 3. O Redis (ServiceRegistry) já foi corrigido anteriormente e é seguro usar
            startHeartbeat(SERVICE_NAME, HOST, PORT);
        });

    } catch (error) {
        console.error(`❌ ERRO FATAL ao iniciar ${SERVICE_NAME}:`, error.message);
        process.exit(1);
    }
}

startService();