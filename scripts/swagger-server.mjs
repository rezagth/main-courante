import express from 'express';
import swaggerUi from 'swagger-ui-express';

const app = express();
const port = Number(process.env.SWAGGER_PORT ?? 4001);
const openapiUrl = process.env.OPENAPI_URL ?? 'http://localhost:3000/api/v1/openapi';

app.use('/docs', async (_req, res, next) => {
  try {
    const response = await fetch(openapiUrl);
    const spec = await response.json();
    return swaggerUi.setup(spec)(_req, res, next);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
});
app.use('/docs', swaggerUi.serve);

app.listen(port, () => {
  console.log(`Swagger UI available on http://localhost:${port}/docs`);
});
