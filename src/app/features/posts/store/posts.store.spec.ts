import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AuthStore } from '@core/auth/store/auth.store';
import { PageResponse } from '@core/models/page.model';
import { ProblemDetail } from '@core/models/problem-detail.model';
import { LikeChangedEvent, PostCreatedEvent } from '@core/realtime/models/realtime.models';
import { RealtimeService } from '@core/realtime/services/realtime.service';
import { Post, PostLikeSummary } from '@features/posts/models/posts.models';
import { PostsService } from '@features/posts/services/posts.service';
import { PostsStore } from './posts.store';

const ME = '11111111-1111-1111-1111-111111110101';
const SOMEONE_ELSE = '11111111-1111-1111-1111-111111110102';

const POST_A: Post = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  authorId: SOMEONE_ELSE,
  authorUsername: 'mgarcia',
  authorAlias: 'mary_g',
  message: 'First',
  publishedAt: '2026-07-27T10:00:00Z',
};

const POST_B: Post = {
  id: 'bbbbbbbb-0000-0000-0000-000000000002',
  authorId: SOMEONE_ELSE,
  authorUsername: 'lchen',
  authorAlias: 'li_chen',
  message: 'Second',
  publishedAt: '2026-07-27T09:00:00Z',
};

function page(content: Post[], last = true): PageResponse<Post> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, last };
}

const SUMMARIES: PostLikeSummary[] = [
  { postId: POST_A.id, likeCount: 3, likedByMe: false },
  { postId: POST_B.id, likeCount: 1, likedByMe: true },
];

