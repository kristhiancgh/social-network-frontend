import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * The root component is deliberately empty.
 *
 * Everything visible lives in a routed component: `MainLayoutComponent` for the
 * signed-in shell, and the login page standing alone. Putting the header here
 * instead would render it on the login screen too, and would tie the WebSocket
 * lifecycle to the application rather than to the session.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {}
