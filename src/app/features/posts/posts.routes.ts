import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/guards/auth.guard';

/** The posts feature: lazy-loaded, guarded, self-contained. */
export const POSTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@features/posts/pages/timeline/timeline.page').then((m) => m.TimelinePage),
    title: 'Timeline - social.network',
  },
];
