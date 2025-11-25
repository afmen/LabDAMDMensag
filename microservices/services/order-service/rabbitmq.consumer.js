// services/order-service/rabbitmq.consumer.js
require('dotenv').config();
const amqplib = require('amqplib'); // Usa a biblioteca diretamente
const db = require('./order.database');
const crypto = require('crypto');

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost:5672';
const EXCHANGE_NAME = 'shopping_events';
const QUEUE_NAME = 'order_processing_queue'; 
const BINDING_KEY = 'list.checkout.#';

async function startOrderConsumer() {
    try {
        console.log("🐰 [ORDER] Conectando diretamente ao RabbitMQ...");
        
        // 1. Conexão Direta (Bypassing shared connector para evitar erros)
        const connection = await amqplib.connect(AMQP_URL);
        
        // Handler de erro de conexão
        connection.on('error', (err) => {
            console.error("❌ [AMQP CONN ERROR]", err.message);
            setTimeout(startOrderConsumer, 5000);
        });

        connection.on('close', () => {
            console.warn("⚠️ [AMQP CONN CLOSE] Conexão fechada. Reconectando...");
            setTimeout(startOrderConsumer, 5000);
        });

        // 2. Criação do Canal
        const channel = await connection.createChannel();

        // 3. Topologia (Exchange + Fila + Binding)
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);

        // 4. QoS
        channel.prefetch(1);

        console.log(`👂 [ORDER] Aguardando mensagens em '${QUEUE_NAME}'...`);

        // 5. Consumo
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return;

            try {
                const content = JSON.parse(msg.content.toString());
                console.log(`\n📦 [ORDER] Novo Evento: ${content.eventId}`);
                console.log(`   - Lista: ${content.listId} | User: ${content.userId}`);
                console.log(`   - Total: R$ ${content.totalAmount}`);
                
                // Simula processamento
                await new Promise(resolve => setTimeout(resolve, 1500)); 

                const newOrder = {
                    orderId: crypto.randomUUID(),
                    originalListId: content.listId,
                    userId: content.userId,
                    items: content.items,
                    total: content.totalAmount,
                    status: 'COMPLETED',
                    processedAt: new Date()
                };

                await db.saveOrder(newOrder);

                // Confirmação
                channel.ack(msg);
                console.log(`✅ [ORDER] Pedido ${newOrder.orderId} processado!`);

            } catch (err) {
                console.error("❌ [ORDER ERROR] Falha ao processar:", err.message);
                // Rejeita e não re-enfileira (vai para Dead Letter se configurado, ou descarta)
                channel.nack(msg, false, false); 
            }
        });

    } catch (error) {
        console.error("❌ Erro fatal na inicialização do RabbitMQ:", error.message);
        // Tenta reconectar em 5s
        setTimeout(startOrderConsumer, 5000); 
    }
}

module.exports = { startOrderConsumer };