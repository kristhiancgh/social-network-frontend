import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '@core/config/api.config';
import { Profile, UpsertProfileRequest } from '@features/profile/models/profile.models';

/** HTTP access to profile-service. Stateless; state lives in `ProfileStore`. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  myProfile(): Observable<Profile> {
    return this.http.get<Profile>(API.profiles.me);
  }

  byUserId(userId: string): Observable<Profile> {
    return this.http.get<Profile>(API.profiles.byUserId(userId));
  }

  /** Creates on the first call, updates afterwards - the server decides which. */
  save(request: UpsertProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(API.profiles.me, request);
  }
}
