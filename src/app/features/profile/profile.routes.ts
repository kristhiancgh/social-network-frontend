import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/guards/auth.guard';

/** The profile feature: lazy-loaded, guarded, self-contained. */
export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@features/profile/pages/profile/profile.page').then((m) => m.ProfilePage),
    title: 'Profile - social.network',
  },
];
