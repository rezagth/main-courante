import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { readFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'eu-west-3' });
const bucket = process.env.S3_BACKUP_BUCKET;

async function archiveExpiredEntries() {
  const policies = await prisma.tenantRetentionPolicy.findMany();
  for (const policy of policies) {
    const threshold = new Date();
    threshold.setUTCFullYear(threshold.getUTCFullYear() - policy.activeYears);

    const rows = await prisma.entreeMainCourante.findMany({
      where: { tenantId: policy.tenantId, deletedAt: null, timestamp: { lt: threshold } },
      take: 500,
    });
    for (const entry of rows) {
      await prisma.archivedEntry.upsert({
        where: { tenantId_originalEntryId: { tenantId: policy.tenantId, originalEntryId: entry.id } },
        create: {
          tenantId: policy.tenantId,
          originalEntryId: entry.id,
          payload: entry,
        },
        update: { payload: entry },
      });
      await prisma.entreeMainCourante.update({
        where: { id_tenantId: { id: entry.id, tenantId: policy.tenantId } },
        data: { deletedAt: new Date() },
      });
    }
  }
}

async function postgresBackup() {
  if (!bucket || !process.env.DATABASE_URL) return;
  const backupId = randomUUID();
  const file = `backup-${backupId}.sql`;
  execSync(`pg_dump "${process.env.DATABASE_URL}" > "${file}"`, { stdio: 'inherit' });

  const body = readFileSync(file);
  const key = `postgres/daily/${new Date().toISOString().slice(0, 10)}-${backupId}.sql`;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
  unlinkSync(file);

  await prisma.backupRun.create({
    data: { kind: 'postgres_daily', status: 'SUCCESS', storageKey: key, finishedAt: new Date() },
  });
}

async function cleanupBackupRetention() {
  if (!bucket) return;
  const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'postgres/' }));
  const contents = list.Contents ?? [];
  const now = Date.now();
  const toDelete = contents.filter((item) => {
    if (!item.LastModified || !item.Key) return false;
    const ageDays = (now - item.LastModified.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays > 28;
  });
  if (toDelete.length === 0) return;
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: toDelete.map((item) => ({ Key: item.Key })) },
    }),
  );
}

cron.schedule('0 2 * * *', async () => {
  await archiveExpiredEntries();
});

cron.schedule('0 3 * * *', async () => {
  await postgresBackup();
  await cleanupBackupRetention();
});

console.log('ops jobs started');
