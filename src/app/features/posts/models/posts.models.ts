/** Mirrors `PostResponse` in post-service. */
export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  /** Denormalised on the server at publish time; may be absent. */
  authorAlias?: string;
  message: string;
  publishedAt: string;
}

/** Mirrors `PostLikeSummary` in like-service. */
export interface PostLikeSummary {
  postId: string;
  likeCount: number;
  likedByMe: boolean;
}

/** Mirrors `LikeToggleResponse`. */
export interface LikeToggleResult {
  postId: string;
  liked: boolean;
  likeCount: number;
}

/**
 * A post joined with its like state, for rendering.
 *
 * The join happens in the client, not the server, and that is the point: posts
 * live in postdb and likes in likedb, owned by two different services. Asking
 * post-service to embed a like count would force it to call like-service on
 * every timeline render and to fail whenever like-service is down. Two parallel
 * requests here cost one round trip and keep the services independent.
 */
export interface TimelinePost extends Post {
  likeCount: number;
  likedByMe: boolean;
  /** True while a toggle is in flight, to stop double-clicks. */
  likePending: boolean;
}
