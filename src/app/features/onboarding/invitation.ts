import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import type { Couple } from '../../core/models';

@Component({
  selector: 'app-invitation',
  imports: [RouterLink],
  templateUrl: './invitation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  readonly auth = inject(AuthService);
  readonly returnUrl = `/invite/${this.token}`;
  readonly validToken = /^[a-f0-9]{64}$/.test(this.token);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    void this.restore();
  }

  private async restore(): Promise<void> {
    try {
      await firstValueFrom(this.auth.restore());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.ready.set(true);
    }
  }

  async accept(): Promise<void> {
    if (this.busy() || !this.validToken) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.post<Couple>(`invitations/${this.token}/accept`, {}));
      await firstValueFrom(this.auth.refresh());
      await this.router.navigateByUrl('/home');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
