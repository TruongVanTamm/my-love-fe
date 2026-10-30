import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import type { User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  private restored = false;
  private pending?: Observable<User | null>;

  restore(): Observable<User | null> {
    if (this.restored) return of(this.user());
    this.pending ??= this.api.get<User>('auth/me').pipe(
      tap((user) => this.setUser(user)),
      catchError((error: unknown) => {
        this.pending = undefined;
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.setUser(null);
          return of(null);
        }
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.pending;
  }

  authenticate(mode: 'login' | 'register', input: unknown) {
    return this.api.post<User>(`auth/${mode}`, input).pipe(tap((user) => this.setUser(user)));
  }

  refresh() {
    return this.api.get<User>('auth/me').pipe(tap((user) => this.setUser(user)));
  }

  logout() {
    return this.api.post<void>('auth/logout', {}).pipe(tap(() => this.setUser(null)));
  }

  private setUser(user: User | null): void {
    this.currentUser.set(user);
    this.restored = true;
    this.pending = undefined;
  }
}
