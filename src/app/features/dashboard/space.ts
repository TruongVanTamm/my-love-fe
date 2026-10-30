import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import type { Couple } from '../../core/models';
import { InvitePartner } from './invite-partner';

@Component({
  selector: 'app-space',
  imports: [DatePipe, InvitePartner],
  template: `
    <main id="main-content" [attr.aria-busy]="loading()">
      <header class="page-heading">
        <div>
          <p class="eyebrow">OUR LITTLE UNIVERSE / KHÔNG GIAN CHUNG</p>
          <h1>Hai người.<br /><em>Một chốn riêng.</em></h1>
        </div>
        <button class="button secondary compact" (click)="load()" [disabled]="loading()">
          Làm mới ↻
        </button>
      </header>
      @if (loading() && !couple()) {
        <p role="status">Đang tải không gian…</p>
      }
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (couple(); as space) {
        <section class="card space-details">
          <p class="eyebrow">KHÔNG GIAN CỦA CHÚNG MÌNH</p>
          <h2>{{ space.name }}</h2>
          <dl>
            <dt>Ngày bắt đầu</dt>
            <dd>{{ space.startedAt | date: 'dd/MM/yyyy' : 'UTC' }}</dd>
            <dt>Múi giờ</dt>
            <dd>{{ space.timezone }}</dd>
            <dt>Thành viên</dt>
            <dd>{{ space.members.length }} / 2</dd>
          </dl>
          <div class="members-list">
            @for (member of space.members; track member.userId) {
              <div class="member-row">
                <span class="avatar">{{ member.displayName.slice(0, 1) }}</span>
                <div>
                  <strong>{{ member.displayName }}</strong>
                  <p class="field-hint">
                    {{ member.role === 'owner' ? 'Chủ không gian' : 'Thành viên' }} · Tham gia
                    {{ member.joinedAt | date: 'dd/MM/yyyy' }}
                  </p>
                </div>
              </div>
            }
          </div>
        </section>
        <app-invite-partner [couple]="space" />
        <p class="privacy-note">
          Không gian chỉ dành cho hai thành viên. Quyền chủ không gian không cấp quyền đọc nội dung
          riêng tư của người còn lại.
        </p>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpacePage {
  private readonly api = inject(ApiService);
  readonly couple = signal<Couple | null>(null);
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
      this.couple.set(await firstValueFrom(this.api.get<Couple>('couples/current')));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
