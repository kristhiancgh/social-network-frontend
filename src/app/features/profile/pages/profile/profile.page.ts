import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthStore } from '@core/auth/store/auth.store';
import { AlertComponent } from '@shared/components/alert/alert.component';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { SpinnerComponent } from '@shared/components/spinner/spinner.component';
import { ProfileStore } from '@features/profile/store/profile.store';

/**
 * The Profile screen: shows the authenticated user's first name, last name,
 * birth date and alias, and lets them be edited.
 *
 * The same component handles both "you have a profile" and "you do not yet".
 * A separate setup page would duplicate the whole form for a state that lasts
 * one submission.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, AlertComponent, AvatarComponent, SpinnerComponent],
  providers: [ProfileStore],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly authStore = inject(AuthStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly editing = signal(false);
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    birthDate: ['', Validators.required],
    // Mirrors ck_profiles_alias_fmt in the database. Duplicated on purpose:
    // this one is for a fast, friendly message, that one is the guarantee.
    alias: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(50),
       Validators.pattern(/^[a-zA-Z0-9_.]+$/)],
    ],
    bio: ['', Validators.maxLength(280)],
  });

  protected readonly bioLength = computed(() => this.form.controls.bio.value?.length ?? 0);

  ngOnInit(): void {
    void this.store.load();
  }

  protected isInvalid(control: keyof typeof this.form.controls): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected startEditing(): void {
    const profile = this.store.profile();
    if (profile) {
      this.form.patchValue({
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        alias: profile.alias,
        bio: profile.bio ?? '',
      });
    }
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    this.editing.set(false);
    this.store.clearError();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const saved = await this.store.save({
      ...value,
      bio: value.bio.trim() || undefined,
    });

    if (saved) {
      this.editing.set(false);
    }
  }
}
