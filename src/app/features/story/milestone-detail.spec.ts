import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MilestoneDetailPage } from './milestone-detail';

describe('Trang nguồn Milestone', () => {
  let http: HttpTestingController;
  const id = 'a'.repeat(24);

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MilestoneDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
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
    [1180, 820],
  ])('mở đúng cột mốc ở %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(MilestoneDetailPage);
    http.expectOne(`/api/v1/story/${id}`).flush({
      data: {
        id,
        title: 'Ngày đầu gặp nhau',
        description: 'Một buổi chiều',
        happenedAt: '2025-02-28T00:00:00Z',
        highlighted: true,
        mediaIds: [],
        createdBy: 'owner',
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toBe('Ngày đầu gặp nhau');
    expect(element.querySelector('article')?.textContent).toContain('Một buổi chiều');
    expect(element.querySelector('a[href="/story"]')).not.toBeNull();
  });
});
