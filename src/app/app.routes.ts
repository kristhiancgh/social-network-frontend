import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/guards/auth.guard';
import { MainLayoutComponent } from '@core/layout/main-layout/main-layout.component';

/**
 * Top-level routing.
 *
 * Two shapes on purpose:
 *  - `/login` renders on its own, with no header. A sign-in page that shows a
 *    navigation bar and a "log out" button is confusing.
 *  - everything else renders inside `MainLayoutComponent`, which owns the
 *    header and the WebSocket connection.
 *
 * Every feature is `loadChildren`, so its code is fetched only when the route
 * is first visited. The login bundle does not carry the timeline, the STOMP
 * client or the profile form.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    // Guarded here as well as inside each feature. Belt and braces: this one
    // stops the layout (and therefore the WebSocket) from being created at all
    // for an anonymous visitor.
    canActivate: [authGuard],
    children: [
      {
        path: 'posts',
        loadChildren: () => import('@features/posts/posts.routes').then((m) => m.POSTS_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('@features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'posts' },
    ],
  },
  // Unknown URL: send them home rather than showing a dead end. The guard takes
  // over from there if they are not signed in.
  { path: '**', redirectTo: '' },
];
