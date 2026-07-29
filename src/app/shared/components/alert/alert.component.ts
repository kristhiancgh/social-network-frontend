import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ProblemDetail } from '@core/models/problem-detail.model';

/**
 * Renders a {@link ProblemDetail}.
 *
 * Stateless and presentational, which is what makes it reusable: it takes a
 * problem and draws it, and every screen in the app therefore reports failures
 * the same way.
 *
 * Note it shows `detail`, never `title`. `title` is a fixed label for the error
 * class ("Validation failed"); `detail` is the sentence written for this
 * occurrence ("The alias 'johnny' is already taken"). The traceId is shown too,
 * quietly, because it is the one string that makes a bug report actionable.
 */
@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent {
  readonly problem = input<ProblemDetail | null>(null);

  /** Off in the login form, where diagnostics would only add noise. */
  readonly showTrace = input(true);
}
