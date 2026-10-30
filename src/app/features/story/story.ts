import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Milestone, Page } from '../../core/models';

@Component({
  selector: 'app-story',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <main id="main-content">
      <header class="page-heading">
        <div>
          <p class="eyebrow">CHÚNG MÌNH / CÂU CHUYỆN</p>
          <h1>Từ ngày đầu <em>đến hôm nay.</em></h1>
        </div>
        <button class="button primary" (click)="start()">Thêm cột mốc ↗</button>
      </header>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (editing()) {
        <section class="card">
          <h2>{{ editing()?.id ? 'Sửa cột mốc' : 'Một cột mốc mới' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <label for="story-title">Tên cột mốc</label
            ><input id="story-title" formControlName="title" maxlength="160" required /><label
              for="story-date"
              >Ngày diễn ra</label
            ><input id="story-date" type="date" formControlName="happenedAt" required /><label
              for="story-description"
              >Câu chuyện</label
            ><textarea
              id="story-description"
              formControlName="description"
              maxlength="5000"
              rows="4"
            ></textarea
            ><label class="check-line"
              ><input type="checkbox" formControlName="highlighted" /> Cột mốc nổi bật</label
            >
            <div class="form-actions">
              <button class="button primary" [disabled]="busy()">
                {{ busy() ? 'Đang lưu…' : 'Lưu cột mốc' }}</button
              ><button class="button secondary" type="button" (click)="editing.set(null)">
                Đóng
              </button>
            </div>
          </form>
        </section>
      }
      @if (loading()) {
        <p role="status">Đang mở dòng thời gian…</p>
      }
      @if (page(); as result) {
        <ol class="story-timeline">
          @for (item of result.items; track item.id) {
            <li>
              <div class="story-date">{{ item.happenedAt | date: 'dd.MM.yyyy' : 'UTC' }}</div>
              <article class="card">
                <p class="eyebrow">
                  {{ item.highlighted ? '✦ DẤU MỐC NỔI BẬT' : 'CỘT MỐC CỦA CHÚNG MÌNH' }}
                </p>
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
                <div class="form-actions">
                  <button class="text-link media-button" (click)="edit(item)">Sửa</button
                  ><button
                    class="text-link media-button"
                    (click)="remove(item)"
                    [disabled]="busy()"
                  >
                    Xóa
                  </button>
                </div>
              </article>
            </li>
          }
        </ol>
        @if (!result.items.length) {
          <p class="empty-state">Hãy bắt đầu bằng ngày hai người gặp nhau.</p>
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
export class StoryPage {
  private readonly api = inject(ApiService);
  readonly page = signal<Page<Milestone> | null>(null);
  readonly editing = signal<Milestone | { id: '' } | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', Validators.required],
    happenedAt: ['', Validators.required],
    description: [''],
    highlighted: [false],
  });
  constructor() {
    void this.load(1);
  }
  start(): void {
    this.form.reset();
    this.editing.set({ id: '' });
  }
  edit(item: Milestone): void {
    this.form.setValue({
      title: item.title,
      happenedAt: item.happenedAt.slice(0, 10),
      description: item.description,
      highlighted: item.highlighted,
    });
    this.editing.set(item);
  }

  async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.page.set(
        await firstValueFrom(this.api.get<Page<Milestone>>(`story?page=${page}&limit=12`)),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const current = this.editing();
      const payload = {
        ...this.form.getRawValue(),
        mediaIds: current && 'mediaIds' in current ? current.mediaIds : [],
      };
      if (current?.id)
        await firstValueFrom(this.api.patch<Milestone>(`story/${current.id}`, payload));
      else await firstValueFrom(this.api.post<Milestone>('story', payload));
      this.editing.set(null);
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
  async remove(item: Milestone): Promise<void> {
    if (this.busy() || !window.confirm(`Xóa cột mốc “${item.title}”?`)) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(`story/${item.id}`));
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
