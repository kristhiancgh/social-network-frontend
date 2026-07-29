import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { TimelinePost } from '@features/posts/models/posts.models';

/**
 * One post in the timeline, with its like button.
 *
 * Presentational: it takes a post and emits an intent. It never calls a service
 * and never knows a store exists, which is what lets the same card be dropped
 * into a profile page or a search result without dragging the timeline's state
 * along with it.
 */
@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, RelativeTimePipe],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  readonly post = input.required<TimelinePost>();

  /** Emits the post id. The parent decides what liking actually means. */
  readonly likeToggled = output<string>();
}
