import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UniversePage } from './universe-page';
import type { UniverseData } from './universe.model';

const star = {
  id: 'a'.repeat(24),
  sourceType: 'memory' as const,
  sourceId: 'b'.repeat(24),
  constellationId: null,
  position: { x: 1, y: 2, z: 3 },
  appearance: { size: 1, variant: 'memory', colorKey: 'rose' },
  layoutVersion: 1,
};
const sky: UniverseData = {
  stars: [star],
  constellations: [],
  settings: {
    theme: 'night',
    animationEnabled: true,
    reducedMotion: false,
    anniversaryEffectsEnabled: true,
  },
  anniversary: false,
  timezone: 'Asia/Ho_Chi_Minh',
};

describe('Universe ở viewport điện thoại và tablet', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UniversePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
  ])('có danh sách truy cập được và mở đúng câu chuyện ở %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(UniversePage);
    http.expectOne('/api/v1/universe').flush({ data: sky });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.universe-stats')?.textContent).toContain('1 ngôi sao');
    expect(element.querySelector('summary')?.textContent).toContain('1 câu chuyện');
    const button = element.querySelector<HTMLButtonElement>('.star-list button');
    expect(button?.getBoundingClientRect).toBeDefined();
    button?.click();
    http.expectOne(`/api/v1/universe/stars/${star.id}`).flush({
      data: {
        ...star,
        source: {
          id: star.sourceId,
          title: 'Ngày đầu tiên',
          description: 'Bên nhau',
          happenedAt: '2025-02-28T00:00:00Z',
          media: [],
        },
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.story-panel h2')?.textContent).toBe('Ngày đầu tiên');
    const close = element.querySelector<HTMLButtonElement>('.close-button');
    close?.click();
    fixture.detectChanges();
    expect(element.querySelector('.story-panel')).toBeNull();
  });

  it('hiển thị lỗi API và nút thử lại', async () => {
    const fixture = TestBed.createComponent(UniversePage);
    http.expectOne('/api/v1/universe').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('Chưa kết nối');
    const retry = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.error-banner button',
    );
    retry?.click();
    http.expectOne('/api/v1/universe').flush({ data: { ...sky, stars: [] } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.universe-empty')).not.toBeNull();
  });

  it('tạo chòm sao và gỡ sao mà không xóa nguồn', async () => {
    const fixture = TestBed.createComponent(UniversePage);
    http.expectOne('/api/v1/universe').flush({ data: sky });
    await fixture.whenStable();
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.star-list button')
      ?.click();
    http.expectOne(`/api/v1/universe/stars/${star.id}`).flush({
      data: {
        ...star,
        source: {
          id: star.sourceId,
          title: 'Ngày đầu',
          description: '',
          happenedAt: '2025-01-01T00:00:00Z',
          media: [],
        },
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#new-group',
    );
    if (!input) throw new Error('Thiếu ô tạo chòm sao');
    input.value = 'Dải Ngân Hà';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.new-group-row button')
      ?.click();
    const created = http.expectOne('/api/v1/universe/constellations');
    expect(created.request.body).toEqual({ name: 'Dải Ngân Hà' });
    const group = {
      id: 'c'.repeat(24),
      name: 'Dải Ngân Hà',
      description: '',
      theme: 'gold',
      milestoneId: null,
      layout: { centerX: 1, centerY: 2, centerZ: 3, scale: 1 },
    };
    created.flush({ data: group });
    await Promise.resolve();
    const assigned = http.expectOne(`/api/v1/universe/stars/${star.id}`);
    expect(assigned.request.body).toEqual({ constellationId: group.id });
    assigned.flush({ data: { ...star, constellationId: group.id } });
    await Promise.resolve();
    http.expectOne('/api/v1/universe').flush({
      data: { ...sky, stars: [{ ...star, constellationId: group.id }], constellations: [group] },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('#star-group')?.textContent,
    ).toContain('Dải Ngân Hà');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.remove-star')
      ?.click();
    http
      .expectOne(`/api/v1/universe/stars/${star.id}`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await Promise.resolve();
    http.expectOne('/api/v1/universe').flush({ data: { ...sky, stars: [] } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.universe-empty')).not.toBeNull();
  });
});
