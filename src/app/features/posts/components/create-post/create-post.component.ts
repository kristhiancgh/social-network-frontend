import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

/**
 * The composer.
 *
 * There is no date field, and that is the requirement rather than an omission:
 * the brief says the publication date defaults on save, and the server stamps
 * it with `now()` inside `sp_create_post`. Letting the client choose would
 * allow backdating a post to the top of everyone's timeline.
 */
@Component({
  selector: 'app-create-post',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent {
  private readonly formBuilder = inject(FormBuilder);

  /** Mirrors Post.MAX_MESSAGE_LENGTH and the posts.message column. */
  protected readonly maxLength = 500;

  readonly submitting = input(false);
  readonly published = output<string>();

  protected readonly justPublished = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected readonly remaining = computed(
    () => this.maxLength - (this.form.controls.message.value?.length ?? 0),
  );

  protected submit(): void {
    const message = this.form.controls.message.value.trim();
    if (!message) {
      this.form.markAllAsTouched();
      return;
    }

    this.published.emit(message);
    this.form.reset();

    this.justPublished.set(true);
    setTimeout(() => this.justPublished.set(false), 4000);
  }
}
