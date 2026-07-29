import { Pipe, PipeTransform } from '@angular/core';

/**
 * Turns an ISO timestamp into "3 h" or "just now".
 *
 * `pure: true` (the default) matters here: the pipe re-evaluates only when its
 * input changes, so a timeline of twenty posts does not recompute twenty
 * strings on every change detection pass. The cost is that "2 min" does not
 * tick over to "3 min" on its own - acceptable, and far cheaper than the timer
 * per post the alternative requires.
 */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const then = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(then.getTime())) {
      return '';
    }

    const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} h`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} d`;
    }

    return then.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: then.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    });
  }
}
