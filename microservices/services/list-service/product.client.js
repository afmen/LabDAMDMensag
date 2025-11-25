require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Importa nossa função de descoberta (para achar o IP/Porta dinâmica do gRPC)
const { discover } = require('../../shared/utils/serviceRegistry');

// Aponta para o arquivo de contrato compartilhado (.proto)
// O path.resolve ajuda a navegar entre as pastas '../' corretamente
const PROTO_PATH = path.resolve(__dirname, '../../protos/product.proto');

// Nome exato que registramos no Redis dentro do product.grpc.server.js
const TARGET_SERVICE = 'product-service-grpc';

// Cache para não recarregar o arquivo .proto a cada requisição (Performance)
let productProto = null;

const loadProto = () => {
    if (!productProto) {
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });
        productProto = grpc.loadPackageDefinition(packageDefinition).product;
    }
    return productProto;
};

/**
 * Busca um produto via gRPC.
 * @param {string} productId - ID do produto (ex: 'prod1')
 * @returns {Promise<Object|null>} Objeto do produto ou null se não achar.
 */
const getProductById = async (productId) => {
    // 1. Descobre onde o servidor gRPC está rodando
    const serviceInfo = await discover(TARGET_SERVICE);

    if (!serviceInfo) {
        console.error(`❌ [gRPC CLIENT] Serviço '${TARGET_SERVICE}' não encontrado no Redis.`);
        // Em vez de quebrar tudo, lançamos erro para o Controller tratar
        throw new Error("Serviço de Produtos indisponível (Service Discovery falhou).");
    }

    const address = `${serviceInfo.host}:${serviceInfo.port}`;
    // console.log(`🔎 [gRPC] Conectando em ${address} para buscar ${productId}...`);

    // 2. Cria o cliente gRPC conectado ao endereço descoberto
    const proto = loadProto();
    const client = new proto.ProductService(address, grpc.credentials.createInsecure());

    // 3. Faz a chamada (Envelopada em Promise para usar await no Controller)
    return new Promise((resolve, reject) => {
        // Importante: O método aqui deve ser camelCase (getProductById), 
        // mesmo que no .proto seja PascalCase (GetProductById).
        client.getProductById({ id: productId }, (err, response) => {
            if (err) {
                // Código 5 = NOT_FOUND no padrão gRPC
                if (err.code === 5) {
                    console.warn(`⚠️ [gRPC] Produto ${productId} não existe.`);
                    return resolve(null); // Retorna null (não é erro de sistema)
                }
                console.error(`❌ [gRPC ERROR] Falha na chamada:`, err.message);
                reject(err);
            } else {
                resolve(response);
            }
            // Nas versões novas do grpc-js, não precisamos fechar o cliente manualmente 
            // a cada request, o garbage collector cuida disso, ou podemos manter conexões vivas.
        });
    });
};

module.exports = { getProductById };