import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { DashboardPage } from './dashboard';

const data = {
  couple: {
    id: 'c1',
    name: 'Nhà của Mây và Gió',
    startedAt: '2024-02-29T00:00:00Z',
    timezone: 'Asia/Ho_Chi_Minh',
    members: [
      { userId: 'u1', displayName: 'Mây', role: 'owner', joinedAt: '2024-02-29T00:00:00Z' },
    ],
  },
  relationship: {
    daysTogether: 974,
    daysUntilAnniversary: 121,
    nextAnniversary: '2027-02-28',
    isAnniversary: false,
  },
  quote: 'Hạnh phúc là những điều bình thường, có nhau.',
  recentMemories: [
    {
      id: 'm1',
      title: 'Chuyến đi đầu tiên',
      happenedAt: '2025-03-01T00:00:00Z',
      visibility: 'shared',
      mediaIds: [],
    },
  ],
};

describe('Dashboard trên điện thoại và tablet', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal({ id: 'u1', displayName: 'Mây' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it.each([
    [375, 812],
    [812, 375],
    [768, 1024],
    [1180, 820],
  ])('hiển thị số liệu API và lời mời ở viewport %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(DashboardPage);
    http.expectOne('/api/v1/dashboard').flush({ data });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('main h1')?.textContent).toContain('Mây');
    expect(element.querySelector('.day-counter strong')?.textContent).toContain('974');
    expect(element.querySelector('.anniversary-number')?.textContent).toBe('121');
    expect(element.querySelector('.recent-section')?.textContent).toContain('Chuyến đi đầu tiên');
    expect(element.querySelectorAll('.quick-actions a')).toHaveLength(3);
    expect(element.querySelector('a[href="/calendar"]')).toBeNull();
    expect(element.querySelector('a[href="/letters"]')).toBeNull();
    const invite = Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mời người thương'),
    );
    expect(invite).toBeDefined();
    expect(element.querySelector('main')?.getAttribute('aria-busy')).toBe('false');
  });

  it('xử lý lỗi tải thay vì hiện dữ liệu mẫu', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    http.expectOne('/api/v1/dashboard').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Chưa kết nối');
    expect(element.querySelector('.day-counter')).toBeNull();
  });

  it('tạo lời mời qua API và chỉ hiển thị URL được máy chủ cấp', async () => {
    const fixture = TestBed.createComponent(DashboardPage);
    http.expectOne('/api/v1/dashboard').flush({ data });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = Array.from(element.querySelectorAll('button')).find((item) =>
      item.textContent?.includes('Mời người thương'),
    );
    button?.click();
    const invitation = {
      url: `http://localhost:4200/invite/${'a'.repeat(64)}`,
      expiresAt: '2026-11-01T00:00:00Z',
    };
    http.expectOne('/api/v1/couples/invitations').flush({ data: invitation });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#invite-url')?.value).toBe(invitation.url);
    expect(element.querySelector<HTMLInputElement>('#invite-url')?.readOnly).toBe(true);
  });
});
