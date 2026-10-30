import { Routes } from '@angular/router';
import { authenticated, hasCouple } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    title: 'Our Little Universe — A little place, just for us.',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'login',
    title: 'Đăng nhập · Our Little Universe',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: 'register',
    title: 'Tạo tài khoản · Our Little Universe',
    loadComponent: () => import('./features/auth/auth').then((m) => m.Auth),
  },
  {
    path: 'onboarding',
    title: 'Bắt đầu câu chuyện · Our Little Universe',
    canActivate: [authenticated],
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'invite/:token',
    title: 'Một lời mời dành cho bạn',
    loadComponent: () => import('./features/onboarding/invitation').then((m) => m.InvitationPage),
  },
  {
    path: '',
    canActivate: [authenticated],
    loadComponent: () => import('./layouts/couple-layout').then((m) => m.CoupleLayout),
    children: [
      {
        path: 'home',
        title: 'Nhà của chúng mình',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'settings/couple',
        title: 'Không gian chung',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/dashboard/space').then((m) => m.SpacePage),
      },
      {
        path: 'memories',
        title: 'Kỷ niệm',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/memories/memories').then((m) => m.MemoriesPage),
      },
      {
        path: 'memories/:id',
        title: 'Một kỷ niệm',
        canActivate: [hasCouple],
        loadComponent: () =>
          import('./features/memories/memory-detail').then((m) => m.MemoryDetailPage),
      },
      {
        path: 'albums',
        title: 'Album của chúng mình',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/albums/albums').then((m) => m.AlbumsPage),
      },
      {
        path: 'story',
        title: 'Câu chuyện của chúng mình',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/story/story').then((m) => m.StoryPage),
      },
      {
        path: 'story/:id',
        title: 'Một cột mốc · Our Little Universe',
        canActivate: [hasCouple],
        loadComponent: () =>
          import('./features/story/milestone-detail').then((m) => m.MilestoneDetailPage),
      },
      {
        path: 'open-when',
        title: 'Open When · Our Little Universe',
        canActivate: [hasCouple],
        loadComponent: () => import('./features/letters/open-when').then((m) => m.OpenWhenPage),
      },
      {
        path: 'universe',
        title: 'Bầu trời của hai ta · Our Little Universe',
        canActivate: [hasCouple],
        loadComponent: () =>
          import('./features/universe/universe-page').then((m) => m.UniversePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
