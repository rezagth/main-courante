export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}
