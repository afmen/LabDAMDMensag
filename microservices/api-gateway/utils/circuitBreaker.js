// api-gateway/utils/circuitBreaker.js
const CircuitBreaker = require('opossum');
const axios = require('axios');

/**
 * Cria uma instância do Circuit Breaker Opossum para proteger chamadas HTTP.
 * * NOTA: O Circuit Breaker é ideal para proteger chamadas SERVICE-TO-SERVICE (Orquestração),
 * e não o proxy primário do API Gateway (que já usa o Service Discovery).
 * * @param {string} serviceName - Nome do serviço (para logging).
 * @param {string} url - URL completa de destino.
 * @param {string} method - Método HTTP ('GET', 'POST', etc.).
 * @param {object} [data] - Dados do corpo da requisição (para POST/PUT).
 * @returns {CircuitBreaker} Instância do Circuit Breaker configurada.
 */
function createHttpBreaker(serviceName, url, method, data) {
    // A função protegida (o que o Opossum vai chamar)
    const protectedFn = () => axios({ url, method, data }); 
    
    const circuit = new CircuitBreaker(
        protectedFn, // Função a ser protegida (neste exemplo, fixada)
        {
            timeout: 3000, // Se a chamada demorar mais que 3s, falha
            maxFailures: 5, // Número de falhas antes de abrir o circuito
            resetTimeout: 15000 // Tempo de espera antes de tentar novamente (15s)
        }
    );

    circuit.on('open', () => console.warn(`🚨 Circuit Breaker ABERTO para ${serviceName}`));
    circuit.on('halfOpen', () => console.log(`⏳ Circuit Breaker MEIO-ABERTO para ${serviceName}`));
    circuit.on('close', () => console.log(`✅ Circuit Breaker FECHADO para ${serviceName}`));
    circuit.on('fallback', () => console.error(`Fallback acionado para ${serviceName}`));
    
    // Fallback: o que fazer se o circuito estiver aberto ou falhar
    circuit.fallback(() => {
        // Retorna um objeto que simula a resposta do Axios (com status 503)
        return { 
            data: { error: `${serviceName} indisponível temporariamente. O circuito está aberto.` }, 
            status: 503,
            message: `Serviço ${serviceName} indisponível.`
        };
    });

    return circuit;
}

module.exports = { createHttpBreaker };