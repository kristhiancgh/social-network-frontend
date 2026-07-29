/**
 * Mirrors `dev.social.like.realtime.dto.LikeChangedEvent`.
 *
 * It carries one shared fact and one personal one:
 *  - `likeCount` is true for everybody and is applied unconditionally.
 *  - `liked` describes `actorId` only. A client updates its own heart only when
 *    `actorId` is itself; otherwise the button would light up because somebody
 *    *else* liked the post.
 */
export interface LikeChangedEvent {
  postId: string;
  likeCount: number;
  liked: boolean;
  actorId: string;
  actorUsername: string;
  occurredAt: string;
}

/**
 * Mirrors `dev.social.post.realtime.dto.PostCreatedEvent`.
 *
 * The whole post travels, not just its id: a client given only an id would have
 * to fetch it before rendering, which is one extra round trip per publication
 * multiplied by every connected browser.
 *
 * `authorId` is what lets a client decide whether the post belongs on its
 * screen — the timeline shows other people's publications, so a browser ignores
 * the event when the author is the user reading it.
 */
export interface PostCreatedEvent {
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAlias?: string;
  message: string;
  publishedAt: string;
  occurredAt: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
