require('dotenv').config(); // Garante que variáveis de ambiente sejam carregadas

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

// Módulos Essenciais
// Caminho corrigido para dois níveis de subida: '../../'
const { register } = require('../../shared/utils/serviceRegistry.js'); // Service Discovery
const { connectAmqp } = require('../../shared/utils/amqpConnector.js'); // Conexão AMQP/RabbitMQ

// Conexão e Inicialização do Banco de Dados (SQLite)
// A importação deste módulo já inicia a conexão e cria a tabela 'users'.
require('./user.database'); 

const userRoutes = require('./routes/user.routes'); 

const app = express();
const SERVICE_NAME = 'user-service';
const PORT = process.env.PORT || 3001; 

// Variável global para o canal AMQP, inicializada em 'startService'
let amqpChannel;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());

// -----------------------------------------------------------------------------
// FUNÇÃO DE REGISTRO PERIÓDICO (HEARTBEAT)
// -----------------------------------------------------------------------------
function setupHeartbeat() {
    // A chave no Redis expira em 10 segundos. Chamamos a cada 8 segundos para renovar.
    const HEARTBEAT_INTERVAL_MS = 8000; 

    const performRegistration = () => {
        register(SERVICE_NAME, 'localhost', PORT).catch(err => {
            // É importante logar, mas não parar o serviço se o Redis cair temporariamente
            console.error(`[REGISTRY ERROR] Falha ao registrar ${SERVICE_NAME}:`, err.message);
        });
    };

    // 1. Executa o registro imediatamente
    performRegistration();

    // 2. Agenda o registro periódico
    setInterval(performRegistration, HEARTBEAT_INTERVAL_MS);
    
    // Configura o servidor para não fechar enquanto o intervalo estiver ativo.
    // O Node.js manterá o processo rodando.
}
// -----------------------------------------------------------------------------


// Rota de Health Check
app.get('/health', (req, res) => {
    // Verifica se o canal AMQP está disponível
    const amqpStatus = amqpChannel ? 'Conectado' : 'Desconectado';
    res.status(200).send({ 
        service: SERVICE_NAME, 
        status: 'OK', 
        amqp: amqpStatus,
        timestamp: new Date() 
    });
});

// Rotas da API de Usuários
// O canal AMQP será passado para as rotas através do middleware.
app.use('/users', (req, res, next) => {
    req.amqpChannel = amqpChannel;
    next();
}, userRoutes);

/**
 * Inicia a conexão AMQP (RabbitMQ), o servidor HTTP e o registro de serviço.
 */
async function startService() {
    try {
        // 1. Conectar ao RabbitMQ
        console.log("⏳ Conectando ao RabbitMQ...");
        amqpChannel = await connectAmqp();
        console.log("✅ Conexão AMQP estabelecida.");

        // 2. Iniciar o Servidor Express
        app.listen(PORT, () => {
            console.log(`✅ ${SERVICE_NAME} rodando na porta ${PORT}`);

            // 3. Inicia o registro periódico de Heartbeat (TTL)
            setupHeartbeat();
        });

    } catch (error) {
        console.error(`❌ ERRO FATAL ao iniciar ${SERVICE_NAME}:`, error.message);
        // Encerra a aplicação se a conexão crucial ao AMQP falhar
        process.exit(1);
    }
}

startService();