import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './guards';

describe('Phiên đăng nhập', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('dùng chung request restore và chỉ xem 401 là chưa đăng nhập', async () => {
    const first = firstValueFrom(auth.restore());
    const second = firstValueFrom(auth.restore());
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(await first).toBeNull();
    expect(await second).toBeNull();
    expect(await firstValueFrom(auth.restore())).toBeNull();
    http.expectNone('/api/v1/auth/me');
  });

  it('cho phép thử restore lại sau lỗi máy chủ', async () => {
    const first = firstValueFrom(auth.restore());
    const rejected = expect(first).rejects.toThrow();
    http.expectOne('/api/v1/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    await rejected;
    const second = firstValueFrom(auth.restore());
    http
      .expectOne('/api/v1/auth/me')
      .flush({ data: { id: 'u1', email: 'a@example.test', displayName: 'Mây', coupleId: null } });
    expect((await second)?.displayName).toBe('Mây');
  });

  it('logout chỉ xóa state sau khi máy chủ xác nhận', async () => {
    const login = firstValueFrom(
      auth.authenticate('login', { email: 'a@example.test', password: 'test-password' }),
    );
    http
      .expectOne('/api/v1/auth/login')
      .flush({ data: { id: 'u1', email: 'a@example.test', displayName: 'Mây', coupleId: null } });
    await login;
    const logout = firstValueFrom(auth.logout());
    expect(auth.user()?.id).toBe('u1');
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await logout;
    expect(auth.user()).toBeNull();
  });
});

describe('Chuyển trang sau đăng nhập', () => {
  it('giữ lời mời nội bộ nhưng chặn redirect ra bên ngoài', () => {
    const invite = `/invite/${'a'.repeat(64)}`;
    expect(safeReturnUrl(invite, '/home')).toBe(invite);
    expect(safeReturnUrl('//evil.example', '/home')).toBe('/home');
    expect(safeReturnUrl('https://evil.example', '/home')).toBe('/home');
    expect(safeReturnUrl('/invite/invalid', '/home')).toBe('/home');
  });
});
