// services/notification-service/index.js
const { startNotificationConsumer } = require('./consumer');

// O Notification Service é um processo de background (Consumer), não um servidor HTTP.
startNotificationConsumer();

console.log("Notification Service iniciado como um processo em background.");