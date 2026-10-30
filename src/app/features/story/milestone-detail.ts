import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Milestone } from '../../core/models';

@Component({
  selector: 'app-milestone-detail',
  imports: [DatePipe, RouterLink],
  template: `
    <main id="main-content" [attr.aria-busy]="loading()">
      <a routerLink="/story" class="text-link">← Câu chuyện của chúng mình</a>
      @if (loading()) {
        <p role="status">Đang mở cột mốc…</p>
      }
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
        <button class="button secondary" (click)="load()" [disabled]="loading()">Thử lại</button>
      }
      @if (milestone(); as item) {
        <article class="card milestone-detail">
          <p class="eyebrow">
            {{ item.happenedAt | date: 'dd/MM/yyyy' : 'UTC' }} · CỘT MỐC CỦA CHÚNG MÌNH
          </p>
          <h1>{{ item.title }}</h1>
          <p>{{ item.description }}</p>
        </article>
      }
    </main>
  `,
  styles: `
    .milestone-detail {
      max-width: 58rem;
      margin-top: 1.5rem;
      padding: clamp(1.25rem, 4vw, 2.5rem);
    }
    .milestone-detail h1 {
      font-family: var(--serif, serif);
      overflow-wrap: anywhere;
    }
    .milestone-detail p:last-child {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.6;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilestoneDetailPage {
  private readonly api = inject(ApiService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly milestone = signal<Milestone | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.milestone.set(
        await firstValueFrom(this.api.get<Milestone>(`story/${encodeURIComponent(this.id)}`)),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
