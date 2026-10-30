import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('dùng router-outlet cho các trang được lazy-load', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('giữ Open When và không đăng ký route của các chức năng đã bỏ', () => {
    const paths = routes.flatMap((route) => route.children?.map((child) => child.path) ?? []);
    expect(paths).toContain('open-when');
    expect(paths).not.toContain('letters');
    expect(paths).not.toContain('letters/:id');
    expect(paths).not.toContain('calendar');
    expect(paths).not.toContain('notifications');
  });
});
