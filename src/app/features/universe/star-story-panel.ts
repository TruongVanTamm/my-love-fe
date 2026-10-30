import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import type { MediaDownload } from '../../core/models';
import type { StarDetail, UniverseConstellation } from './universe.model';

@Component({
  selector: 'app-star-story-panel',
  imports: [DatePipe, RouterLink],
  template: `
    <aside class="story-panel" aria-label="Câu chuyện ngôi sao">
      <header>
        <p class="eyebrow">CÂU CHUYỆN CỦA MỘT NGÔI SAO</p>
        <button
          type="button"
          class="close-button"
          (click)="closed.emit()"
          aria-label="Đóng câu chuyện"
        >
          ×
        </button>
      </header>
      @if (loading()) {
        <p role="status">Đang mở câu chuyện…</p>
      } @else if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
        <button class="button secondary" (click)="retried.emit()">Thử lại</button>
      } @else if (detail(); as star) {
        <p class="story-date">{{ star.source.happenedAt | date: 'dd/MM/yyyy' : 'UTC' }}</p>
        <h2>{{ star.source.title }}</h2>
        @if (star.source.visibility === 'private') {
          <p class="private-badge">Chỉ mình bạn xem được</p>
        }
        <p class="story-body">{{ star.source.description }}</p>
        @for (asset of star.source.media ?? []; track asset.id) {
          @if (asset.kind === 'image') {
            @if (imageUrls()[asset.id]; as url) {
              <img [src]="url" [alt]="star.source.title" (error)="imageFailed(asset.id)" />
            } @else if (imageErrors()[asset.id]) {
              <p role="alert">Không tải được ảnh này.</p>
            } @else {
              <p role="status">Đang tải ảnh…</p>
            }
          }
        }
        <a
          class="button secondary source-link"
          [routerLink]="
            star.sourceType === 'memory' ? ['/memories', star.sourceId] : ['/story', star.sourceId]
          "
        >
          Mở {{ star.sourceType === 'memory' ? 'kỷ niệm' : 'cột mốc' }} gốc ↗
        </a>
        <section class="group-editor" aria-label="Quản lý chòm sao">
          <label for="star-group">Chòm sao</label>
          <select
            id="star-group"
            [value]="star.constellationId ?? ''"
            (change)="changeGroup($event)"
            [disabled]="groupBusy()"
          >
            <option value="">Không thuộc chòm sao</option>
            @for (group of groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
          <label for="new-group">Tạo chòm sao mới</label>
          <div class="new-group-row">
            <input
              id="new-group"
              maxlength="100"
              [value]="newGroupName()"
              (input)="updateGroupName($event)"
              placeholder="Tên chòm sao"
            />
            <button
              class="button secondary compact"
              (click)="createdGroup.emit(newGroupName().trim())"
              [disabled]="!newGroupName().trim() || groupBusy()"
            >
              Tạo
            </button>
          </div>
          @if (groupError()) {
            <p class="error-banner" role="alert">{{ groupError() }}</p>
          }
        </section>
        <button class="remove-star" type="button" (click)="removed.emit()" [disabled]="groupBusy()">
          Gỡ sao khỏi vũ trụ
        </button>
      }
    </aside>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .story-panel {
      background: var(--ivory, #fff9f4);
      color: var(--ink, #32242c);
      border-radius: 16px;
      padding: clamp(1rem, 3vw, 1.5rem);
      height: 100%;
      overflow: auto;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .close-button {
      border: 0;
      background: transparent;
      font-size: 2rem;
      line-height: 1;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
    }
    .story-date {
      color: var(--muted, #786a72);
      font-size: 0.82rem;
      margin-top: 1.5rem;
    }
    h2 {
      font-family: var(--serif, serif);
      font-size: clamp(1.5rem, 3vw, 2rem);
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .story-body {
      white-space: pre-wrap;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 300px;
      border-radius: 12px;
      margin: 1rem 0;
      object-fit: contain;
    }
    .private-badge {
      font-size: 0.72rem;
      color: #76556d;
    }
    .source-link {
      display: inline-flex;
      margin-top: 1.25rem;
    }
    .group-editor {
      border-top: 1px solid var(--line);
      margin-top: 1.5rem;
      padding-top: 1rem;
      display: grid;
      gap: 0.5rem;
    }
    .group-editor label {
      font-size: 0.8rem;
      font-weight: 600;
    }
    .group-editor select,
    .group-editor input {
      min-width: 0;
      width: 100%;
      min-height: 44px;
    }
    .new-group-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.5rem;
    }
    .remove-star {
      min-height: 44px;
      margin-top: 1rem;
      border: 0;
      background: transparent;
      color: #8a3547;
      text-decoration: underline;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarStoryPanel {
  private readonly api = inject(ApiService);
  readonly detail = input<StarDetail | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly groups = input<UniverseConstellation[]>([]);
  readonly groupBusy = input(false);
  readonly groupError = input('');
  readonly closed = output<void>();
  readonly retried = output<void>();
  readonly assigned = output<string | null>();
  readonly createdGroup = output<string>();
  readonly removed = output<void>();
  readonly imageUrls = signal<Record<string, string>>({});
  readonly imageErrors = signal<Record<string, boolean>>({});
  readonly newGroupName = signal('');

  constructor() {
    effect(() => {
      const star = this.detail();
      this.imageUrls.set({});
      this.imageErrors.set({});
      if (star) void this.loadImages(star);
    });
  }

  imageFailed(id: string): void {
    this.imageUrls.update((urls) => {
      const next = { ...urls };
      delete next[id];
      return next;
    });
    this.imageErrors.update((errors) => ({ ...errors, [id]: true }));
  }

  changeGroup(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) this.assigned.emit(target.value || null);
  }

  updateGroupName(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.newGroupName.set(target.value);
  }

  private async loadImages(star: StarDetail): Promise<void> {
    await Promise.all(
      (star.source.media ?? [])
        .filter((asset) => asset.kind === 'image')
        .map(async (asset) => {
          try {
            const data = await firstValueFrom(
              this.api.get<MediaDownload>(`media/${asset.id}/download`),
            );
            const url = new URL(data.url);
            if (
              url.protocol !== 'https:' ||
              !['api.cloudinary.com', 'res.cloudinary.com'].includes(url.hostname)
            ) {
              throw new Error('URL ảnh không hợp lệ.');
            }
            if (this.detail()?.id === star.id)
              this.imageUrls.update((urls) => ({ ...urls, [asset.id]: url.href }));
          } catch {
            if (this.detail()?.id === star.id) this.imageFailed(asset.id);
          }
        }),
    );
  }
}
