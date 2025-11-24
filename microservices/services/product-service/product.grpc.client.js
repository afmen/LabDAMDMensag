const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');
require('dotenv').config(); // Carrega variáveis de ambiente

const PROTO_PATH = path.join(__dirname, '../../protos/product.proto');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SERVICE_TO_FIND = 'product-service';

let redisClient;

/**
 * 1. Implementação do Service Discovery usando Redis.
 * Busca o endereço do serviço 'product-service' no Redis.
 */
async function findServiceAddress(serviceName) {
    const serviceKeyPattern = `${serviceName}:*`;
    
    // Busca todas as chaves que correspondem ao padrão
    const keys = await redisClient.keys(serviceKeyPattern);
    
    if (keys.length === 0) {
        throw new Error(`Serviço '${serviceName}' não encontrado no registro Redis.`);
    }

    // Pega a primeira chave encontrada (simplesmente pega a primeira instância)
    const serviceKey = keys[0];
    const serviceAddress = await redisClient.get(serviceKey);
    
    console.log(`[CLIENT] Endereço do ${serviceName} encontrado no Redis: ${serviceAddress}`);
    return serviceAddress;
}


/**
 * 2. Execução do Cliente gRPC.
 */
async function runClient() {
    // Conecta ao Redis
    try {
        redisClient = redis.createClient({ url: REDIS_URL });
        redisClient.on('error', (err) => console.error('Redis Client Error', err));
        await redisClient.connect();
        console.log(`[CLIENT] Conexão com Redis estabelecida.`);

        // Tenta encontrar o endereço do serviço
        const serviceAddress = await findServiceAddress(SERVICE_TO_FIND);

        // Carrega o Product Service definition
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
        });
        const productProto = grpc.loadPackageDefinition(packageDefinition).product;

        // Cria o cliente gRPC
        const client = new productProto.ProductService(
            serviceAddress, 
            grpc.credentials.createInsecure() // Usando credenciais inseguras para ambiente local
        );

        // Chamada gRPC: Busca o produto 'prod1'
        console.log(`[gRPC] Chamando GetProductById para ID: prod1...`);
        client.GetProductById({ id: 'prod1' }, (error, response) => {
            if (error) {
                console.error(`[gRPC ERROR] Falha na chamada GetProductById:`, error.details || error.message);
            } else {
                console.log(`\n✅ [gRPC SUCESSO] Produto Recebido:\n`, response);
            }
            // Encerra a conexão gRPC e Redis
            grpc.closeClient(client);
            redisClient.quit();
        });

    } catch (e) {
        console.error("[CLIENT FATAL ERROR]", e.message);
        if (redisClient) redisClient.quit();
    }
}

runClient();