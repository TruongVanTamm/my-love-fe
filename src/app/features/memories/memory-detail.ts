import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { MediaDownload, Memory } from '../../core/models';
import { MemoryForm } from './memory-form';

@Component({
  selector: 'app-memory-detail',
  imports: [DatePipe, RouterLink, MemoryForm],
  template: `
    <main id="main-content">
      <a routerLink="/memories" class="text-link">← Tất cả kỷ niệm</a>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status">Đang mở kỷ niệm…</p>
      }
      @if (memory(); as item) {
        <article class="detail-article">
          <p class="eyebrow">
            {{ item.happenedAt | date: 'dd MMMM yyyy' : 'UTC' }} ·
            {{ item.visibility === 'private' ? 'RIÊNG CỦA TÔI' : 'CỦA HAI TA' }}
          </p>
          <h1>{{ item.title }}</h1>
          <p class="memory-body">{{ item.description }}</p>
          <div class="tag-row">
            @for (tag of item.tags; track tag) {
              <span>#{{ tag }}</span>
            }
          </div>
          @if (item.media.length) {
            <section aria-label="File đính kèm" class="media-grid">
              @for (asset of item.media; track asset.id) {
                <div class="card media-card">
                  @if (asset.kind === 'image') {
                    @if (mediaError()[asset.id]) {
                      <p role="alert">Không tải được ảnh. Vui lòng tải lại trang.</p>
                    } @else if (mediaUrl()[asset.id]; as url) {
                      <img [src]="url" [alt]="item.title" (error)="imageFailed(asset.id)" />
                    } @else {
                      <p role="status">Đang tải ảnh…</p>
                    }
                  } @else {
                    <span aria-hidden="true">{{ asset.kind === 'video' ? '▶' : '♫' }}</span>
                    <p>{{ asset.kind === 'video' ? 'Video' : 'Âm thanh' }}</p>
                    <button
                      class="text-link media-button"
                      (click)="openMedia(asset.id)"
                      [disabled]="busy()"
                    >
                      Xem file ↗
                    </button>
                    @if (mediaUrl()[asset.id]; as url) {
                      <a [href]="url" target="_blank" rel="noopener noreferrer"
                        >Mở file đã được xác thực ↗</a
                      >
                    }
                  }
                </div>
              }
            </section>
          }
          <div class="detail-actions">
            <button class="button secondary" (click)="favorite()" [disabled]="busy()">
              {{ item.favorite ? '♥ Đã yêu thích' : '♡ Yêu thích' }}</button
            ><button class="button secondary" (click)="editing.set(!editing())">
              {{ editing() ? 'Đóng' : 'Chỉnh sửa' }}</button
            ><button class="button secondary danger" (click)="remove()" [disabled]="busy()">
              Xóa kỷ niệm
            </button>
          </div>
          @if (editing()) {
            <section class="card">
              <h2>Sửa kỷ niệm</h2>
              <app-memory-form
                [existing]="item"
                (saved)="onSaved()"
                (cancelled)="editing.set(false)"
              />
            </section>
          }
        </article>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryDetailPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly memory = signal<Memory | null>(null);
  readonly mediaUrl = signal<Record<string, string>>({});
  readonly mediaError = signal<Record<string, boolean>>({});
  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  onSaved(): void {
    this.editing.set(false);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const memory = await firstValueFrom(this.api.get<Memory>(`memories/${this.id}`));
      this.memory.set(memory);
      this.mediaUrl.set({});
      this.mediaError.set({});
      await Promise.all(
        memory.media
          .filter((asset) => asset.kind === 'image')
          .map(async (asset) => {
            try {
              const url = await this.downloadUrl(asset.id);
              this.mediaUrl.update((urls) => ({ ...urls, [asset.id]: url }));
            } catch {
              this.imageFailed(asset.id);
            }
          }),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async openMedia(id: string): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const url = await this.downloadUrl(id);
      this.mediaUrl.update((urls) => ({ ...urls, [id]: url }));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  imageFailed(id: string): void {
    this.mediaError.update((errors) => ({ ...errors, [id]: true }));
  }

  private async downloadUrl(id: string): Promise<string> {
    const data = await firstValueFrom(this.api.get<MediaDownload>(`media/${id}/download`));
    const url = new URL(data.url);
    if (
      url.protocol !== 'https:' ||
      (url.hostname !== 'api.cloudinary.com' && url.hostname !== 'res.cloudinary.com')
    ) {
      throw new Error('URL file không hợp lệ.');
    }
    return url.href;
  }

  async favorite(): Promise<void> {
    const current = this.memory();
    if (!current || this.busy()) return;
    this.busy.set(true);
    try {
      if (current.favorite)
        await firstValueFrom(this.api.delete(`memories/${current.id}/favorite`));
      else await firstValueFrom(this.api.post(`memories/${current.id}/favorite`, {}));
      await this.load();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(): Promise<void> {
    const current = this.memory();
    if (!current || this.busy()) return;
    if (!window.confirm('Xóa kỷ niệm này? File đính kèm cũng sẽ được dọn khỏi Cloudinary.')) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(`memories/${current.id}`));
      await this.router.navigateByUrl('/memories');
    } catch (error) {
      this.error.set(errorMessage(error));
      this.busy.set(false);
    }
  }
}
