import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Initials in a coloured circle.
 *
 * There are no uploaded avatars in this application, so rather than five
 * identical grey placeholders the colour is derived from the name itself: the
 * same user is always the same colour, on every screen and in every session,
 * with nothing stored. It makes a timeline scannable at a glance.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(40);

  readonly initials = computed(() => {
    const parts = this.name().trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  readonly background = computed(() => {
    let hash = 0;
    const name = this.name();
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 52%, 45%)`;
  });
}
