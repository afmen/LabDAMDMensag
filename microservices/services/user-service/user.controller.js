// -----------------------------------------------------------------------------
// USER CONTROLLER
// Responsável pela lógica de negócios e interação com o DB e Mensageria.
// -----------------------------------------------------------------------------

const db = require('./user.database').db;
const { v4: uuidv4 } = require('uuid');

/**
 * Cria um novo usuário no banco de dados SQLite e publica um evento.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
async function createUser(req, res) {
    const { name, email } = req.body;
    const userId = uuidv4();
    const amqpChannel = req.amqpChannel; // Canal AMQP injetado pelo middleware

    if (!name || !email) {
        return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }

    try {
        // 1. Inserir no Banco de Dados (Síncrono/Bloqueante)
        const sql = 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)';
        // A função run é assíncrona, mas o SQLite3 a trata como promessa.
        await new Promise((resolve, reject) => {
            db.run(sql, [userId, name, email], function (err) {
                if (err) {
                    // Erro 19 é geralmente de restrição (ex: email duplicado)
                    if (err.errno === 19) {
                        return reject(new Error('Email já cadastrado.'));
                    }
                    console.error('Erro ao inserir no DB:', err);
                    return reject(new Error('Falha ao criar o usuário.'));
                }
                resolve();
            });
        });

        const newUser = { id: userId, name, email };

        // 2. Publicar Evento na Fila de Mensagens (Assíncrono/Não-Bloqueante)
        if (amqpChannel) {
            const eventPayload = {
                eventType: 'user_created',
                data: newUser,
                timestamp: new Date().toISOString()
            };
            
            // Publicando no "user.events" exchange
            amqpChannel.publish(
                'user.events', 
                'user.created', 
                Buffer.from(JSON.stringify(eventPayload))
            );
            console.log(`[AMQP] Evento user_created publicado para o ID: ${userId}`);
        } else {
            console.warn('[AMQP] Canal não disponível. Evento user_created não foi publicado.');
        }

        // 3. Resposta de Sucesso
        res.status(201).json({ 
            message: 'Usuário criado com sucesso.', 
            user: newUser 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/**
 * Busca um usuário por ID.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
async function getUser(req, res) {
    const { id } = req.params;

    try {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const user = await new Promise((resolve, reject) => {
            db.get(sql, [id], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar no DB:', err);
                    return reject(new Error('Falha ao buscar o usuário.'));
                }
                resolve(row);
            });
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.status(200).json(user);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createUser,
    getUser
};