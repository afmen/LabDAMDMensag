require('dotenv').config();
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// 🚀 REUSE: Importa a função de descoberta pronta
const { discover } = require('../../shared/utils/serviceRegistry');

const PROTO_PATH = path.join(__dirname, '../../protos/product.proto');

// 🚨 CORREÇÃO: Busca pelo nome específico do serviço gRPC
const SERVICE_TO_FIND = 'product-service-grpc';

/**
 * Execução do Cliente de Teste gRPC
 */
async function runClient() {
    console.log(`[CLIENT] Buscando serviço: ${SERVICE_TO_FIND}...`);

    try {
        // 1. Usa o Discovery compartilhado (já trata JSON, Load Balancing e Retry)
        const service = await discover(SERVICE_TO_FIND);

        if (!service) {
            throw new Error(`Serviço '${SERVICE_TO_FIND}' não encontrado. O servidor subiu?`);
        }

        const serviceAddress = `${service.host}:${service.port}`;
        console.log(`[CLIENT] Alvo encontrado: ${serviceAddress}`);

        // 2. Carrega o Proto
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
        });
        const productProto = grpc.loadPackageDefinition(packageDefinition).product;

        // 3. Cria o cliente gRPC
        const client = new productProto.ProductService(
            serviceAddress, 
            grpc.credentials.createInsecure()
        );

        // 4. Faz a chamada de teste (Busca o ID 'prod1' que definimos no Database)
        console.log(`[gRPC] Chamando GetProductById({ id: 'prod1' })...`);
        
        client.GetProductById({ id: 'prod1' }, (error, response) => {
            if (error) {
                console.error(`❌ [gRPC FALHA]:`, error.details || error.message);
            } else {
                console.log(`\n✅ [gRPC SUCESSO] Resposta do Servidor:`);
                console.log(JSON.stringify(response, null, 2));
            }
            
            // Fecha o cliente (opcional em scripts de execução única, mas boa prática)
            // grpc.closeClient(client); // Versões novas do grpc-js gerenciam isso automaticamente
        });

    } catch (e) {
        console.error("❌ [CLIENT ERROR]", e.message);
        process.exit(1);
    }
}

// Pequeno delay para garantir que a conexão Redis do discover() dê tempo de iniciar (se necessário)
// Embora o discover() interno gerencie sua conexão, em scripts "one-off" isso ajuda.
runClient();