import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { API } from '@core/config/api.config';
import { PageResponse } from '@core/models/page.model';
import { LikeToggleResult, Post, PostLikeSummary } from '@features/posts/models/posts.models';

/**
 * HTTP access to post-service and like-service.
 *
 * One class for two services on purpose: from the timeline's point of view they
 * are one feature, and splitting them would mean two near-identical wrappers
 * injected side by side everywhere.
 */
@Injectable({ providedIn: 'root' })
export class PostsService {
  private readonly http = inject(HttpClient);

  /**
   * @param includeOwn whether the caller's own posts are part of the result.
   *
   *   The server defaults this to `false`, matching the brief's "publicaciones
   *   de los demás usuarios". The timeline asks for `true` anyway, because
   *   hiding your own post from the screen you just published on is worse: it
   *   appeared until you refreshed and then vanished, while everyone else kept
   *   seeing it. The parameter stays on the API, so the other behaviour is
   *   still one query string away.
   */
  timeline(page: number, size: number, includeOwn = true): Observable<PageResponse<Post>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('includeOwn', includeOwn);

    return this.http.get<PageResponse<Post>>(API.posts.base, { params });
  }

  create(message: string): Observable<Post> {
    return this.http.post<Post>(API.posts.base, { message });
  }

  delete(postId: string): Observable<void> {
    return this.http.delete<void>(API.posts.byId(postId));
  }

  /**
   * Like totals for a batch of posts.
   *
   * Short-circuits on an empty list rather than sending `?postIds=` and letting
   * the server puzzle over it.
   */
  likeSummaries(postIds: string[]): Observable<PostLikeSummary[]> {
    if (postIds.length === 0) {
      return of([]);
    }
    const params = new HttpParams().set('postIds', postIds.join(','));
    return this.http.get<PostLikeSummary[]>(API.likes.counts, { params });
  }

  /** Toggles. Sending it twice returns the post to its original state. */
  toggleLike(postId: string): Observable<LikeToggleResult> {
    return this.http.post<LikeToggleResult>(API.likes.base, { postId });
  }
}
