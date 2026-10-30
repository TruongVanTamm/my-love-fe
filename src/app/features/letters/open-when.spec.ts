import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OpenWhenPage } from './open-when';

const couple = {
  id: 'c1',
  name: 'Nhà chung',
  startedAt: '2024-01-01T00:00:00Z',
  timezone: 'Asia/Ho_Chi_Minh',
  members: [
    { userId: 'u1', displayName: 'Mây', role: 'owner', joinedAt: '2024-01-01T00:00:00Z' },
    { userId: 'u2', displayName: 'Gió', role: 'member', joinedAt: '2024-01-02T00:00:00Z' },
  ],
};

describe('Open When trên phone và tablet', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
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
  ])('ẩn nội dung trước khi mở ở %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(OpenWhenPage);
    http.expectOne('/api/v1/couples/current').flush({ data: couple });
    http.expectOne('/api/v1/open-when?page=1&limit=12').flush({
      data: {
        items: [
          {
            id: 'o1',
            senderId: 'u2',
            recipientId: 'u1',
            title: 'Cho ngày khó',
            condition: 'Khi buồn',
            theme: 'rose',
            content: null,
            mediaIds: [],
            openedAt: null,
            createdAt: '2026-10-30T12:00:00Z',
          },
        ],
        meta: { page: 1, limit: 12, total: 1, hasNext: false },
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.phase3-item-button')?.click();
    http.expectOne('/api/v1/open-when/o1').flush({
      data: {
        id: 'o1',
        senderId: 'u2',
        recipientId: 'u1',
        title: 'Cho ngày khó',
        condition: 'Khi buồn',
        theme: 'rose',
        content: null,
        mediaIds: [],
        openedAt: null,
        createdAt: '2026-10-30T12:00:00Z',
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.textContent).toContain('Phong thư vẫn đang chờ bạn mở');
    expect(element.querySelector('app-rich-letter-content')).toBeNull();
  });
});
