// -----------------------------------------------------------------------------
// Service Registry Utility
// Utiliza Redis para registro e descoberta de serviços.
// -----------------------------------------------------------------------------
const redis = require('redis');

const clientConfig = {
    // Usa a variável de ambiente (REDIS_URL) ou o default local
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

const isSecureConnection = clientConfig.url.startsWith('rediss://');

// --- DIAGNÓSTICO CRÍTICO ---
// Substitui a senha por asteriscos para não expor a credencial no log
console.log(`[REGISTRY DIAG] URL Redis: ${clientConfig.url.replace(/:.*@/, ':***@')}`); 
console.log(`[REGISTRY DIAG] Modo Seguro (rediss://) Ativado? ${isSecureConnection}`);
// ---------------------------

if (isSecureConnection) {
    console.log("[REGISTRY DIAG] Aplicando configurações DEPURADAS de TLS (Forçando IPv4 e TLS 1.2 mínimo)...");
    
    // Configurações avançadas de socket para forçar o sucesso do handshake TLS
    clientConfig.socket = {
        // Habilita o TLS (necessário quando a URL é 'rediss://')
        tls: true,
        
        // Força o uso de IPv4 (família 4), contornando possíveis problemas de IPv6 em algumas redes.
        family: 4, 
        
        // Permite conexões mesmo se o certificado não for conhecido (Solução de Contorno)
        rejectUnauthorized: false,
        
        // Garante o uso mínimo do TLS 1.2, conforme exigido pela maioria dos serviços cloud.
        minVersion: 'TLSv1.2',
        
        // Ignora a verificação de hostname (Solução de Contorno)
        checkServerIdentity: () => undefined, 
    };
}

const client = redis.createClient(clientConfig);

// Conecta e loga erros (este é o ponto onde o 'wrong version number' aparece)
client.on('error', (err) => {
    // Apenas loga a mensagem de erro com um timestamp
    console.error(`[${new Date().toISOString()}] Redis Client Error:`, err.message); 
});

// Tentativa de conectar (assíncrona e não-bloqueante)
client.connect().then(() => {
    // Log de sucesso
    console.log("✅ [REGISTRY] Conexão Redis Cloud (TLS) estabelecida com sucesso.");
}).catch((error) => {
    // Log de falha, se o erro não tiver sido capturado no client.on('error')
    console.error("[REGISTRY] Falha Crítica ao conectar ao Redis. O serviço continuará, mas o registro não será feito.", error.message);
});


// Função para registrar o serviço com Heartbeat (TTL de 10 segundos)
exports.register = async (serviceName, host, port) => {
    // Verifica se a conexão com o Redis está pronta
    if (!client.isReady) {
        console.warn(`[REGISTRY] Redis não conectado ou pronto. Pulando registro de ${serviceName}.`);
        return;
    }
    const key = `services:${serviceName}:${host}:${port}`;
    // Define a chave com um TTL (Time To Live) de 10 segundos (heartbeat)
    await client.setEx(key, 10, JSON.stringify({ host, port, timestamp: Date.now() }));
    // Apenas registra se a conexão estiver OK para não poluir os logs de erro
    if(client.isReady) {
        console.log(`✅ [REGISTRY] ${serviceName} registrado: ${host}:${port}. TTL: 10s.`);
    }
};

// Função para obter um serviço (utilizada pelo API Gateway)
exports.discover = async (serviceName) => {
    // Verifica se a conexão com o Redis está pronta
    if (!client.isReady) {
        console.error(`[REGISTRY] Redis não conectado. Falha na descoberta de ${serviceName}.`);
        return null;
    }

    const keys = await client.keys(`services:${serviceName}:*`);
    if (keys.length === 0) {
        console.warn(`[REGISTRY] Nenhum serviço ${serviceName} encontrado.`);
        return null;
    }

    // Seleciona um serviço aleatoriamente (Load Balancing Simples)
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const serviceInfo = await client.get(randomKey);
    return JSON.parse(serviceInfo);
};