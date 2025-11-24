// api-gateway/index.js
require('dotenv').config(); // 🚨 Adicionado para carregar variáveis de ambiente (JWT_SECRET e REDIS_URL)

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken'); 
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
// Importa as funções de Service Discovery
const { discover } = require('../shared/utils/serviceRegistry'); 

const app = express();
const PORT = process.env.PORT || 3000;
// Carrega a chave secreta JWT (idealmente deve ser definida no seu arquivo .env)
const JWT_SECRET = process.env.JWT_SECRET || 'api-gateway-secret-key-puc-minas'; 

// -----------------------------------------------------
// 1. Definição do Middleware de Autenticação JWT
// -----------------------------------------------------

/**
 * Middleware para verificar o token JWT e anexar o userId à requisição.
 */
const verifyTokenAndAttachUser = (req, res, next) => {
    // Rotas públicas que não requerem token
    if (req.path === '/users/login' || req.path === '/users/register' || req.path === '/health' || req.path === '/lists') {
        // 💡 Ajuste: Permite acesso não autenticado para listar produtos, se for o caso
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ error: 'Token de autenticação ausente.' }); 
    }

    // Espera o formato "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send({ error: 'Formato de Token inválido (Esperado: Bearer <token>).' });
    }

    try {
        // Verifica e decodifica o token usando a chave secreta
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Anexa as informações do usuário à requisição (útil para microsserviços)
        req.user = decoded; 
        console.log(`[AUTH] Usuário ${req.user.id} autenticado para rota: ${req.path}`);
        next();

    } catch (err) {
        // Token inválido (expirado, assinatura errada, etc.)
        return res.status(401).send({ error: 'Token inválido ou expirado.' });
    }
};

// -----------------------------------------------------
// 2. Definição do Proxy (Service Discovery) - REFATORADO
// -----------------------------------------------------

/**
 * Função que cria o middleware de proxy dinâmico usando Service Discovery (Redis).
 * Agora aceita um pathRewrite opcional para corrigir rotas entre Gateway (plural) e Serviço (singular).
 */
const restProxy = (serviceName, pathRewrite = {}) => createProxyMiddleware({
    target: 'http://localhost', // Target é temporário, será sobrescrito pelo Service Discovery
    router: async (req) => {
        const serviceInfo = await discover(serviceName); // Busca a URL no Service Registry
        if (serviceInfo) {
            // Rota para o endereço descoberto
            return `http://${serviceInfo.host}:${serviceInfo.port}`;
        }
        // Se o serviço não for encontrado, responde com 503 (Serviço Indisponível)
        console.error(`[PROXY] Serviço ${serviceName} não encontrado no Registry.`);
        req.res.status(503).json({ 
            error: `Serviço ${serviceName} indisponível.`,
            details: "Nenhum serviço registrado encontrado no Service Registry (Redis)." 
        });
        return null; 
    },
    changeOrigin: true,
    logLevel: 'info', 
    onProxyReq: (proxyReq, req, res) => {
        if (req.user && req.user.id) {
            // Passa o ID do usuário (do JWT) para o serviço downstream (ex: List Service)
            proxyReq.setHeader('X-User-ID', req.user.id);
        }
    },
    // Aplica o pathRewrite customizado se fornecido
    pathRewrite: pathRewrite 
});

// -----------------------------------------------------
// 3. Middlewares Globais e Segurança (Aplicados em Ordem)
// -----------------------------------------------------

// a. Logs
app.use(morgan('combined')); 

// b. Segurança e CORS
app.use(helmet());
app.use(cors()); 

// c. Rate Limiting (Proteção contra DoS)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter); 

// d. Autenticação JWT (Deve vir ANTES do roteamento do Proxy)
app.use(verifyTokenAndAttachUser); // <--- ONDE O JWT É APLICADO!

// -----------------------------------------------------
// 4. Roteamento de Proxy
// -----------------------------------------------------

app.use('/users', restProxy('user-service'));
app.use('/products', restProxy('product-service'));

// 🚨 CORREÇÃO CRÍTICA PARA REQUISITO 3: list-service (gRPC via HTTP)
// O Gateway expõe a rota plural '/lists', mas o list-service usa a rota singular '/list'.
// PathRewrite garante que: /lists -> /list no serviço de destino.
app.use('/lists', restProxy('list-service', {
    '^/lists$': '/list', // Mapeia GET /lists (exatamente) para GET /list
    // Se o serviço tiver mais sub-rotas no futuro, a linha abaixo ajuda:
    // '^/lists/(.*)': '/list/$1' 
})); 

app.use('/orders', restProxy('order-service'));

// -----------------------------------------------------
// 5. Inicialização
// -----------------------------------------------------

// Rota de Health Check
app.get('/health', (req, res) => {
    res.status(200).send({ status: 'API Gateway OK', timestamp: new Date() });
});

// Listener do Servidor
app.listen(PORT, () => {
    console.log(`Gateway rodando na porta ${PORT}`);
});