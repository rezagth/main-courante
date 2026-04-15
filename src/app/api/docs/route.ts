import { NextResponse } from 'next/server';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@/lib/swagger';

export async function GET(req: Request) {
  const html = swaggerUi.generateHTML(swaggerSpec, {
    swaggerOptions: {
      url: '/api/docs/spec',
      persistAuthorization: true,
    },
  });

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
