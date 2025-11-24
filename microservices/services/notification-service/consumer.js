// services/notification-service/consumer.js
require('dotenv').config();
const amqplib = require('amqplib');

// A URL é carregada do ambiente
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost'; 
const EXCHANGE_NAME = 'shopping_events';
const QUEUE_NAME = 'notifications_queue'; // Fila específica para o serviço de Notificação
const BINDING_KEY = 'list.checkout.#'; // Captura todos os eventos de checkout

async function startNotificationConsumer() {
    let connection, channel;
    try {
        if (!AMQP_URL.includes('amqps')) {
            console.warn("⚠️ AMQP_URL não parece ser uma URL segura (amqps).");
        }
        
        // 1. Conexão e Canal
        connection = await amqplib.connect(AMQP_URL);
        channel = await connection.createChannel();

        // 2. Garantir Exchange, Fila e Binding
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);

        // 3. Configurar QoS (Quality of Service)
        // Limita o Consumer a processar apenas 1 mensagem por vez (Prefetch Count)
        channel.prefetch(1); 

        console.log(`[A] Notification Service aguardando eventos em ${QUEUE_NAME} (Binding: ${BINDING_KEY}).`);

        // 4. Iniciar Consumo
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return;

            try {
                const content = JSON.parse(msg.content.toString());
                const routingKey = msg.fields.routingKey;

                console.log(`\n[A] Mensagem recebida via: ${routingKey}`);
                console.log(`[A] Processando Notificação para User: ${content.userId} (Lista: ${content.listId}).`);

                // --- Lógica de Negócio de Notificação (Simulação) ---
                console.log(`[A] Enviando E-mail/SMS (simulado) para o usuário ${content.userId} com o comprovante da Lista ${content.listId}.`);
                
                await new Promise(resolve => setTimeout(resolve, 500)); // Simular latência de envio

                console.log(`[A] Notificação enviada com sucesso.`);
                // ----------------------------------------

                // Confirma o processamento para o RabbitMQ
                channel.ack(msg);
                console.log(`[A] Evento de Notificação processado e ACK enviado.`);
            } catch (parseError) {
                console.error("ERRO ao processar mensagem JSON:", parseError.message);
                // Rejeita a mensagem. 'false' significa que ela não deve ser re-enfileirada.
                channel.reject(msg, false); 
            }
        });

    } catch (error) {
        console.error("❌ ERRO FATAL no Consumer Notification:", error.message);
        if (connection) {
            await connection.close();
        }
    }
}

module.exports = { startNotificationConsumer };