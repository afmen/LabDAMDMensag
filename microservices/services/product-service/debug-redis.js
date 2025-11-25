// debug-redis.js
require('dotenv').config();
const redis = require('redis');

(async () => {
    const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    
    client.on('error', (err) => console.error('Redis Error', err));
    await client.connect();

    console.log("🔍 Listando TODAS as chaves no Redis:");
    const keys = await client.keys('*'); // Cuidado em produção, mas ok aqui
    console.log(keys);

    if (keys.length === 0) {
        console.log("⚠️  Redis está vazio! O Heartbeat do servidor não está funcionando.");
    } else {
        console.log("✅ Chaves encontradas. Procure por 'services:product-service-grpc:...'");
    }

    await client.quit();
})();