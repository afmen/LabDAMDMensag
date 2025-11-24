// services/user-service/routes/user.routes.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importa os métodos de acesso ao banco de dados
const { createUser, findUserByUsername } = require('../user.database');

// Chave Secreta para JWT (obrigatória)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET não está definido nas variáveis de ambiente!");
    process.exit(1);
}

// Fila para notificação de novos usuários
const USER_CREATED_QUEUE = 'user_events';

/**
 * Rota de Registro de Novo Usuário (/users/register)
 */
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const amqpChannel = req.amqpChannel; // Canal AMQP passado pelo middleware em index.js

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos os campos (username, email, password) são obrigatórios.' });
    }

    try {
        // 1. Gera o hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // 2. Cria um ID simples (UUID real seria melhor)
        const id = Date.now().toString(); 

        // 3. Salva no banco de dados
        const newUser = await createUser({
            id,
            username,
            email,
            password: hashedPassword // Salva o hash
        });

        // 4. Publica evento AMQP de 'UserCreated' (comunicação assíncrona)
        if (amqpChannel) {
            const eventData = {
                eventType: 'UserCreated',
                userId: newUser.id,
                username: newUser.username,
                email: newUser.email,
                timestamp: Date.now()
            };
            amqpChannel.assertQueue(USER_CREATED_QUEUE, { durable: true });
            amqpChannel.sendToQueue(
                USER_CREATED_QUEUE,
                Buffer.from(JSON.stringify(eventData)),
                { persistent: true }
            );
            console.log(`[AMQP] Evento 'UserCreated' publicado para o usuário: ${newUser.id}`);
        }

        // Retorna o usuário criado (sem a senha/hash)
        res.status(201).json({ 
            message: 'Usuário registrado com sucesso!',
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });

    } catch (error) {
        // Erro 19 é geralmente violação de UNIQUE (username ou email já em uso)
        if (error.errno === 19 || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Nome de usuário ou e-mail já estão em uso.' });
        }
        console.error('Erro ao registrar usuário:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor durante o registro.' });
    }
});

/**
 * Rota de Login de Usuário (/users/login)
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    }

    try {
        // 1. Busca o usuário pelo nome de usuário
        const user = await findUserByUsername(username);

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // 2. Compara a senha fornecida com o hash armazenado
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // 3. Gera o Token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // 4. Retorna o token
        res.status(200).json({ 
            message: 'Login realizado com sucesso!',
            token,
            userId: user.id,
            username: user.username
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor durante o login.' });
    }
});

module.exports = router;