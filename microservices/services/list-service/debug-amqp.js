// services/list-service/debug-amqp.js
const amqplib = require('amqplib');

const AMQP_URL = 'amqp://localhost:5672';

(async () => {
    console.log(`🕵️ TESTE DE CONEXÃO RABBITMQ para List Service`);
    console.log(`   URL Alvo: ${AMQP_URL}`);

    try {
        console.log("1. Tentando abrir conexão TCP...");
        const conn = await amqplib.connect(AMQP_URL);
        console.log("   ✅ Conexão TCP Sucesso!");

        console.log("2. Tentando criar canal...");
        const ch = await conn.createChannel();
        console.log("   ✅ Canal Criado!");

        console.log("3. Tentando verificar Exchange 'shopping_events'...");
        await ch.assertExchange('shopping_events', 'topic', { durable: true });
        console.log("   ✅ Exchange verificado/criado!");

        console.log("\n🎉 SUCESSO! O RabbitMQ está acessível e configurado corretamente.");
        console.log("   O problema pode ser no código do 'rabbitmq.service.js' ou variável de ambiente.");
        
        await conn.close();

    } catch (error) {
        console.error("\n❌ FALHA NO TESTE:");
        console.error("   Mensagem:", error.message);
        console.error("   Código:", error.code);

        if (error.code === 'ECONNREFUSED') {
            console.error("   -> O RabbitMQ NÃO está rodando ou a porta 5672 está bloqueada.");
        }
        if (error.code === 406 || error.message.includes('PRECONDITION_FAILED')) {
            console.error("   -> Conflito de Exchange! Delete o exchange 'shopping_events' no painel do RabbitMQ (http://localhost:15672).");
        }
    }
})();