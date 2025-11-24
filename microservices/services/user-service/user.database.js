// services/user-service/user.database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs'); // <--- NOVO: Importa o módulo File System

// Define o caminho do diretório do banco de dados
const dbDir = path.join(__dirname, 'database');
// Caminho para o arquivo do banco de dados (será criado se não existir)
const dbPath = path.join(dbDir, 'users.db');

// 1. Garante que o diretório 'database' exista.
// Isso resolve o erro 'SQLITE_CANTOPEN: unable to open database file'
if (!fs.existsSync(dbDir)) {
    console.log(`Criando o diretório de banco de dados: ${dbDir}`);
    try {
        fs.mkdirSync(dbDir, { recursive: true });
    } catch (error) {
        console.error("ERRO FATAL: Não foi possível criar o diretório do banco de dados:", error);
        // É importante que a aplicação falhe se não puder criar o BD
        process.exit(1); 
    }
}


const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados SQLite:", err.message);
    } else {
        console.log("💾 Conectado ao banco de dados SQLite de usuários.");
        // Cria a tabela de usuários se ela não existir
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE,
            createdAt INTEGER
        )`, (err) => {
            if (err) {
                console.error("Erro ao criar a tabela 'users':", err.message);
            }
        });
    }
});

/**
 * Busca um usuário pelo nome de usuário.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
function findUserByUsername(username) {
    return new Promise((resolve, reject) => {
        // Seleciona apenas os campos necessários, incluindo o hash da senha
        const sql = `SELECT id, username, password FROM users WHERE username = ?`; 
        db.get(sql, [username], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
}

/**
 * Cria um novo usuário.
 * @param {object} userData { id, username, password, email }
 * @returns {Promise<object>} O usuário criado (sem a senha).
 */
function createUser({ id, username, password, email }) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO users (id, username, password, email, createdAt) VALUES (?, ?, ?, ?, ?)`;
        const createdAt = Date.now();
        db.run(sql, [id, username, password, email, createdAt], function(err) {
            if (err) {
                return reject(err);
            }
            // Retorna o usuário sem a senha (o hash)
            resolve({ id, username, email, createdAt });
        });
    });
}

module.exports = {
    findUserByUsername,
    createUser
};