import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';

import {
  TOPIC_ALL_LIKES,
  TOPIC_NEW_POSTS,
  likesWebSocketUrl,
  postsWebSocketUrl,
} from '@core/config/api.config';
import { ConnectionStatus, LikeChangedEvent, PostCreatedEvent } from '@core/realtime/models/realtime.models';

/** One managed STOMP connection. */
interface Channel {
  client: Client | null;
  status: ReturnType<typeof signal<ConnectionStatus>>;
}

/**
 * All real-time connections, as a singleton.
 *
 * <h2>Two sockets, one API</h2>
 * Two services produce real-time events and each owns its own endpoint:
 * like-service on `/ws` announces like changes, post-service on `/ws-posts`
 * announces new publications. The alternative - one service calling the other
 * to broadcast on its behalf - would make publishing a post depend on
 * like-service being up, coupling them exactly where the architecture says they
 * should be independent.
 *
 * That cost is contained here. Callers see `status`, `lastLikeEvent` and
 * `lastPostEvent`; they never learn there is more than one connection.
 *
 * <h2>What it does not know</h2>
 * Nothing about posts, likes or the timeline. Feature stores read the signals
 * through an `effect` and update themselves, so a future feature that also
 * wants live updates subscribes here instead of opening a third socket.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly likes: Channel = { client: null, status: signal<ConnectionStatus>('idle') };
  private readonly posts: Channel = { client: null, status: signal<ConnectionStatus>('idle') };

  private readonly _lastLikeEvent = signal<LikeChangedEvent | null>(null);
  private readonly _lastPostEvent = signal<PostCreatedEvent | null>(null);

  /**
   * Overall connection state, for the indicator in the header.
   *
   * Reports the worse of the two, deliberately: if likes are live but new posts
   * are not, the user is *not* fully up to date, and a green dot would be a lie.
   */
  readonly status = computed<ConnectionStatus>(() => {
    const states = [this.likes.status(), this.posts.status()];
    if (states.includes('error')) return 'error';
    if (states.includes('disconnected')) return 'disconnected';
    if (states.includes('connecting')) return 'connecting';
    if (states.every((state) => state === 'connected')) return 'connected';
    return 'idle';
  });

  /**
   * The most recent like change.
   *
   * A signal holding the latest value rather than a stream of every value: a
   * store only ever needs to apply the newest total for a post, and a replayed
   * backlog after a reconnect would write stale counts over fresh ones.
   */
  readonly lastLikeEvent = this._lastLikeEvent.asReadonly();

  /**
   * The most recent publication.
   *
   * Unlike likes, posts are cumulative - each event is a distinct post, so
   * consumers must react to every one. That works because a signal notifies on
   * each `set`, and two different posts are never equal by reference.
   */
  readonly lastPostEvent = this._lastPostEvent.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /**
   * Opens both connections.
   *
   * @param token the JWT. It travels on the STOMP CONNECT frame rather than the
   *   HTTP handshake, because a browser cannot set headers on a WebSocket
   *   handshake and a query-string token would be written to every access log.
   */
  connect(token: string): void {
    this.open(this.likes, likesWebSocketUrl(), token, TOPIC_ALL_LIKES, (body) =>
      this._lastLikeEvent.set(body as LikeChangedEvent),
    );
    this.open(this.posts, postsWebSocketUrl(), token, TOPIC_NEW_POSTS, (body) =>
      this._lastPostEvent.set(body as PostCreatedEvent),
    );
  }

  /** Closes both. Called on logout, so the next user starts clean. */
  disconnect(): void {
    this.close(this.likes);
    this.close(this.posts);
    this._lastLikeEvent.set(null);
    this._lastPostEvent.set(null);
  }

  private open(
    channel: Channel,
    url: string,
    token: string,
    topic: string,
    onEvent: (body: unknown) => void,
  ): void {
    if (channel.client?.active) {
      return;
    }

    channel.status.set('connecting');

    channel.client = new Client({
      webSocketFactory: () => new WebSocket(url),
      connectHeaders: { Authorization: `Bearer ${token}` },

      reconnectDelay: 5000,

      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      debug: () => {},

      onConnect: () => {
        channel.status.set('connected');
        channel.client?.subscribe(topic, (message: IMessage) => {
          try {
            onEvent(JSON.parse(message.body));
          } catch {
          }
        });
      },

      onStompError: () => channel.status.set('error'),
      onWebSocketError: () => channel.status.set('error'),
      onWebSocketClose: () => {
        if (channel.status() === 'connected') {
          channel.status.set('disconnected');
        }
      },
    });

    channel.client.activate();
  }

  private close(channel: Channel): void {
    if (!channel.client) {
      return;
    }
    void channel.client.deactivate();
    channel.client = null;
    channel.status.set('idle');
  }
}
