import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Auth } from './auth';

describe('Biểu mẫu tài khoản', () => {
  let http: HttpTestingController;
  let router: Router;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { routeConfig: { path: 'register' }, queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  it('không gửi request khi mật khẩu quá ngắn', async () => {
    const fixture = TestBed.createComponent(Auth);
    fixture.componentInstance.form.setValue({
      displayName: 'Mây',
      email: 'may@example.test',
      password: 'short',
    });
    await fixture.componentInstance.submit();
    http.expectNone('/api/v1/auth/register');
    expect(fixture.componentInstance.form.invalid).toBe(true);
  });

  it('đăng ký rồi chuyển tới onboarding và không lưu token ở trình duyệt', async () => {
    const fixture = TestBed.createComponent(Auth);
    fixture.componentInstance.form.setValue({
      displayName: 'Mây',
      email: 'may@example.test',
      password: 'long-test-password',
    });
    const promise = fixture.componentInstance.submit();
    const request = http.expectOne('/api/v1/auth/register');
    expect(request.request.body).toEqual({
      displayName: 'Mây',
      email: 'may@example.test',
      password: 'long-test-password',
    });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({
      data: { id: 'u1', email: 'may@example.test', displayName: 'Mây', coupleId: null },
    });
    await promise;
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding');
    expect(localStorage.length).toBe(0);
  });

  it('hiển thị lỗi API và cho phép gửi lại', async () => {
    const fixture = TestBed.createComponent(Auth);
    fixture.componentInstance.form.setValue({
      displayName: 'Mây',
      email: 'may@example.test',
      password: 'long-test-password',
    });
    const promise = fixture.componentInstance.submit();
    http
      .expectOne('/api/v1/auth/register')
      .flush(
        { message: 'Không thể đăng ký với email này.' },
        { status: 409, statusText: 'Conflict' },
      );
    await promise;
    expect(fixture.componentInstance.error()).toBe('Không thể đăng ký với email này.');
    expect(fixture.componentInstance.busy()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
