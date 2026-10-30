import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import type { ApiResponse } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string) {
    return this.http.get<ApiResponse<T>>(`/api/v1/${path}`).pipe(map((response) => response.data));
  }

  post<T>(path: string, body: unknown) {
    return this.http
      .post<ApiResponse<T>>(`/api/v1/${path}`, body)
      .pipe(map((response) => response?.data));
  }

  patch<T>(path: string, body: unknown) {
    return this.http
      .patch<ApiResponse<T>>(`/api/v1/${path}`, body)
      .pipe(map((response) => response.data));
  }

  delete(path: string) {
    return this.http.delete<void>(`/api/v1/${path}`, {
      body: {},
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload: unknown = error.error;
    if (
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string'
    ) {
      return payload.message;
    }
    if (error.status === 0 || error.status >= 500) {
      return 'Chưa kết nối được với máy chủ. Vui lòng thử lại sau.';
    }
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
