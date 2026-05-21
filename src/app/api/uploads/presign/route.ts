import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error: 'Endpoint deprecated. Utiliser POST /api/entries (multipart/form-data) pour uploader une photo.',
      code: 'DEPRECATED_ENDPOINT',
    },
    { status: 410 },
  );
}
