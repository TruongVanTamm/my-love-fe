import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

describe('ApiService', () => {
  it('gửi JSON khi xóa để vượt qua kiểm tra Content-Type của backend', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(ApiService);
    const http = TestBed.inject(HttpTestingController);
    const operation = firstValueFrom(api.delete('memories/123'));
    const request = http.expectOne('/api/v1/memories/123');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({});
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await operation;
    http.verify();
  });
});
