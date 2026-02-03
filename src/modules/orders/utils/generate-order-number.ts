export function generateOrderNumber(prefix = 'KBC'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let body = '';

  for (let i = 0; i < 8; i++) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${prefix}-${body}`;
}
