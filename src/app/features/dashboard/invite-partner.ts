import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import type { Couple, Invitation } from '../../core/models';

@Component({
  selector: 'app-invite-partner',
  imports: [DatePipe],
  template: `
    @if (couple().members.length < 2 && isOwner()) {
      <section class="invite-panel card">
        <p class="eyebrow">MỘT CHỖ ĐANG ĐỢI NGƯỜI THƯƠNG</p>
        <h2>Câu chuyện đẹp hơn<br /><em>khi có hai người.</em></h2>
        <p>
          Gửi lời mời để cùng nhau bước vào góc nhỏ này. Đường dẫn dùng một lần, có hiệu lực 48 giờ.
          Lời mời mới sẽ thay thế lời mời cũ.
        </p>
        <button class="button primary" (click)="generate()" [disabled]="busy()">
          {{ invitationLabel() }}
        </button>
        @if (invitation(); as invite) {
          <div class="invite-result">
            <label for="invite-url">Đường dẫn riêng dành cho người thương</label
            ><input id="invite-url" [value]="invite.url" readonly /><button
              class="button secondary"
              (click)="copy()"
            >
              Sao chép đường dẫn
            </button>
            <p class="field-hint">
              Hết hạn: {{ invite.expiresAt | date: 'HH:mm dd/MM/yyyy' }} (giờ thiết bị)
            </p>
            <p class="field-hint">Chỉ chia sẻ với người bạn muốn mời.</p>
          </div>
        }
        @if (message()) {
          <p role="status" class="field-hint">{{ message() }}</p>
        }
        @if (error()) {
          <p class="error-banner" role="alert">{{ error() }}</p>
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitePartner {
  readonly couple = input.required<Couple>();
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  readonly isOwner = computed(() =>
    this.couple().members.some(
      (member) => member.userId === this.auth.user()?.id && member.role === 'owner',
    ),
  );
  readonly invitation = signal<Invitation | null>(null);
  readonly busy = signal(false);
  readonly invitationLabel = computed(() => {
    if (this.busy()) return 'Đang tạo lời mời…';
    return this.invitation() ? 'Tạo lời mời mới ↗' : 'Mời người thương ↗';
  });
  readonly error = signal('');
  readonly message = signal('');

  async generate(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      this.invitation.set(
        await firstValueFrom(this.api.post<Invitation>('couples/invitations', {})),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async copy(): Promise<void> {
    const invitation = this.invitation();
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      this.message.set('Đã sao chép. Gửi riêng cho người thương nhé.');
    } catch {
      this.message.set(
        'Trình duyệt chưa cho phép sao chép. Bạn có thể chọn và sao chép đường dẫn ở trên.',
      );
    }
  }
}
