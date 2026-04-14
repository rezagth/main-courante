import { logger } from '@/lib/logger';

export async function sendMail(to: string, subject: string, html: string) {
  logger.info('mail_send_stub', { to, subject, htmlLength: html.length });
}
