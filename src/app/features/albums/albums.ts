import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Album, Memory, Page } from '../../core/models';

@Component({
  selector: 'app-albums',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main id="main-content">
      <header class="page-heading">
        <div>
          <p class="eyebrow">CHÚNG MÌNH / ALBUM</p>
          <h1>Mỗi chương một <em>cuốn album.</em></h1>
        </div>
        <button class="button primary" (click)="start()">Tạo album ↗</button>
      </header>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (editing()) {
        <section class="card">
          <h2>{{ editing()?.id ? 'Sửa album' : 'Tạo album mới' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label for="album-name">Tên album</label
            ><input id="album-name" formControlName="name" maxlength="120" required /><label
              for="album-description"
              >Mô tả</label
            ><textarea
              id="album-description"
              formControlName="description"
              maxlength="1000"
              rows="3"
            ></textarea>
            <fieldset>
              <legend>Chọn kỷ niệm chung</legend>
              @for (memory of shared(); track memory.id) {
                <label class="check-line"
                  ><input
                    type="checkbox"
                    [checked]="selected().includes(memory.id)"
                    (change)="toggle(memory.id, $event)"
                  />
                  {{ memory.title }}</label
                >
              }
            </fieldset>
            <div class="form-actions">
              <button class="button primary" [disabled]="busy()">
                {{ busy() ? 'Đang lưu…' : 'Lưu album' }}</button
              ><button type="button" class="button secondary" (click)="editing.set(null)">
                Đóng
              </button>
            </div>
          </form>
        </section>
      }
      @if (loading()) {
        <p role="status">Đang tải album…</p>
      }
      @if (page(); as result) {
        <div class="memory-grid">
          @for (album of result.items; track album.id) {
            <article class="card memory-card">
              <span class="memory-mark" aria-hidden="true">▣</span>
              <h2>{{ album.name }}</h2>
              <p>{{ album.description }}</p>
              <p class="field-hint">{{ album.memoryIds.length }} kỷ niệm</p>
              <div class="album-links">
                @for (id of album.memoryIds; track id) {
                  <a [routerLink]="['/memories', id]">Xem kỷ niệm ↗</a>
                }
              </div>
              <div class="form-actions">
                <button class="text-link media-button" (click)="edit(album)">Sửa</button
                ><button class="text-link media-button" (click)="remove(album)" [disabled]="busy()">
                  Xóa
                </button>
              </div>
            </article>
          }
        </div>
        @if (!result.items.length) {
          <p class="empty-state">Chưa có album nào. Hãy chọn những kỷ niệm chung để bắt đầu.</p>
        }
        <div class="pagination">
          <button
            class="button secondary"
            [disabled]="result.meta.page === 1"
            (click)="load(result.meta.page - 1)"
          >
            ← Trước</button
          ><span>Trang {{ result.meta.page }}</span
          ><button
            class="button secondary"
            [disabled]="!result.meta.hasNext"
            (click)="load(result.meta.page + 1)"
          >
            Sau →
          </button>
        </div>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumsPage {
  private readonly api = inject(ApiService);
  readonly page = signal<Page<Album> | null>(null);
  readonly shared = signal<Memory[]>([]);
  readonly editing = signal<Album | { id: ''; name: ''; description: ''; memoryIds: [] } | null>(
    null,
  );
  readonly selected = signal<string[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
  });
  constructor() {
    void this.load(1);
  }

  async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [albums, memories] = await Promise.all([
        firstValueFrom(this.api.get<Page<Album>>(`albums?page=${page}&limit=12`)),
        firstValueFrom(this.api.get<Page<Memory>>('memories?visibility=shared&limit=30')),
      ]);
      this.page.set(albums);
      this.shared.set(memories.items);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  start(): void {
    this.form.reset();
    this.selected.set([]);
    this.editing.set({ id: '', name: '', description: '', memoryIds: [] });
  }
  edit(album: Album): void {
    this.form.setValue({ name: album.name, description: album.description });
    this.selected.set([...album.memoryIds]);
    this.editing.set(album);
  }
  toggle(id: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.selected.update((ids) =>
      target.checked ? [...ids, id] : ids.filter((item) => item !== id),
    );
  }
  async save(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const payload = { ...this.form.getRawValue(), memoryIds: this.selected() };
      const current = this.editing();
      if (current?.id) await firstValueFrom(this.api.patch<Album>(`albums/${current.id}`, payload));
      else await firstValueFrom(this.api.post<Album>('albums', payload));
      this.editing.set(null);
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
  async remove(album: Album): Promise<void> {
    if (
      this.busy() ||
      !window.confirm(`Xóa album “${album.name}”? Kỷ niệm bên trong vẫn được giữ.`)
    )
      return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(`albums/${album.id}`));
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
