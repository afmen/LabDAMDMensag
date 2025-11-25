require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const productService = require('./product.service');

// Importa o utilitário compartilhado para usar a MESMA conexão Redis do resto do sistema
const { startHeartbeat } = require('../../shared/utils/serviceRegistry');

// Configurações
const GRPC_PORT = process.env.GRPC_PORT || 50051;
const HOST = process.env.HOST || 'localhost';

// Home diferente para o serviço gRPC
// Isso impede que ele sobrescreva o registro do servidor REST (porta 3004)
const SERVICE_NAME = 'product-service-grpc'; 

const PROTO_PATH = path.resolve(__dirname, '../../protos/product.proto');

// Mock de dados (Produtos)
const PRODUCTS = [
    { id: 'prod1', name: 'Notebook Ultrafino', price: 4500.00, description: 'Ótimo para trabalho e estudos.' },
    { id: 'prod2', name: 'Monitor 4K', price: 1800.00, description: 'Imagens nítidas e cores vibrantes.' },
    { id: 'prod3', name: 'Mouse Gamer RGB', price: 150.00, description: 'Precisão e estilo para jogos.' },
];

/**
 * Implementação do gRPC: GetProductById
 */
async function GetProductById(call, callback) {
    const productId = call.request.id;
    console.log(`[gRPC] Buscando produto ID: ${productId}`);
    
    try {
        // AWAIT é obrigatório agora, pois o service retorna uma Promise
        const product = await productService.getById(productId);

        if (product) {
            callback(null, product);
        } else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: `Produto ID ${productId} não encontrado.`,
            });
        }
    } catch (error) {
        console.error("Erro interno no gRPC:", error);
        callback({
            code: grpc.status.INTERNAL,
            details: "Erro interno ao buscar produto."
        });
    }
}

const productServiceImpl = {
    GetProductById: GetProductById,
};

/**
 * Inicialização do Servidor gRPC
 */
const startGrpcServer = () => {
    console.log(`[gRPC Config] Carregando proto de: ${PROTO_PATH}`);

    try {
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
        });
        const productProto = grpc.loadPackageDefinition(packageDefinition).product;

        const server = new grpc.Server();
        server.addService(productProto.ProductService.service, productServiceImpl);

        // bindAsync substitui o antigo fluxo bind + start
        server.bindAsync(
            `0.0.0.0:${GRPC_PORT}`,
            grpc.ServerCredentials.createInsecure(),
            (err, port) => {
                if (err) {
                    console.error(`[gRPC ERROR] Falha ao iniciar o servidor: ${err.message}`);
                    return;
                }
                console.log(`🚀 gRPC Product Service rodando na porta ${port}`);
                
                // 1. REMOVIDO: server.start(); (Isso corrige o DeprecationWarning)
                
                // 2. CORREÇÃO: Registra com o nome 'product-service-grpc'
                startHeartbeat(SERVICE_NAME, HOST, port);
            }
        );
    } catch (error) {
        console.error(`[gRPC FATAL] Erro ao carregar proto ou iniciar servidor: ${error.message}`);
    }
};

module.exports = { 
    startGrpcServer,
    GRPC_PORT 
};