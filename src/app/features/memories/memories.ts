import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Memory, Page } from '../../core/models';
import { MemoryForm } from './memory-form';

@Component({
  selector: 'app-memories',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MemoryForm],
  template: `
    <main id="main-content">
      <header class="page-heading">
        <div>
          <p class="eyebrow">CHÚNG MÌNH / KỶ NIỆM</p>
          <h1>Những ngày <em>đáng nhớ.</em></h1>
        </div>
        <button class="button primary" (click)="showCreate.set(!showCreate())">
          {{ showCreate() ? 'Đóng' : 'Viết kỷ niệm mới ↗' }}
        </button>
      </header>
      @if (showCreate()) {
        <section class="card">
          <h2>Một kỷ niệm mới</h2>
          <app-memory-form (saved)="onSaved()" (cancelled)="showCreate.set(false)" />
        </section>
      }
      <form [formGroup]="filters" (ngSubmit)="search()" class="filter-bar">
        <div class="filter-field">
          <label for="memory-search">Tìm theo tên</label>
          <input id="memory-search" formControlName="q" placeholder="Một cái tên bạn nhớ..." />
        </div>
        <div class="filter-field">
          <label for="memory-tag">Nhãn</label>
          <input id="memory-tag" formControlName="tag" placeholder="du lịch" />
        </div>
        <div class="filter-field">
          <label for="memory-visibility-filter">Chế độ xem</label>
          <select id="memory-visibility-filter" formControlName="visibility">
            <option value="">Tất cả được phép xem</option>
            <option value="shared">Chung</option>
            <option value="private">Riêng của tôi</option>
          </select>
        </div>
        <div class="filter-field">
          <label for="memory-from">Từ ngày</label>
          <input id="memory-from" type="date" formControlName="from" />
        </div>
        <div class="filter-field">
          <label for="memory-to">Đến ngày</label>
          <input id="memory-to" type="date" formControlName="to" />
        </div>
        <button class="button secondary" type="submit">Tìm kiếm</button>
      </form>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (loading()) {
        <p role="status">Đang tìm những ngày đáng nhớ…</p>
      }
      @if (page(); as result) {
        <p class="field-hint">{{ result.meta.total }} kỷ niệm</p>
        <div class="memory-grid">
          @for (memory of result.items; track memory.id) {
            <article class="card memory-card">
              <div class="memory-mark" aria-hidden="true">✧</div>
              <p class="eyebrow">
                {{ memory.happenedAt | date: 'dd.MM.yyyy' : 'UTC' }} ·
                {{ memory.visibility === 'private' ? 'CHỈ MÌNH TÔI' : 'CỦA HAI TA' }}
              </p>
              <h2>
                <a [routerLink]="['/memories', memory.id]">{{ memory.title }}</a>
              </h2>
              <p>{{ memory.description }}</p>
              <div class="tag-row">
                @for (tag of memory.tags; track tag) {
                  <span>#{{ tag }}</span>
                }
              </div>
              <a class="text-link" [routerLink]="['/memories', memory.id]">Mở kỷ niệm ↗</a>
            </article>
          }
        </div>
        @if (!result.items.length && !loading()) {
          <p class="empty-state">
            Chưa có kỷ niệm phù hợp. Một ngày bình thường cũng có thể là một câu chuyện đẹp.
          </p>
        }
        <div class="pagination">
          <button
            class="button secondary"
            [disabled]="result.meta.page === 1 || loading()"
            (click)="go(result.meta.page - 1)"
          >
            ← Trước</button
          ><span>Trang {{ result.meta.page }}</span
          ><button
            class="button secondary"
            [disabled]="!result.meta.hasNext || loading()"
            (click)="go(result.meta.page + 1)"
          >
            Sau →
          </button>
        </div>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoriesPage {
  private readonly api = inject(ApiService);
  readonly filters = inject(FormBuilder).nonNullable.group({
    q: [''],
    tag: [''],
    visibility: [''],
    from: [''],
    to: [''],
  });
  readonly page = signal<Page<Memory> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showCreate = signal(false);
  constructor() {
    void this.go(1);
  }

  search(): void {
    void this.go(1);
  }
  onSaved(): void {
    this.showCreate.set(false);
    void this.go(1);
  }

  async go(page: number): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const query = new URLSearchParams({ page: String(page), limit: '12' });
    for (const [key, value] of Object.entries(this.filters.getRawValue()))
      if (value.trim()) query.set(key, value.trim());
    try {
      this.page.set(await firstValueFrom(this.api.get<Page<Memory>>(`memories?${query}`)));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
