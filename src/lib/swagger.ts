import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Main Courante API',
      description: 'Professional SaaS API for fire security entries (Main Courante)',
      version: '1.0.0',
      contact: {
        name: 'Support',
        email: 'support@main-courante.app',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.main-courante.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for external integrations',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'JWT Bearer token for authenticated users',
        },
      },
    },
    security: [
      { ApiKeyAuth: [] },
      { BearerAuth: [] },
    ],
  },
  apis: [
    './src/app/api/v1/**/*.ts',
    './src/app/api/patron/**/*.ts',
    './src/app/api/agent/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
