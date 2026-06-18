// Vercel serverless entrypoint
const app = require('./backend/server');

// Exporta o app para o handler do @vercel/node
module.exports = app;

