import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MemoriesPage } from './memories';

describe('Bộ lọc kỷ niệm trên điện thoại và tablet', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MemoriesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
  });

  it.each([
    [390, 844],
    [768, 1024],
  ])('giữ nhãn đi cùng trường lọc ở viewport %ix%i', async (width, height) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const fixture = TestBed.createComponent(MemoriesPage);
    http.expectOne('/api/v1/memories?page=1&limit=12').flush({
      data: { items: [], meta: { total: 0, page: 1, hasNext: false } },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const fields = element.querySelectorAll('.filter-field');
    expect(fields).toHaveLength(5);
    for (const field of fields) {
      const label = field.querySelector('label');
      const control = field.querySelector('input, select');
      expect(label?.htmlFor).toBe(control?.id);
      expect(control?.id).toBeTruthy();
    }
    expect(element.querySelector('.filter-bar button[type="submit"]')?.textContent).toContain(
      'Tìm kiếm',
    );
  });
});
