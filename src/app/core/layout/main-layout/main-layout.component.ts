import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '@core/auth/store/auth.store';
import { RealtimeService } from '@core/realtime/services/realtime.service';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';

/**
 * The application shell: header, navigation, router outlet.
 *
 * It also owns the WebSocket lifecycle, and that placement is deliberate. The
 * layout exists for exactly as long as the user is logged in, so tying the
 * socket to it means one connection per session - opened when a token appears,
 * closed when it goes. Putting the same logic in the posts page would reopen
 * the socket every time the user visited the timeline.
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly realtime = inject(RealtimeService);

  constructor() {
    effect(() => {
      const token = this.authStore.token();
      if (token) {
        this.realtime.connect(token);
      } else {
        this.realtime.disconnect();
      }
    });
  }
}
