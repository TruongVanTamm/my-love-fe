import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authenticated: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthService)
    .restore()
    .pipe(
      map((user) =>
        user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
      ),
      catchError(() => of(router.createUrlTree(['/login'], { queryParams: { unavailable: '1' } }))),
    );
};

export const hasCouple: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService)
    .restore()
    .pipe(map((user) => (user?.coupleId ? true : router.createUrlTree(['/onboarding']))));
};

export function safeReturnUrl(url: string | null, fallback: string): string {
  if (!url || !/^\/(?:home|onboarding|invite\/[a-f0-9]{64}|settings\/couple)$/.test(url))
    return fallback;
  return url;
}
