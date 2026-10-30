import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import type { UploadTicket } from './models';

const FILE_TYPES: Record<
  string,
  { kind: 'image' | 'video' | 'audio'; format: string; maxBytes: number }
> = {
  'image/jpeg': { kind: 'image', format: 'jpg', maxBytes: 10_000_000 },
  'image/png': { kind: 'image', format: 'png', maxBytes: 10_000_000 },
  'image/webp': { kind: 'image', format: 'webp', maxBytes: 10_000_000 },
  'image/heic': { kind: 'image', format: 'heic', maxBytes: 10_000_000 },
  'video/mp4': { kind: 'video', format: 'mp4', maxBytes: 100_000_000 },
  'video/quicktime': { kind: 'video', format: 'mov', maxBytes: 100_000_000 },
  'video/webm': { kind: 'video', format: 'webm', maxBytes: 100_000_000 },
  'audio/mpeg': { kind: 'audio', format: 'mp3', maxBytes: 25_000_000 },
  'audio/mp4': { kind: 'audio', format: 'm4a', maxBytes: 25_000_000 },
  'audio/wav': { kind: 'audio', format: 'wav', maxBytes: 25_000_000 },
};

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly api = inject(ApiService);

  async upload(file: File): Promise<string> {
    const type = FILE_TYPES[file.type];
    if (!type || file.size < 1 || file.size > type.maxBytes) {
      throw new Error('File không đúng định dạng hoặc vượt giới hạn cho phép.');
    }
    const ticket = await firstValueFrom(
      this.api.post<UploadTicket>('media/uploads', {
        kind: type.kind,
        format: type.format,
        bytes: file.size,
      }),
    );
    const url = new URL(ticket.uploadUrl);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'api.cloudinary.com' ||
      file.size > ticket.maxBytes
    ) {
      throw new Error('Điểm tải lên không hợp lệ.');
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(ticket.fields)) form.append(key, value);
    form.append('file', file);
    const response = await fetch(url, { method: 'POST', body: form, credentials: 'omit' });
    if (!response.ok) throw new Error('Cloudinary không nhận file. Vui lòng thử lại.');
    await firstValueFrom(this.api.post(`media/${ticket.id}/complete`, {}));
    return ticket.id;
  }
}
