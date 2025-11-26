// services/list-service/rabbitmq.service.js
require('dotenv').config();
const amqplib = require('amqplib'); // Usa a biblioteca diretamente para evitar conflitos

// Pega a URL do .env (CloudAMQP)
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'shopping_events';
const ROUTING_KEY = 'list.checkout.completed'; 

let channel = null;

async function getChannel() {
    if (channel) return channel;

    try {
        console.log(`[RABBIT] Conectando...`);
        // Log seguro ocultando senha
        console.log(`[RABBIT] URL: ${AMQP_URL.replace(/:.*@/, ':***@')}`);

        // 1. Conexão Direta (Mais seguro que usar o compartilhado neste caso)
        const conn = await amqplib.connect(AMQP_URL);

        conn.on('error', (err) => {
            console.error("[RABBIT CONN ERROR]", err.message);
            channel = null;
        });
        
        conn.on('close', () => {
            console.warn("[RABBIT CONN CLOSE] Conexão fechada.");
            channel = null;
        });

        // 2. Cria o Canal
        channel = await conn.createChannel();

        // 3. Garante o Exchange
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        console.log("✅ [RABBIT] Canal pronto.");
        return channel;

    } catch (error) {
        console.error("❌ [RABBIT FATAL] Falha ao criar canal:", error.message);
        throw error;
    }
}

async function publishCheckoutEvent(payload) {
    try {
        const ch = await getChannel();

        const msgBuffer = Buffer.from(JSON.stringify(payload));

        const sent = ch.publish(
            EXCHANGE_NAME, 
            ROUTING_KEY, 
            msgBuffer, 
            { 
                persistent: true, 
                contentType: 'application/json',
                messageId: payload.eventId
            }
        );
        
        if (sent) {
            console.log(`📤 [RABBIT] Evento publicado ID: ${payload.eventId}`);
        } else {
            console.warn(`⚠️ [RABBIT] Buffer cheio.`);
        }

        return sent;

    } catch (error) {
        console.error("❌ ERRO ao publicar evento:", error.message);
        channel = null; // Reseta para tentar reconectar na próxima
        throw error;
    }
}

module.exports = { publishCheckoutEvent };