import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Memory } from '../../core/models';
import { MemoryDetailPage } from './memory-detail';

const memory: Memory = {
  id: 'memory-1',
  createdBy: 'user-1',
  title: 'Chuyến đi đầu tiên',
  description: 'Một ngày đáng nhớ.',
  happenedAt: '2026-10-20T00:00:00Z',
  tags: [],
  visibility: 'shared',
  mediaIds: ['image-1'],
  favorite: false,
  createdAt: '2026-10-20T00:00:00Z',
  updatedAt: '2026-10-20T00:00:00Z',
  media: [{ id: 'image-1', kind: 'image' }],
};

describe('Ảnh trong chi tiết kỷ niệm', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MemoryDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'memory-1' }) } },
        },
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
  ])('hiển thị ảnh Cloudinary trong trang ở viewport %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(MemoryDetailPage);
    http.expectOne('/api/v1/memories/memory-1').flush({ data: memory });
    await Promise.resolve();
    const url = 'https://api.cloudinary.com/v1_1/demo/image/download?signature=signed';
    http.expectOne('/api/v1/media/image-1/download').flush({
      data: { url, expiresAt: '2026-10-30T09:00:00Z' },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector<HTMLImageElement>('.media-card img')?.src).toBe(url);
    expect(element.querySelector<HTMLButtonElement>('.media-card button')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('không hiển thị URL ảnh ngoài Cloudinary', async () => {
    const fixture = TestBed.createComponent(MemoryDetailPage);
    http.expectOne('/api/v1/memories/memory-1').flush({ data: memory });
    await Promise.resolve();
    http.expectOne('/api/v1/media/image-1/download').flush({
      data: {
        url: 'https://api.cloudinary.com.evil.example/image.jpg',
        expiresAt: '2026-10-30T09:00:00Z',
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.media-card img')).toBeNull();
    expect(element.querySelector('.media-card')?.textContent).toContain('Không tải được ảnh');
  });

  it('hiển thị lỗi nếu trình duyệt không tải được ảnh', async () => {
    const fixture = TestBed.createComponent(MemoryDetailPage);
    http.expectOne('/api/v1/memories/memory-1').flush({ data: memory });
    await Promise.resolve();
    http.expectOne('/api/v1/media/image-1/download').flush({
      data: {
        url: 'https://api.cloudinary.com/v1_1/demo/image/download?signature=signed',
        expiresAt: '2026-10-30T09:00:00Z',
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLImageElement>('.media-card img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('.media-card img')).toBeNull();
    expect(element.querySelector('.media-card [role="alert"]')?.textContent).toContain(
      'Không tải được ảnh',
    );
  });
});
