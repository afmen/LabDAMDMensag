const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');

// Configurações
const GRPC_PORT = process.env.GRPC_PORT || 50051;
const SERVICE_NAME = 'product-service';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PROTO_PATH = path.join(__dirname, '../../protos/product.proto');

// Mock de dados de produtos para o gRPC (IDs estáticos para fácil teste)
const PRODUCTS = [
    { id: 'prod1', name: 'Notebook Ultrafino', price: 4500.00, description: 'Ótimo para trabalho e estudos.' },
    { id: 'prod2', name: 'Monitor 4K', price: 1800.00, description: 'Imagens nítidas e cores vibrantes.' },
    { id: 'prod3', name: 'Mouse Gamer RGB', price: 150.00, description: 'Precisão e estilo para jogos.' },
];

/**
 * Implementação do Serviço gRPC: Busca um produto por ID.
 */
function GetProductById(call, callback) {
    const productId = call.request.id;
    console.log(`[gRPC] Recebida requisição para produto ID: ${productId}`);
    
    const product = PRODUCTS.find(p => p.id === productId);

    if (product) {
        callback(null, product);
    } else {
        callback({
            code: grpc.status.NOT_FOUND,
            details: `Produto com ID ${productId} não encontrado.`,
        });
    }
}

const productServiceImpl = {
    GetProductById: GetProductById,
};

/**
 * ----------------------------------------
 * Funções de Registro no Redis (Service Discovery)
 * ----------------------------------------
 */
let redisClient;

async function registerService() {
    const serviceKey = `${SERVICE_NAME}:${GRPC_PORT}`;
    const serviceValue = `localhost:${GRPC_PORT}`;
    const TTL = 30; // 30 segundos

    try {
        await redisClient.set(serviceKey, serviceValue, { EX: TTL, NX: true });
        console.log(`[REGISTRY] Serviço ${SERVICE_NAME} registrado em ${serviceValue} com TTL de ${TTL}s.`);

        // Renova o TTL a cada 15 segundos
        setInterval(async () => {
            await redisClient.expire(serviceKey, TTL);
        }, (TTL / 2) * 1000); 
    } catch (error) {
        console.error(`[REGISTRY ERROR] Falha ao registrar/renovar o serviço no Redis: ${error.message}`);
    }
}

/**
 * ----------------------------------------
 * Inicialização do Servidor gRPC
 * ----------------------------------------
 */
async function startGrpcServer() {
    console.log(`[gRPC Config] Tentando carregar o .proto de: ${PROTO_PATH}`);

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
    });
    const productProto = grpc.loadPackageDefinition(packageDefinition).product;

    const server = new grpc.Server();
    server.addService(productProto.ProductService.service, productServiceImpl);

    try {
        redisClient = redis.createClient({ url: REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        await redisClient.connect();
        console.log("[REGISTRY] Conexão com Redis estabelecida.");

        await registerService();

    } catch (e) {
        console.error("Falha ao conectar ou registrar no Redis. O serviço continuará sem registro.", e);
    }
    
    server.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`[gRPC ERROR] Falha ao iniciar o servidor: ${err.message}`);
            return;
        }
        console.log(`🚀 gRPC Product Service rodando na porta ${port}`);
        server.start();
    });
}

// Exporta a função para ser usada em server.js
module.exports = { startGrpcServer };