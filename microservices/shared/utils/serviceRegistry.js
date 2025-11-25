const redis = require('redis');

const clientConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
};

const isSecureConnection = clientConfig.url.startsWith('rediss://');

// Configuração de TLS (Mantida a sua, pois está correta para debug/cloud)
if (isSecureConnection) {
    console.log("[REGISTRY] Configurando TLS seguro...");
    clientConfig.socket = {
        tls: true,
        family: 4,
        rejectUnauthorized: false, // Cuidado em PROD real, mas OK para MVP/Dev
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

    // Define TTL de 10s. Se não for renovado em 10s, o Redis apaga a chave.
    await client.setEx(key, 10, value);
};

// =================================================================
// 2. FUNÇÃO NOVA: Inicia o "Heartbeat" (Pulsação)
// Use ISSO no seu user-service/index.js, não o register() direto
// =================================================================
exports.startHeartbeat = (serviceName, host, port) => {
    // 1. Registra imediatamente
    registerOneShot(serviceName, host, port)
        .then(() => console.log(`[HEARTBEAT] ${serviceName} registrado. Iniciando pulsação...`))
        .catch(err => console.error(`[HEARTBEAT] Falha inicial: ${err.message}`));

    // 2. Cria um loop infinito para renovar o registro a cada 5 segundos
    // (Menos que o TTL de 10s para garantir que nunca expire se estiver online)
    setInterval(async () => {
        try {
            await registerOneShot(serviceName, host, port);
            // Comente o log abaixo em produção para não poluir o terminal
            // console.log(`[HEARTBEAT] Pulso enviado para ${serviceName}`);
        } catch (err) {
            console.error(`[HEARTBEAT] Falha ao renovar registro:`, err.message);
        }
    }, 5000); // 5000ms = 5 segundos
};

// =================================================================
// 3. Descoberta de Serviço (Otimizada)
// =================================================================
exports.discover = async (serviceName) => {
    if (!client.isReady) return null;

    // MELHORIA: Usa SCAN em vez de KEYS para não travar o Redis em produção
    // O SCAN retorna um cursor e um array de chaves.
    const pattern = `services:${serviceName}:*`;
    
    // scanIterator é a forma moderna do node-redis v4 para fazer scan
    // Vamos pegar apenas a primeira chave encontrada para ser rápido (Fail-fast)
    // Ou pegar todas para fazer load balancing.
    
    const keys = [];
    // Itera sobre as chaves sem bloquear o banco
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 10 })) {
        keys.push(key);
        // Se já achamos alguns candidatos, podemos parar para economizar tempo
        if (keys.length > 5) break; 
    }

    if (keys.length === 0) {
        // console.warn(`[DISCOVER] Nenhum serviço encontrado para: ${serviceName}`);
        return null;
    }

    // Load Balancer: Round Robin Aleatório
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    
    const serviceInfo = await client.get(randomKey);
    
    // Tratamento de Race Condition: A chave existia no scan, mas expirou antes do get
    if (!serviceInfo) return null;

    return JSON.parse(serviceInfo);
};