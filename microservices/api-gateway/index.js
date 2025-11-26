// api-gateway/index.js
require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
// Importa a função de Service Discovery
const { discover } = require('../shared/utils/serviceRegistry');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET não definido.");
    process.exit(1);
}

// --- Cache Simples para Service Discovery ---
const serviceCache = {}; 
const CACHE_DURATION = 30 * 1000; // 30 segundos

const getServiceUrl = async (serviceName) => {
    const now = Date.now();
    if (serviceCache[serviceName] && serviceCache[serviceName].expires > now) {
        return serviceCache[serviceName].url;
    }
    const serviceInfo = await discover(serviceName);
    if (serviceInfo) {
        const url = `http://${serviceInfo.host}:${serviceInfo.port}`;
        serviceCache[serviceName] = { url, expires: now + CACHE_DURATION };
        return url;
    }
    return null;
};

// -----------------------------------------------------
// 1. Middleware de Autenticação JWT
// -----------------------------------------------------
const publicRoutes = [
    '/users/login',
    '/users/register',
    '/health',
    '/lists' 
];

const verifyTokenAndAttachUser = (req, res, next) => {
    const isPublic = publicRoutes.some(route => req.path === route || req.path.startsWith(route + '/'));
    if (isPublic) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ error: 'Token ausente.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send({ error: 'Token malformado.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).send({ error: 'Token inválido ou expirado.' });
    }
};

// -----------------------------------------------------
// 2. Proxy Factory
// -----------------------------------------------------
const restProxy = (serviceName, pathRewrite = {}) => createProxyMiddleware({
    target: 'http://localhost', // Placeholder
    router: async (req) => {
        const url = await getServiceUrl(serviceName);
        if (!url) {
            throw new Error(`SERVICE_NOT_FOUND: ${serviceName}`);
        }
        return url;
    },
    changeOrigin: true,
    pathRewrite: pathRewrite,
    onProxyReq: (proxyReq, req) => {
        if (req.user && req.user.id) {
            proxyReq.setHeader('X-User-ID', req.user.id);
        }
    },
    onError: (err, req, res) => {
        console.error(`[PROXY ERROR] Falha ao conectar em ${serviceName}:`, err.message);
        if (!res.headersSent) {
            res.status(503).json({ error: 'Serviço indisponível temporariamente.' });
        }
    }
});

// -----------------------------------------------------
// 3. Aplicação de Middlewares
// -----------------------------------------------------
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter); 

app.use(verifyTokenAndAttachUser);

// -----------------------------------------------------
// 4. Rotas (AQUI ESTAVA O PROBLEMA)
// -----------------------------------------------------

app.use('/users', restProxy('user-service'));
app.use('/products', restProxy('product-service'));
app.use('/orders', restProxy('order-service'));

// 🚨 CORREÇÃO: Removemos o pathRewrite.
// Agora, '/lists/999/checkout' chega no Gateway e é repassado IGUAL para o serviço.
app.use('/lists', restProxy('list-service')); 

// Health Check
app.get('/health', (req, res) => res.json({ status: 'Gateway UP' }));

app.listen(PORT, () => {
    console.log(`Gateway rodando na porta ${PORT}`);
});