import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/api.service';
import { safeReturnUrl } from '../../core/guards';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly register = this.route.snapshot.routeConfig?.path === 'register';
  readonly busy = signal(false);
  readonly submitLabel = computed(() => {
    if (this.busy()) return 'Đang xử lý…';
    return this.register ? 'Bắt đầu câu chuyện ↗' : 'Về nhà thôi ↗';
  });
  readonly error = signal(
    this.route.snapshot.queryParamMap.has('unavailable')
      ? 'Máy chủ chưa sẵn sàng. Vui lòng thử lại sau.'
      : '',
  );
  readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '/home');
  readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', this.register ? [Validators.required, Validators.maxLength(80)] : []],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password, displayName } = this.form.getRawValue();
      const input = this.register ? { email, password, displayName } : { email, password };
      const user = await firstValueFrom(
        this.auth.authenticate(this.register ? 'register' : 'login', input),
      );
      const target = this.returnUrl === '/home' && !user.coupleId ? '/onboarding' : this.returnUrl;
      await this.router.navigateByUrl(target);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
