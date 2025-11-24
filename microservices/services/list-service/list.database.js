const fs = require('fs-extra');
const path = require('path');
// A importação de 'uuid' foi removida, pois não é usada neste arquivo e estava causando o erro ERR_REQUIRE_ESM.

// Define o caminho para o arquivo de dados JSON
const dbPath = path.join(__dirname, 'database', 'lists.json');
const initialData = [];

/**
 * Inicializa o banco de dados (cria o arquivo se não existir) e garante
 * que exista pelo menos uma lista para fins de teste de checkout.
 */
async function initializeDatabase() {
    try {
        // Garante que o diretório e o arquivo existam
        await fs.ensureFile(dbPath);
        const data = await fs.readFile(dbPath, 'utf8');
        
        if (!data || data.trim().length === 0) {
            console.log("💾 Inicializando banco de dados de listas com dados de exemplo.");
            // Garante uma lista de checkout para fins de teste (ID fixo 999)
            const defaultList = {
                id: '999',
                userId: 'user-teste-123',
                name: 'Lista de Compras Pronta',
                status: 'OPEN',
                items: [{ name: 'Leite', price: 5.00 }],
                createdAt: Date.now()
            };
            await fs.writeJson(dbPath, [defaultList], { spaces: 2 });
            return [defaultList];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error("ERRO ao inicializar o banco de dados:", error);
        return [];
    }
}

/**
 * Busca uma lista pelo ID para validação antes do checkout.
 * @param {string} listId
 * @returns {object|null} A lista encontrada ou null.
 */
async function getListById(listId) {
    const lists = await initializeDatabase();
    return lists.find(list => list.id === listId) || null;
}

module.exports = {
    initializeDatabase,
    getListById,
};

// Garante que o DB seja inicializado ao carregar o módulo
initializeDatabase();