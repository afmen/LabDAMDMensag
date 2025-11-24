// services/analytics-service/consumer.js

require('dotenv').config();
const amqplib = require('amqplib');

// A URL é carregada do ambiente via dotenv (ou de onde for configurada)
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost'; 
const EXCHANGE_NAME = 'shopping_events'; // Exchange do tipo 'topic'
const QUEUE_NAME = 'analytics_queue'; // Fila específica para o serviço de Analytics
const BINDING_KEY = 'list.checkout.#'; // Captura eventos de checkout (ex: list.checkout.completed)

const RECONNECT_INTERVAL = 5000; // 5 segundos para tentar reconexão

/**
 * Tenta conectar-se ao RabbitMQ e configura o consumidor de eventos.
 */
async function startAnalyticsConsumer() {
    let connection = null;
    let channel = null;

    console.log(`[AMQP] Tentando conectar a ${AMQP_URL}...`);

    try {
        if (!AMQP_URL.includes('amqps')) {
            console.warn("⚠️ AMQP_URL não parece ser uma URL segura (amqps).");
        }
        
        // 1. Conexão
        connection = await amqplib.connect(AMQP_URL);
        console.log('[AMQP] Conexão bem-sucedida.');
        
        // Configura handlers para reconexão
        connection.on('error', (err) => {
            console.error('[AMQP ERROR] Erro na Conexão:', err.message);
            // Fecha a conexão atual (se existir) e tenta iniciar novamente
            if (connection) connection.close().catch(() => {});
            setTimeout(startAnalyticsConsumer, RECONNECT_INTERVAL); 
        });

        connection.on('close', () => {
            console.warn('[AMQP] Conexão fechada. Tentando reconectar...');
            setTimeout(startAnalyticsConsumer, RECONNECT_INTERVAL); 
        });

        // 2. Canal
        channel = await connection.createChannel();
        console.log('[AMQP] Canal criado.');

        // 3. Garantir Exchange, Fila e Binding
        // Usando 'topic' para roteamento flexível. 'durable: true' é crucial.
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
        // Fila durável garante que a fila sobreviva ao restart do RabbitMQ
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);

        // 4. Configurar QoS (Quality of Service)
        // Limita o Consumer a processar apenas 1 mensagem por vez (Prefetch Count)
        channel.prefetch(1); 

        console.log(`[B] Analytics Service aguardando eventos em ${QUEUE_NAME} (Binding: ${BINDING_KEY}).`);

        // 5. Iniciar Consumo
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return;

            try {
                const content = JSON.parse(msg.content.toString());
                const routingKey = msg.fields.routingKey;

                console.log(`\n[B] Mensagem recebida via: ${routingKey}`);
                console.log(`[B] Processando Analytics para User: ${content.userId} (Lista: ${content.listId}).`);

                // --- Lógica de Negócio do Analytics (Simulação) ---
                const totalGasto = (Math.random() * 500 + 50).toFixed(2);
                
                // Simular latência de processamento
                await new Promise(resolve => setTimeout(resolve, 1500)); 

                console.log(`[B] Estatística calculada: R$ ${totalGasto}. Atualizando o Dashboard.`);
                // ----------------------------------------

                // Confirma o processamento para o RabbitMQ
                channel.ack(msg);
                console.log(`[B] Evento de Analytics processado e ACK enviado.`);
            } catch (parseError) {
                console.error("ERRO ao processar mensagem JSON:", parseError.message);
                // Rejeita a mensagem. 'false' significa que ela não deve ser re-enfileirada
                // Isso é essencial para evitar loop infinito em mensagens mal-formadas.
                channel.reject(msg, false); 
            }
        }, {
            noAck: false // Garante que a confirmação é manual (ack/reject)
        });

    } catch (error) {
        // Se houver falha na conexão ou declaração (incluindo o erro 406)
        console.error("❌ ERRO FATAL no Consumer Analytics:", error.message);

        if (error.code === 406) {
            console.error("\n--- ERRO CRÍTICO (406 PRECONDITION_FAILED) ---");
            console.error("Solução: Você DEVE apagar o Exchange 'shopping_events' no painel do RabbitMQ.");
            console.error("O Exchange já existe com um tipo ou durabilidade diferente do que o código espera.");
        }
        
        // Tenta reconexão após o intervalo
        console.log(`Tentando reconectar em ${RECONNECT_INTERVAL / 1000} segundos...`);
        if (connection) {
            // Se a conexão falhar, garantimos que ela seja fechada antes de tentar de novo
            connection.close().catch(() => {});
        }
        setTimeout(startAnalyticsConsumer, RECONNECT_INTERVAL);
    }
}

// O módulo agora exporta a função para ser chamada em um arquivo principal
module.exports = { startAnalyticsConsumer };