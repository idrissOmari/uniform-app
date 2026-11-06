import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md py-4 sm:py-12">
      <div class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_-12px_rgba(79,70,229,0.18)]">
        <div class="bg-gradient-to-br from-[#090d16] via-[#1e1b4b] to-[#3b0764] px-6 py-7 sm:px-8 text-center text-white">
          <div class="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-lg font-extrabold text-white shadow-[0_0_24px_rgba(99,102,241,0.55)] ring-1 ring-white/30">
            B
          </div>
          <h2 class="text-xl font-extrabold tracking-tight text-white">
            {{ 'app.title' | t }}
          </h2>
          <p class="mt-1 text-xs text-indigo-200/85">
            {{ 'auth.login.subtitle' | t }}
          </p>
        </div>

        <div class="p-5 sm:p-8">

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
          <p class="text-[11px] text-slate-500">
            <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
          </p>

          <div>
            <label class="block text-xs font-semibold text-slate-700">
              {{ 'auth.login.identifierLabel' | t }} <span class="font-bold text-rose-600">*</span>
            </label>
            <input
              type="text"
              formControlName="identifier"
              autocomplete="username"
              class="mt-1 w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none"
              [class.border-rose-400]="isInvalid('identifier')"
              [class.border-slate-300]="!isInvalid('identifier')"
            />
            @if (isInvalid('identifier')) {
              <p class="mt-1 text-xs font-semibold text-rose-600">
                {{ 'validation.identifierRequired' | t }}
              </p>
            }
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700">
              {{ 'auth.login.passwordLabel' | t }} <span class="font-bold text-rose-600">*</span>
            </label>
            <input
              type="password"
              formControlName="password"
              autocomplete="current-password"
              class="mt-1 w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none"
              [class.border-rose-400]="isInvalid('password')"
              [class.border-slate-300]="!isInvalid('password')"
            />
            @if (isInvalid('password')) {
              <p class="mt-1 text-xs font-semibold text-rose-600">
                {{ 'validation.passwordRequired' | t }}
              </p>
            }
          </div>

          <button
            type="submit"
            [disabled]="workflowStore.loading()"
            class="ui-btn-primary w-full !py-3"
          >
            @if (workflowStore.loading()) {
              {{ 'auth.login.submitting' | t }}
            } @else {
              {{ 'auth.login.submit' | t }}
            }
          </button>
        </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  readonly submitted = signal<boolean>(false);

  readonly loginForm = new FormGroup({
    identifier: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isInvalid(controlName: 'identifier' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }
    const { identifier, password } = this.loginForm.getRawValue();
    this.workflowStore.login(identifier, password);
  }
}
