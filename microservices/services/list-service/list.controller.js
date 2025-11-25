// services/list-service/controllers/list.controller.js
const crypto = require('crypto');
const productClient = require('./product.client');
const rabbitmqService = require('./rabbitmq.service');
const db = require('./list.database');

/**
 * POST /lists - Cria Lista com Validação gRPC
 */
const createList = async (req, res) => {
    try {
        const { items, userId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Envie um array de IDs ('items')." });
        }

        console.log(`[LIST] Validando ${items.length} itens...`);
        const enrichedItems = [];
        let totalPrice = 0;

        // Validação paralela via gRPC
        const promises = items.map(async (id) => {
            try {
                const product = await productClient.getProductById(id);
                return product ? { product } : { error: id };
            } catch (err) { return { error: id }; }
        });

        const results = await Promise.all(promises);
        
        // Verifica se houve erros (produtos não encontrados)
        const errors = results.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) {
            return res.status(400).json({ error: "Produtos não encontrados", details: errors });
        }

        // Monta lista final
        results.forEach(r => {
            enrichedItems.push({ ...r.product, quantity: 1 });
            totalPrice += r.product.price;
        });

        const newList = {
            id: crypto.randomUUID(),
            userId: userId || 'anonimo',
            items: enrichedItems,
            total: totalPrice,
            status: 'OPEN',
            createdAt: new Date()
        };

        await db.saveList(newList);
        res.status(201).json(newList);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro interno." });
    }
};

/**
 * GET /lists/:id
 */
const getList = async (req, res) => {
    const list = await db.getListById(req.params.id);
    return list ? res.json(list) : res.status(404).json({ error: "Não encontrada." });
};

/**
 * POST /lists/:id/checkout - Envia para RabbitMQ
 */
const checkoutList = async (req, res) => {
    const { id } = req.params;
    const userId = req.body.userId || 'user-anonimo';

    try {
        const list = await db.getListById(id);
        if (!list) return res.status(404).json({ error: "Lista não encontrada." });
        if (list.status !== 'OPEN') return res.status(400).json({ error: "Lista fechada." });

        const eventPayload = {
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            listId: id,
            userId,
            totalAmount: list.total,
            items: list.items
        };

        await rabbitmqService.publishCheckoutEvent(eventPayload);

        res.status(202).json({ 
            message: "Checkout iniciado com sucesso.",
            eventId: eventPayload.eventId
        });

    } catch (error) {
        res.status(503).json({ error: "Serviço de mensageria indisponível." });
    }
};

module.exports = { createList, getList, checkoutList };