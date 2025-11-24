// services/analytics-service/index.js
const { startAnalyticsConsumer } = require('./consumer');

// O Analytics Service é um processo de background (Consumer), não um servidor HTTP.
startAnalyticsConsumer();

console.log("Analytics Service iniciado como um processo em background.");