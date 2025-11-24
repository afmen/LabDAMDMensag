const { publishCheckoutEvent } = require('./rabbitmq.service');
const { getListById } = require('./list.database');

// REMOVIDA: A importação síncrona de 'uuid' via require() foi removida.
// A importação dinâmica (await import('uuid')) será realizada dentro da função assíncrona.

/**
 * [Placeholder] Cria uma nova lista.
 */
function createList(req, res) {
    res.status(201).json({ message: "List created (placeholder)." });
}

/**
 * [Placeholder] Obtém uma lista pelo ID.
 */
async function getList(req, res) {
    const listId = req.params.id;
    const list = await getListById(listId);
    if (!list) {
        return res.status(404).json({ error: "Lista não encontrada." });
    }
    res.status(200).json(list);
}


// O endpoint HTTP do Producer (Requisito 1)
async function checkoutList(req, res) {
    // RESOLUÇÃO DO ERRO: Importação dinâmica do uuid dentro da função async
    let uuidv4;
    try {
        const uuidModule = await import('uuid');
        uuidv4 = uuidModule.v4;
    } catch (e) {
        console.error("Falha ao carregar o módulo 'uuid':", e);
        return res.status(500).json({ error: "Erro interno: Falha ao carregar dependência de ID." });
    }


    // ID da lista vem do parâmetro da rota (ex: /lists/999/checkout)
    const listId = req.params.id;
    // userId simulado. Em um cenário real, viria de um token JWT (req.user.id)
    const userId = req.body.userId || 'user-teste-123'; 

    if (!listId) {
        return res.status(400).json({ error: "listId é obrigatório." });
    }

    // 1. Simulação de validação rápida (síncrona) usando o DB mock
    const list = await getListById(listId);
    if (!list || list.status !== 'OPEN') {
        return res.status(404).json({ error: "Lista não encontrada ou não está aberta para checkout." });
    }

    // 2. Criação do Payload do Evento
    const eventPayload = {
        eventId: uuidv4(), // Identificador único do evento, agora resolvido assincronamente
        timestamp: new Date().toISOString(),
        listId: listId,
        userId: userId,
        // Adicionar informações relevantes da lista
        listName: list.name,
        listItemsCount: list.items.length,
    };
    
    try {
        // 3. Publica a mensagem no RabbitMQ com a chave de roteamento correta
        const published = await publishCheckoutEvent(listId, userId);
    
        // 4. Retorna "202 Accepted" IMEDIATAMENTE (Requisito 1)
        res.status(202).json({ 
            message: "Checkout aceito para processamento assíncrono.",
            event: eventPayload 
        });

    } catch (error) {
        // Falha na comunicação com o RabbitMQ
        console.error("ERRO ao publicar evento de checkout:", error.message);
        res.status(503).json({ error: "Falha ao enviar evento para o serviço de mensagens." });
    }
}

module.exports = {
    checkoutList,
    createList,
    getList
};