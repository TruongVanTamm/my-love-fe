import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('hiển thị trang khởi đầu bằng tiếng Việt', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('main h1')?.textContent).toBe('My Love');
    expect(element.querySelector('main p')?.textContent).toBe('Sẵn sàng cho những điều mới.');
    expect(element.querySelector('router-outlet')).not.toBeNull();
    expect(element.querySelector('.angular-logo')).toBeNull();
  });
});
