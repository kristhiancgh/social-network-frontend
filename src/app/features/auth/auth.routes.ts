import { Routes } from '@angular/router';

import { guestGuard } from '@core/auth/guards/guest.guard';

/**
 * The auth feature, lazy-loaded and self-contained.
 *
 * `guestGuard` keeps someone who is already signed in from seeing this form -
 * landing on a login page when you are logged in is confusing, and submitting
 * it would replace a perfectly good session.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/pages/login/login.page').then((m) => m.LoginPage),
    title: 'Sign in - social.network',
  },
];
