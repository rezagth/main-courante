import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openapi: '3.0.3',
    info: {
      title: 'Main Courante External API',
      version: '1.0.0',
    },
    paths: {
      '/api/v1/entries': {
        get: {
          summary: 'Read-only entries endpoint',
          parameters: [
            { in: 'header', name: 'x-api-key', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'site_id', schema: { type: 'string' } },
            { in: 'query', name: 'date_from', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'date_to', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'type', schema: { type: 'string' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 0 } },
            { in: 'query', name: 'take', schema: { type: 'integer', default: 100 } },
          ],
          responses: {
            '200': { description: 'Entries list' },
            '401': { description: 'Unauthorized' },
            '429': { description: 'Rate limit exceeded' },
          },
        },
      },
    },
  });
}
