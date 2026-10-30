export function safeCloudinaryDownloadUrl(raw: string): string {
  const url = new URL(raw);
  if (
    url.protocol !== 'https:' ||
    (url.hostname !== 'api.cloudinary.com' && url.hostname !== 'res.cloudinary.com')
  ) {
    throw new Error('URL file không hợp lệ.');
  }
  return url.href;
}
