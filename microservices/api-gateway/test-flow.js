// test-flow.js

// Tenta usar o jsonwebtoken do gateway ou list-service (se não achar, rode npm install jsonwebtoken)
let jwt;
try {
    jwt = require('./microservices/api-gateway/node_modules/jsonwebtoken');
} catch (e) {
    try {
        jwt = require('jsonwebtoken');
    } catch (e2) {
        console.error("❌ Erro: Biblioteca 'jsonwebtoken' não encontrada.");
        console.error("Dica: Rode 'npm install jsonwebtoken' nesta pasta ou execute o script dentro de 'api-gateway'.");
        process.exit(1);
    }
}

// ⚙️ CONFIGURAÇÕES
const GATEWAY_URL = 'http://localhost:3000';
// ID da lista que sabemos que existe no list.database.js (999 ou L002)
const LIST_ID = '999'; 
// A mesma chave que está no .env do api-gateway
const JWT_SECRET = 'api-gateway-secret-key-puc-minas'; 

async function runTest() {
    console.log("🚀 INICIANDO TESTE DE CHECKOUT (Backend Only)\n");

    // 1. Gerar Token JWT Fake
    console.log("🔑 Gerando Token de Autenticação...");
    const token = jwt.sign({ id: 'user-script-01', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    console.log("   Token gerado com sucesso.\n");

    // 2. Montar a Requisição
    const url = `${GATEWAY_URL}/lists/${LIST_ID}/checkout`;
    console.log(`📡 Enviando POST para: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: 'user-script-01'
            })
        });

        // 3. Analisar Resposta
        const status = response.status;
        const body = await response.json();

        console.log(`\n📥 STATUS CODE: ${status}`);

        if (status === 202) {
            console.log("✅ SUCESSO! O Backend aceitou o pedido.");
            console.log("   Resposta:", body);
            console.log("\n👀 AGORA VERIFIQUE:");
            console.log("   1. Terminal do 'list-service': Deve mostrar 'Evento enviado'.");
            console.log("   2. Terminal do 'order-service': Deve mostrar 'Novo Evento Recebido'.");
        } else {
            console.log("❌ FALHA! Algo deu errado.");
            console.log("   Erro:", body);
            
            if (status === 404) console.log("   Dica: Verifique se o ID da lista existe no 'list.database.js'.");
            if (status === 503) console.log("   Dica: Verifique se o RabbitMQ está rodando e se o 'list-service' conectou.");
        }

    } catch (error) {
        console.error("❌ ERRO DE REDE/CONEXÃO:");
        console.error("   ", error.cause ? error.cause : error.message);
        console.log("   Dica: O 'api-gateway' está rodando na porta 3000?");
    }
}

runTest();