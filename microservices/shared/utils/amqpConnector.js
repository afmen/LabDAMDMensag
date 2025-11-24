// -----------------------------------------------------------------------------
// AMQP Connector (RabbitMQ)
// Este módulo é responsável por estabelecer e gerenciar a conexão com o RabbitMQ.
// -----------------------------------------------------------------------------

const amqp = require('amqplib'); // Biblioteca oficial do RabbitMQ para Node.js

// CORREÇÃO CRÍTICA: Mudança de RABBITMQ_URL para AMQP_URL para coincidir com o .env
const AMQP_URL_CONFIG = process.env.AMQP_URL || 'amqp://localhost:5672';

// Variáveis para armazenar a conexão e o canal para que possam ser reutilizados
let connection = null;
let channel = null;

/**
 * Conecta-se ao RabbitMQ e retorna um canal de comunicação.
 * Garante que apenas uma conexão e um canal sejam criados por serviço.
 * @returns {Promise<amqp.Channel>} O canal AMQP estabelecido.
 */
async function connectAmqp() {
    // Se a conexão e o canal já existirem, apenas os retorna.
    if (channel) {
        return channel;
    }

    try {
        console.log(`⏳ Conectando ao RabbitMQ...`);

        // 1. Estabelece a conexão usando a variável de ambiente corrigida
        connection = await amqp.connect(AMQP_URL_CONFIG);
        
        // Loga a URL, escondendo a senha
        console.log(`[AMQP] Conectado a: ${AMQP_URL_CONFIG.replace(/:.*@/, ':***@')}`);

        // Define um listener para reconexão em caso de fechamento inesperado
        connection.on("error", (err) => {
            console.error("[AMQP] Erro de conexão:", err.message);
            // Implementação de reconexão mais complexa seria necessária em produção.
            // Por agora, apenas logamos o erro.
        });
        connection.on("close", () => {
            console.error("[AMQP] Conexão fechada. Tentando reconectar...");
            // Em um ambiente de produção, adicionar um retry mechanism (tentativa de reconexão) aqui.
        });

        // 2. Cria um canal de comunicação
        channel = await connection.createChannel();
        console.log("[AMQP] Canal criado com sucesso.");

        // 3. Define a lógica de tratamento de erro para o canal
        channel.on("error", (err) => {
            console.error("[AMQP] Erro no canal:", err.message);
        });

        return channel;

    } catch (error) {
        console.error("[AMQP] Falha ao conectar ao RabbitMQ:", error.message);
        // Lança o erro para que o serviço chamador possa lidar com o erro fatal (como em index.js)
        throw error;
    }
}

/**
 * Publica uma mensagem em um 'Exchange' (distribuidor).
 * @param {string} exchangeName O nome do exchange de destino.
 * @param {string} routingKey A chave de roteamento (se o exchange for do tipo 'topic' ou 'direct').
 * @param {object} payload Os dados a serem enviados (serão convertidos para JSON e Buffer).
 */
function publishMessage(exchangeName, routingKey, payload) {
    if (!channel) {
        console.error("[AMQP] Tentativa de publicar mensagem antes de o canal estar pronto.");
        return false;
    }

    try {
        // Garantir que o exchange exista
        channel.assertExchange(exchangeName, 'topic', {
            durable: true // Garante que o exchange sobreviva a reinicializações do RabbitMQ
        });

        // Converte o payload em uma string JSON e depois em Buffer (formato exigido pelo AMQP)
        const msg = Buffer.from(JSON.stringify(payload));

        const success = channel.publish(exchangeName, routingKey, msg, {
            persistent: true // Garante que a mensagem sobreviva a reinicializações do RabbitMQ
        });

        if (success) {
            console.log(`[AMQP] Publicado evento no Exchange '${exchangeName}' com chave '${routingKey}'.`);
        } else {
            // Isso acontece se o buffer do canal estiver cheio (backpressure)
            console.warn("[AMQP] Publicação falhou: Canal saturado (Buffer Full).");
        }

        return success;
    } catch (error) {
        console.error("[AMQP] Erro ao publicar mensagem:", error.message);
        return false;
    }
}


module.exports = {
    connectAmqp,
    publishMessage,
};