import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { ERROR_CODE, ProblemDetail, isProblemDetail } from '@core/models/problem-detail.model';
import { Profile, UpsertProfileRequest } from '@features/profile/models/profile.models';
import { ProfileService } from '@features/profile/services/profile.service';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: ProblemDetail | null;
  /** True when the account exists but has no profile row yet. */
  needsSetup: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  saving: false,
  error: null,
  needsSetup: false,
};

/**
 * State for the profile screen.
 *
 * Feature-scoped, not root-provided: it is registered by `PROFILE_ROUTES`, so
 * it is created when the user opens the profile page and destroyed when they
 * leave. A root singleton would keep one user's personal data alive in memory
 * for the whole session, including after a logout.
 */
export const ProfileStore = signalStore(
  withState(initialState),

  withComputed(({ profile }) => ({
    displayName: computed(() => profile()?.fullName ?? ''),
    hasProfile: computed(() => profile() !== null),
  })),

  withMethods((store, profileService = inject(ProfileService)) => ({
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null, needsSetup: false });

      try {
        const profile = await firstValueFrom(profileService.myProfile());
        patchState(store, { profile, loading: false });
      } catch (error) {
        if (isProblemDetail(error) && error.errorCode === ERROR_CODE.profileNotFound) {
          patchState(store, { loading: false, needsSetup: true, profile: null });
          return;
        }

        patchState(store, {
          loading: false,
          error: isProblemDetail(error) ? error : null,
        });
      }
    },

    async save(request: UpsertProfileRequest): Promise<boolean> {
      patchState(store, { saving: true, error: null });

      try {
        const profile = await firstValueFrom(profileService.save(request));
        patchState(store, { profile, saving: false, needsSetup: false });
        return true;
      } catch (error) {
        patchState(store, {
          saving: false,
          error: isProblemDetail(error) ? error : null,
        });
        return false;
      }
    },

    clearError(): void {
      patchState(store, { error: null });
    },
  })),
);
