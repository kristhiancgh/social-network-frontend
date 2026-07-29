import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A loading indicator. Stateless, like everything in `shared/`. */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  readonly label = input('Loading...');
  readonly showLabel = input(true);
}
