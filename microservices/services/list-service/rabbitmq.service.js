// services/list-service/rabbitmq.service.js
const { connectAmqp } = require('../../shared/utils/amqpConnector');

const EXCHANGE_NAME = 'shopping_events';
const ROUTING_KEY = 'list.checkout.completed'; 

let channel = null;

async function getChannel() {
    if (channel) return channel;
    try {
        console.log("[RABBIT] Inicializando canal...");
        const conn = await connectAmqp();
        channel = await conn.createChannel();
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        return channel;
    } catch (error) {
        console.error("[RABBIT ERROR]", error.message);
        throw error;
    }
}

async function publishCheckoutEvent(payload) {
    try {
        const ch = await getChannel();
        const msgBuffer = Buffer.from(JSON.stringify(payload));
        
        const sent = ch.publish(EXCHANGE_NAME, ROUTING_KEY, msgBuffer, { 
            persistent: true, 
            contentType: 'application/json',
            messageId: payload.eventId
        });
        
        if (sent) console.log(`📤 [RABBIT] Evento enviado: ${payload.eventId}`);
        return sent;
    } catch (error) {
        console.error("❌ Erro ao publicar:", error.message);
        throw error; // Propaga erro para o controller tratar
    }
}

module.exports = { publishCheckoutEvent };