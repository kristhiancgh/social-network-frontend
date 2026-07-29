import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '@core/auth/store/auth.store';
import { ProblemDetail, isProblemDetail } from '@core/models/problem-detail.model';
import { RealtimeService } from '@core/realtime/services/realtime.service';
import { LikeChangedEvent, PostCreatedEvent } from '@core/realtime/models/realtime.models';
import { Post, TimelinePost } from '@features/posts/models/posts.models';
import { PostsService } from '@features/posts/services/posts.service';

const PAGE_SIZE = 20;

interface PostsState {
  posts: TimelinePost[];
  page: number;
  totalElements: number;
  last: boolean;
  loading: boolean;
  loadingMore: boolean;
  creating: boolean;
  error: ProblemDetail | null;
}

const initialState: PostsState = {
  posts: [],
  page: 0,
  totalElements: 0,
  last: true,
  loading: false,
  loadingMore: false,
  creating: false,
  error: null,
};

/**
 * State for the timeline.
 *
 * Feature-scoped and provided by `POSTS_ROUTES`, so leaving the page frees the
 * loaded posts instead of holding every page the user ever scrolled through for
 * the lifetime of the tab.
 */
export const PostsStore = signalStore(
  withState(initialState),

  withComputed(({ posts, totalElements, last }) => ({
    isEmpty: computed(() => posts().length === 0),
    hasMore: computed(() => !last()),
    loadedCount: computed(() => posts().length),
    remaining: computed(() => Math.max(0, totalElements() - posts().length)),
  })),

  withMethods((store, postsService = inject(PostsService), authStore = inject(AuthStore)) => {
    async function fetchPage(page: number): Promise<{
      posts: TimelinePost[];
      totalElements: number;
      last: boolean;
    }> {
      const pageResponse = await firstValueFrom(postsService.timeline(page, PAGE_SIZE, true));
      const postIds = pageResponse.content.map((post: Post) => post.id);
      const summaries = await firstValueFrom(postsService.likeSummaries(postIds));

      const summaryByPostId = new Map(summaries.map((summary) => [summary.postId, summary]));

      return {
        posts: pageResponse.content.map((post) => ({
          ...post,
          likeCount: summaryByPostId.get(post.id)?.likeCount ?? 0,
          likedByMe: summaryByPostId.get(post.id)?.likedByMe ?? false,
          likePending: false,
        })),
        totalElements: pageResponse.totalElements,
        last: pageResponse.last,
      };
    }

    function fail(error: unknown, patch: Partial<PostsState>): void {
      patchState(store, {
        ...patch,
        error: isProblemDetail(error) ? error : null,
      });
    }

    return {
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const result = await fetchPage(0);
          patchState(store, {
            posts: result.posts,
            page: 0,
            totalElements: result.totalElements,
            last: result.last,
            loading: false,
          });
        } catch (error) {
          fail(error, { loading: false });
        }
      },

      async loadMore(): Promise<void> {
        if (store.last() || store.loadingMore()) {
          return;
        }

        const nextPage = store.page() + 1;
        patchState(store, { loadingMore: true, error: null });

        try {
          const result = await fetchPage(nextPage);
          patchState(store, {
            posts: [...store.posts(), ...result.posts],
            page: nextPage,
            totalElements: result.totalElements,
            last: result.last,
            loadingMore: false,
          });
        } catch (error) {
          fail(error, { loadingMore: false });
        }
      },

      async create(message: string): Promise<boolean> {
        patchState(store, { creating: true, error: null });

        try {
          const created = await firstValueFrom(postsService.create(message));

          const alreadyPresent = store.posts().some((post) => post.id === created.id);

          patchState(store, {
            posts: alreadyPresent
              ? store.posts()
              : [{ ...created, likeCount: 0, likedByMe: false, likePending: false },
                 ...store.posts()],
            totalElements: alreadyPresent ? store.totalElements() : store.totalElements() + 1,
            creating: false,
          });
          return true;
        } catch (error) {
          fail(error, { creating: false });
          return false;
        }
      },

      async toggleLike(postId: string): Promise<void> {
        const current = store.posts().find((post) => post.id === postId);
        if (!current || current.likePending) {
          return;
        }

        const previousLiked = current.likedByMe;
        const previousCount = current.likeCount;

        patchState(store, {
          posts: store.posts().map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likedByMe: !previousLiked,
                  likeCount: previousCount + (previousLiked ? -1 : 1),
                  likePending: true,
                }
              : post,
          ),
        });

        try {
          const result = await firstValueFrom(postsService.toggleLike(postId));

          patchState(store, {
            posts: store.posts().map((post) =>
              post.id === postId
                ? { ...post, likedByMe: result.liked, likeCount: result.likeCount, likePending: false }
                : post,
            ),
          });
        } catch (error) {
          patchState(store, {
            posts: store.posts().map((post) =>
              post.id === postId
                ? { ...post, likedByMe: previousLiked, likeCount: previousCount, likePending: false }
                : post,
            ),
          });
          fail(error, {});
        }
      },

      applyRealtimeEvent(event: LikeChangedEvent): void {
        const currentUserId = authStore.userId();

        const known = store.posts().some((post) => post.id === event.postId);
        if (!known) {
          return;
        }

        patchState(store, {
          posts: store.posts().map((post) => {
            if (post.id !== event.postId) {
              return post;
            }
            if (post.likePending) {
              return post;
            }
            return {
              ...post,
              likeCount: event.likeCount,
              likedByMe: event.actorId === currentUserId ? event.liked : post.likedByMe,
            };
          }),
        });
      },

      applyNewPost(event: PostCreatedEvent): void {
        if (store.posts().some((post) => post.id === event.postId)) {
          return;
        }

        patchState(store, {
          posts: [
            {
              id: event.postId,
              authorId: event.authorId,
              authorUsername: event.authorUsername,
              authorAlias: event.authorAlias,
              message: event.message,
              publishedAt: event.publishedAt,
              likeCount: 0,
              likedByMe: false,
              likePending: false,
            },
            ...store.posts(),
          ],
          totalElements: store.totalElements() + 1,
        });
      },

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),

  withHooks({
    onInit(store, realtime = inject(RealtimeService)) {
      void store.load();

      effect(() => {
        const event = realtime.lastLikeEvent();
        if (event) {
          untracked(() => store.applyRealtimeEvent(event));
        }
      });

      effect(() => {
        const event = realtime.lastPostEvent();
        if (event) {
          untracked(() => store.applyNewPost(event));
        }
      });
    },
  }),
);
