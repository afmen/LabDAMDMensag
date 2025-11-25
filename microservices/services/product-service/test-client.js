require('dotenv').config();
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');

const PROTO_PATH = path.join(__dirname, '../../protos/product.proto');
const SERVICE_NAME = 'product-service-grpc';

// Configuração do Cliente Redis Local para este teste
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.error('[REDIS ERROR]', err));

async function runClient() {
    console.log(`[CLIENT] Iniciando teste do gRPC...`);

    try {
        // 1. Conectar ao Redis
        await redisClient.connect();
        console.log("✅ [CLIENT] Redis conectado.");

        // 2. Buscar o serviço usando o método 'KEYS' (Igual ao debug-redis.js)
        const keys = await redisClient.keys(`services:${SERVICE_NAME}:*`);

        if (keys.length === 0) {
            throw new Error(`Chave 'services:${SERVICE_NAME}:*' não encontrada. O servidor está rodando?`);
        }

        // Pega a primeira chave encontrada
        const key = keys[0];
        const rawData = await redisClient.get(key);
        const serviceData = JSON.parse(rawData);

        // Monta o endereço: host:port
        const targetAddress = `${serviceData.host}:${serviceData.port}`;
        console.log(`🎯 [CLIENT] Alvo localizado: ${targetAddress}`);

        // 3. Carregar o Proto
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
        });
        const productProto = grpc.loadPackageDefinition(packageDefinition).product;

        // 4. Conectar via gRPC
        const client = new productProto.ProductService(
            targetAddress,
            grpc.credentials.createInsecure()
        );

        console.log(`📞 [gRPC] Solicitando produto ID: 'prod1'...`);

        // 5. Fazer a chamada
        client.getProductById({ id: 'prod1' }, (error, response) => {
            if (error) {
                console.error(`❌ [gRPC FALHA]:`, error.details || error.message);
                process.exit(1);
            } else {
                console.log(`\n✨ [gRPC SUCESSO] Resposta recebida:`);
                console.log(JSON.stringify(response, null, 2));
                process.exit(0);
            }
        });

    } catch (e) {
        console.error("❌ [ERRO FATAL]", e.message);
        if (redisClient.isOpen) await redisClient.quit();
        process.exit(1);
    }
}

runClient();