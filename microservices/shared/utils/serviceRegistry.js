// shared/utils/serviceRegistry.js
const redis = require('redis');

const clientConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

const isSecureConnection = clientConfig.url.startsWith('rediss://');

if (isSecureConnection) {
    console.log("[REGISTRY] Configurando TLS seguro...");
    clientConfig.socket = {
        tls: true,
        family: 4,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        checkServerIdentity: () => undefined,
    };
}

const client = redis.createClient(clientConfig);

client.on('error', (err) => console.error(`[Redis Error] ${err.message}`));

// Conexão inicial
(async () => {
    try {
        await client.connect();
        console.log("✅ [REGISTRY] Conectado ao Redis.");
    } catch (error) {
        console.error("❌ [REGISTRY] Falha ao conectar no Redis:", error.message);
    }
})();

// =================================================================
// 1. Lógica de Registro Único (Interna)
// =================================================================
const registerOneShot = async (serviceName, host, port) => {
    if (!client.isReady) return;

    const key = `services:${serviceName}:${host}:${port}`;
    const value = JSON.stringify({ host, port, timestamp: Date.now() });

    // TTL de 10s
    await client.setEx(key, 10, value);
};

// =================================================================
// 2. Heartbeat (Mantido igual)
// =================================================================
exports.startHeartbeat = (serviceName, host, port) => {
    registerOneShot(serviceName, host, port)
        .catch(err => console.error(`[HEARTBEAT] Falha inicial: ${err.message}`));

    setInterval(async () => {
        try {
            await registerOneShot(serviceName, host, port);
        } catch (err) {
            // Silencioso
        }
    }, 5000);
};

// =================================================================
// 3. Descoberta de Serviço (CORRIGIDA - SOLUÇÃO DO ERRO)
// =================================================================
exports.discover = async (serviceName) => {
    if (!client.isReady) return null;

    const pattern = `services:${serviceName}:*`;
    
    // 🚨 MUDANÇA CRÍTICA: 
    // Substituímos scanIterator (que estava quebrando) por keys (que é robusto)
    const keys = await client.keys(pattern);

    if (keys.length === 0) {
        return null;
    }

    // Load Balancer: Round Robin Aleatório
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    
    const serviceInfo = await client.get(randomKey);
    
    if (!serviceInfo) return null;

    return JSON.parse(serviceInfo);
};