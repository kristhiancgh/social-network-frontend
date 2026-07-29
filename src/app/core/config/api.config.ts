/**
 * Where the API lives.
 *
 * Every path is RELATIVE on purpose. The same compiled bundle therefore works
 * in both places it has to run:
 *
 *   ng serve   -> proxy.conf.json forwards /api and /ws to localhost:8080
 *   docker     -> nginx.conf forwards /api and /ws to api-gateway:8080
 *
 * The alternative - environment.ts with an absolute URL swapped at build time -
 * means the Docker image is tied to the hostname it was built for, so the same
 * artefact cannot be promoted from staging to production. Relative paths remove
 * the problem instead of managing it.
 */
export const API = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
  },
  profiles: {
    me: '/api/profiles/me',
    byUserId: (userId: string) => `/api/profiles/${userId}`,
    byAlias: (alias: string) => `/api/profiles/by-alias/${alias}`,
  },
  posts: {
    base: '/api/posts',
    byId: (postId: string) => `/api/posts/${postId}`,
    byAuthor: (authorId: string) => `/api/posts/author/${authorId}`,
  },
  likes: {
    base: '/api/likes',
    counts: '/api/likes/counts',
    forPost: (postId: string) => `/api/likes/post/${postId}`,
  },
} as const;

/**
 * STOMP endpoints, built from the page's own origin so they follow the host the
 * app was served from. `wss` when the page is on https - a browser refuses a
 * plain `ws` socket opened from a secure page, and hardcoding `ws` is the usual
 * reason real-time works locally and dies behind TLS.
 *
 * There are two, because two services produce real-time events and each owns
 * its own endpoint: like-service announces like changes, post-service announces
 * new publications. Having one broadcast on the other's behalf would couple
 * them, so the browser holds two connections and `RealtimeService` hides that
 * behind a single API.
 */
function stompUrl(path: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

/** like-service: like changes. */
export function likesWebSocketUrl(): string {
  return stompUrl('/ws');
}

/** post-service: new publications. */
export function postsWebSocketUrl(): string {
  return stompUrl('/ws-posts');
}

/** Topic carrying every like in the network. Matches LikeEventBroadcaster. */
export const TOPIC_ALL_LIKES = '/topic/likes';

/** Topic carrying every new publication. Matches PostEventBroadcaster. */
export const TOPIC_NEW_POSTS = '/topic/posts';

/** Storage key for the JWT. */
export const TOKEN_STORAGE_KEY = 'social.accessToken';
