import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '@/lib/s3';
import { requirePermission } from '@/lib/authorization';
import { assertTenantQuota, QuotaExceededError } from '@/lib/quotas';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requirePermission('ENTRY:CREATE');
  try {
    await assertTenantQuota(user.tenantId, 'storage_gb');
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: 'QUOTA_EXCEEDED' },
        { status: 402 },
      );
    }
    throw error;
  }
  const body = (await request.json()) as { fileName?: string; contentType?: string; size?: number };
  const fileName = body.fileName ?? 'photo.jpg';
  const contentType = body.contentType ?? '';
  const size = body.size ?? 0;

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Type de fichier invalide' }, { status: 400 });
  }
  if (size <= 0 || size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux' }, { status: 400 });
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json({ error: 'S3_BUCKET_NAME manquant' }, { status: 500 });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `entries/${Date.now()}-${safeName}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 120 });
  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION ?? 'eu-west-3'}.amazonaws.com/${key}`;

  return NextResponse.json({ uploadUrl, key, publicUrl });
}
