import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthStore } from '@core/auth/store/auth.store';
import { AlertComponent } from '@shared/components/alert/alert.component';

/**
 * The login screen.
 *
 * Holds no state of its own beyond the form. Whether a request is in flight and
 * what went wrong live in `AuthStore`, so the header and the guards see the
 * same truth without this component telling them.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AlertComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly passwordVisible = signal(false);
  protected readonly demoUsers = ['jdoe', 'mgarcia', 'lchen', 'arossi', 'kcamilo'];

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  /** Set by the error interceptor when it clears a rejected token. */
  protected sessionExpired(): boolean {
    return this.route.snapshot.queryParamMap.get('reason') === 'expired';
  }

  protected isInvalid(control: 'username' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected fill(username: string): void {
    this.form.patchValue({ username, password: 'Password123!' });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const succeeded = await this.authStore.login(this.form.getRawValue());
    if (!succeeded) {
      return;
    }

    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo') ?? '/posts';
    void this.router.navigateByUrl(redirectTo);
  }
}
