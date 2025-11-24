// services/list-service/rabbitmq.service.js

const amqplib = require('amqplib');

// É crucial que esta URL seja definida no ambiente (ex: .env ou package.json environment)
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672'; 
const EXCHANGE_NAME = 'shopping_events';
const ROUTING_KEY = 'list.checkout.completed'; 

/**
 * Publica um evento de checkout no RabbitMQ.
 * @param {string} listId - ID da lista que foi finalizada.
 * @param {string} userId - ID do usuário que realizou a compra (vem do X-User-ID do Gateway).
 */
async function publishCheckoutEvent(listId, userId) {
    let connection;
    try {
        // 1. Conexão e Criação do Canal
        connection = await amqplib.connect(AMQP_URL);
        const channel = await connection.createChannel();

        // 2. Garante que o Exchange Topic existe
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // 3. Cria o Payload da Mensagem
        const payload = {
            listId,
            userId,
            timestamp: Date.now()
        };

        // 4. Publica a Mensagem (Persistente)
        const published = channel.publish(
            EXCHANGE_NAME,
            ROUTING_KEY,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true, contentType: 'application/json' }
        );
        
        console.log(`[x] Publicado: ${ROUTING_KEY} | List ID: ${listId} para User: ${userId}`);

        // A conexão é fechada para não manter recursos abertos se não houver uso frequente.
        // Em um sistema de alta frequência, é melhor manter a conexão aberta (singleton).
        await channel.close(); 
        
        return published;

    } catch (error) {
        console.error("❌ ERRO ao publicar no RabbitMQ:", error.message);
        // Em um cenário real, aqui seria acionada uma estratégia de retry.
        throw new Error("Falha na comunicação com o RabbitMQ.");
    } finally {
        if (connection) await connection.close();
    }
}

module.exports = { publishCheckoutEvent };