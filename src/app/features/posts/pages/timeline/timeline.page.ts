import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RealtimeService } from '@core/realtime/services/realtime.service';
import { AlertComponent } from '@shared/components/alert/alert.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { CreatePostComponent } from '@features/posts/components/create-post/create-post.component';
import { PostCardComponent } from '@features/posts/components/post-card/post-card.component';
import { PostsStore } from '@features/posts/store/posts.store';

/**
 * The Posts screen: other users' publications, with a like button and a live
 * total, plus the composer.
 *
 * It wires components to the store and nothing else - no HTTP, no WebSocket
 * handling. The socket is owned by the layout and the events are applied by
 * `PostsStore`, so this page never subscribes to anything.
 */
@Component({
  selector: 'app-timeline-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreatePostComponent, PostCardComponent, AlertComponent, SpinnerComponent],
  providers: [PostsStore],
  templateUrl: './timeline.page.html',
  styleUrl: './timeline.page.scss',
})
export class TimelinePage {
  protected readonly store = inject(PostsStore);
  protected readonly realtime = inject(RealtimeService);

  protected publish(message: string): void {
    void this.store.create(message);
  }
}