describe('PostsStore', () => {
  let postsService: jasmine.SpyObj<PostsService>;
  let lastLikeEvent: ReturnType<typeof signal<LikeChangedEvent | null>>;
  let lastPostEvent: ReturnType<typeof signal<PostCreatedEvent | null>>;

  beforeEach(() => {
    postsService = jasmine.createSpyObj<PostsService>('PostsService', [
      'timeline',
      'create',
      'delete',
      'likeSummaries',
      'toggleLike',
    ]);
    postsService.timeline.and.returnValue(of(page([POST_A, POST_B])));
    postsService.likeSummaries.and.returnValue(of(SUMMARIES));

    lastLikeEvent = signal<LikeChangedEvent | null>(null);
    lastPostEvent = signal<PostCreatedEvent | null>(null);

    TestBed.configureTestingModule({
      providers: [
        PostsStore,
        { provide: PostsService, useValue: postsService },
        {
          provide: RealtimeService,
          useValue: {
            lastLikeEvent,
            lastPostEvent,
            status: signal('connected'),
            connect: () => {},
            disconnect: () => {},
          },
        },
        { provide: AuthStore, useValue: { userId: () => ME } },
      ],
    });
  });

  async function createStore() {
    const store = TestBed.inject(PostsStore);
    await Promise.resolve();
    await Promise.resolve();
    return store;
  }

  describe('load', () => {
    it('joins posts with their like state', async () => {
      const store = await createStore();

      expect(store.posts().length).toBe(2);
      expect(store.posts()[0].likeCount).toBe(3);
      expect(store.posts()[0].likedByMe).toBeFalse();
      expect(store.posts()[1].likeCount).toBe(1);
      expect(store.posts()[1].likedByMe).toBeTrue();
    });

    it('asks for the timeline including the caller\'s own posts', async () => {
      await createStore();

      expect(postsService.timeline).toHaveBeenCalledWith(0, 20, true);
    });

    it('reports zero likes for a post with no counter row rather than dropping it', async () => {
      postsService.likeSummaries.and.returnValue(of([SUMMARIES[0]]));
      const store = await createStore();

      expect(store.posts().length).toBe(2);
      expect(store.posts()[1].likeCount).toBe(0);
      expect(store.posts()[1].likedByMe).toBeFalse();
    });

    it('surfaces a failure without leaving the spinner running', async () => {
      const problem: ProblemDetail = {
        type: 'x', title: 'Unauthorized', status: 401, detail: 'nope',
        errorCode: 'UNAUTHENTICATED', traceId: 't', timestamp: 'now', service: 'post-service',
      };
      postsService.timeline.and.returnValue(throwError(() => problem));
      const store = await createStore();

      expect(store.error()?.errorCode).toBe('UNAUTHENTICATED');
      expect(store.loading()).toBeFalse();
    });
  });

  describe('toggleLike', () => {
    it('moves the counter before the server answers', async () => {
      const store = await createStore();
      postsService.toggleLike.and.returnValue(new Promise(() => {}) as never);

      void store.toggleLike(POST_A.id);

      expect(store.posts()[0].likedByMe).toBeTrue();
      expect(store.posts()[0].likeCount).toBe(4);
    });

    it('trusts the server total over the optimistic guess', async () => {
      const store = await createStore();
      postsService.toggleLike.and.returnValue(
        of({ postId: POST_A.id, liked: true, likeCount: 9 }),
      );

      await store.toggleLike(POST_A.id);

      expect(store.posts()[0].likeCount).toBe(9);
      expect(store.posts()[0].likePending).toBeFalse();
    });

    it('rolls back when the request fails', async () => {
      const store = await createStore();
      postsService.toggleLike.and.returnValue(throwError(() => new Error('boom')));

      await store.toggleLike(POST_A.id);

      expect(store.posts()[0].likedByMe).toBeFalse();
      expect(store.posts()[0].likeCount).toBe(3);
      expect(store.posts()[0].likePending).toBeFalse();
    });

    it('ignores a second click while the first is in flight', async () => {
      const store = await createStore();
      postsService.toggleLike.and.returnValue(new Promise(() => {}) as never);

      void store.toggleLike(POST_A.id);
      void store.toggleLike(POST_A.id);

      expect(postsService.toggleLike).toHaveBeenCalledTimes(1);
    });
  });

  describe('applyRealtimeEvent', () => {
    it('applies somebody else\'s like to the count but not to my heart', async () => {
      const store = await createStore();

      store.applyRealtimeEvent({
        postId: POST_A.id,
        likeCount: 4,
        liked: true,
        actorId: SOMEONE_ELSE,
        actorUsername: 'mgarcia',
        occurredAt: '2026-07-27T12:00:00Z',
      });

      expect(store.posts()[0].likeCount).toBe(4);
      expect(store.posts()[0].likedByMe).toBeFalse();
    });

    it('applies my own like from another tab to both the count and my heart', async () => {
      const store = await createStore();

      store.applyRealtimeEvent({
        postId: POST_A.id,
        likeCount: 4,
        liked: true,
        actorId: ME,
        actorUsername: 'jdoe',
        occurredAt: '2026-07-27T12:00:00Z',
      });

      expect(store.posts()[0].likeCount).toBe(4);
      expect(store.posts()[0].likedByMe).toBeTrue();
    });

    it('ignores an event for a post that is not loaded', async () => {
      const store = await createStore();
      const before = store.posts();

      store.applyRealtimeEvent({
        postId: 'cccccccc-0000-0000-0000-000000000003',
        likeCount: 99,
        liked: true,
        actorId: SOMEONE_ELSE,
        actorUsername: 'lchen',
        occurredAt: '2026-07-27T12:00:00Z',
      });

      expect(store.posts()).toEqual(before);
    });

    it('leaves a post alone while my own toggle is still in flight', async () => {
      const store = await createStore();
      postsService.toggleLike.and.returnValue(new Promise(() => {}) as never);
      void store.toggleLike(POST_A.id);

      store.applyRealtimeEvent({
        postId: POST_A.id,
        likeCount: 77,
        liked: false,
        actorId: SOMEONE_ELSE,
        actorUsername: 'mgarcia',
        occurredAt: '2026-07-27T12:00:00Z',
      });

      expect(store.posts()[0].likeCount).toBe(4);
    });

    it('is wired to the RealtimeService signal', async () => {
      const store = await createStore();

      lastLikeEvent.set({
        postId: POST_B.id,
        likeCount: 42,
        liked: true,
        actorId: SOMEONE_ELSE,
        actorUsername: 'lchen',
        occurredAt: '2026-07-27T12:00:00Z',
      });
      TestBed.flushEffects();

      expect(store.posts()[1].likeCount).toBe(42);
    });
  });

  describe('applyNewPost', () => {
    function event(overrides: Partial<PostCreatedEvent> = {}): PostCreatedEvent {
      return {
        postId: 'eeeeeeee-0000-0000-0000-000000000005',
        authorId: SOMEONE_ELSE,
        authorUsername: 'lchen',
        authorAlias: 'li_chen',
        message: 'Something new',
        publishedAt: '2026-07-28T12:00:00Z',
        occurredAt: '2026-07-28T12:00:00Z',
        ...overrides,
      };
    }

    it('prepends somebody else\'s new publication', async () => {
      const store = await createStore();

      store.applyNewPost(event());

      expect(store.posts().length).toBe(3);
      expect(store.posts()[0].message).toBe('Something new');
      expect(store.posts()[0].authorUsername).toBe('lchen');
      expect(store.posts()[0].likeCount).toBe(0);
      expect(store.posts()[0].likedByMe).toBeFalse();
      expect(store.totalElements()).toBe(3);
    });

    it('accepts my own publication, so a second tab stays in step', async () => {
      const store = await createStore();

      store.applyNewPost(event({ authorId: ME, authorUsername: 'jdoe' }));

      expect(store.posts().length).toBe(3);
      expect(store.posts()[0].authorUsername).toBe('jdoe');
    });

    it('ignores a post that is already on screen', async () => {
      const store = await createStore();

      store.applyNewPost(event({ postId: POST_A.id }));

      expect(store.posts().length).toBe(2);
    });

    it('does not reload the timeline', async () => {
      const store = await createStore();

      store.applyNewPost(event());

      expect(postsService.timeline).toHaveBeenCalledTimes(1);
    });

    it('is wired to the RealtimeService signal', async () => {
      const store = await createStore();

      lastPostEvent.set(event({ message: 'Live from the socket' }));
      TestBed.flushEffects();

      expect(store.posts()[0].message).toBe('Live from the socket');
    });
  });

  describe('create', () => {
    it('prepends the new post without reloading the timeline', async () => {
      const store = await createStore();
      const created: Post = {
        id: 'dddddddd-0000-0000-0000-000000000004',
        authorId: ME,
        authorUsername: 'jdoe',
        authorAlias: 'johnny',
        message: 'Hello',
        publishedAt: '2026-07-27T12:00:00Z',
      };
      postsService.create.and.returnValue(of(created));

      const ok = await store.create('Hello');

      expect(ok).toBeTrue();
      expect(store.posts()[0].id).toBe(created.id);
      expect(store.posts()[0].likeCount).toBe(0);
      expect(postsService.timeline).toHaveBeenCalledTimes(1);
    });

    it('does not duplicate the post when the broadcast wins the race', async () => {
      const store = await createStore();
      const created: Post = {
        id: 'dddddddd-0000-0000-0000-000000000004',
        authorId: ME,
        authorUsername: 'jdoe',
        authorAlias: 'johnny',
        message: 'Hello',
        publishedAt: '2026-07-28T12:00:00Z',
      };
      postsService.create.and.returnValue(of(created));

      store.applyNewPost({
        postId: created.id,
        authorId: ME,
        authorUsername: 'jdoe',
        authorAlias: 'johnny',
        message: 'Hello',
        publishedAt: created.publishedAt,
        occurredAt: created.publishedAt,
      });
      await store.create('Hello');

      expect(store.posts().filter((post) => post.id === created.id).length).toBe(1);
      expect(store.posts().length).toBe(3);
    });

    it('reports a rejected duplicate without adding anything', async () => {
      const store = await createStore();
      const duplicate: ProblemDetail = {
        type: 'x', title: 'Duplicate post', status: 409, detail: 'just published',
        errorCode: 'DUPLICATE_POST', traceId: 't', timestamp: 'now', service: 'post-service',
      };
      postsService.create.and.returnValue(throwError(() => duplicate));

      const ok = await store.create('Hello');

      expect(ok).toBeFalse();
      expect(store.error()?.errorCode).toBe('DUPLICATE_POST');
      expect(store.posts().length).toBe(2);
    });
  });
});
