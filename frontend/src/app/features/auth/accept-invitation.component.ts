import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { InvitationDetailsResponse } from '../../core/models/uniform.models';
import { UniformApiService } from '../../core/services/uniform-api.service';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md py-12">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div class="mb-6 text-center">
          <div class="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white">
            ✉
          </div>
          <h2 class="text-xl font-extrabold text-slate-900">
            {{ 'invitation.title' | t }}
          </h2>
          <p class="mt-1 text-xs text-slate-500">
            {{ 'invitation.subtitle' | t }}
          </p>
        </div>

        @if (loading()) {
          <div class="py-6 text-center text-sm text-slate-500">
            {{ 'invitation.verifying' | t }}
          </div>
        } @else if (errorMessage(); as errMsg) {
          <div class="space-y-4">
            <div class="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
              <div class="font-bold text-rose-800">{{ 'invitation.invalidTitle' | t }}</div>
              <p class="mt-1">{{ errMsg }}</p>
            </div>
            <a
              routerLink="/login"
              class="block w-full rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-slate-800"
            >
              {{ 'invitation.backToLogin' | t }}
            </a>
          </div>
        } @else if (invitation(); as details) {
          <div class="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
            <div>
              <span class="text-slate-500">{{ 'invitation.fullNameLabel' | t }}</span>
              <span class="ml-1 font-bold text-slate-900">{{ details.fullName }}</span>
            </div>
            <div>
              <span class="text-slate-500">{{ 'invitation.usernameLabel' | t }}</span>
              <span class="ml-1 font-mono font-semibold text-slate-900">{{ details.username }}</span>
            </div>
            <div>
              <span class="text-slate-500">{{ 'invitation.emailLabel' | t }}</span>
              <span class="ml-1 font-medium text-slate-800">{{ details.email }}</span>
            </div>
            <div>
              <span class="text-slate-500">{{ 'invitation.roleLabel' | t }}</span>
              <span
                class="ml-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold"
                [class.bg-indigo-100]="details.role === 'ROLE_ADMIN'"
                [class.text-indigo-800]="details.role === 'ROLE_ADMIN'"
                [class.bg-emerald-100]="details.role === 'ROLE_USER'"
                [class.text-emerald-800]="details.role === 'ROLE_USER'"
              >
                {{ ('role.' + details.role) | t }}
              </span>
            </div>
          </div>

          <form [formGroup]="passwordForm" (ngSubmit)="onActivate()" novalidate class="space-y-4">
            <p class="text-[11px] text-slate-500">
              <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
            </p>

            <div>
              <label class="block text-xs font-semibold text-slate-700">
                {{ 'invitation.passwordLabel' | t }} <span class="font-bold text-rose-600">*</span>
              </label>
              <input
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="mt-1 w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none"
                [class.border-rose-400]="isInvalid('password')"
                [class.border-slate-300]="!isInvalid('password')"
              />
              @if (isInvalid('password')) {
                <p class="mt-1 text-xs font-semibold text-rose-600">
                  @if (passwordForm.controls.password.errors?.['required']) {
                    {{ 'validation.passwordRequired' | t }}
                  } @else {
                    {{ 'validation.passwordMinLength' | t }}
                  }
                </p>
              }
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700">
                {{ 'invitation.confirmPasswordLabel' | t }} <span class="font-bold text-rose-600">*</span>
              </label>
              <input
                type="password"
                formControlName="confirmPassword"
                placeholder="••••••••"
                class="mt-1 w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none"
                [class.border-rose-400]="isInvalid('confirmPassword') || passwordMismatch()"
                [class.border-slate-300]="!isInvalid('confirmPassword') && !passwordMismatch()"
              />
              @if (isInvalid('confirmPassword')) {
                <p class="mt-1 text-xs font-semibold text-rose-600">
                  {{ 'validation.passwordRequired' | t }}
                </p>
              }
            </div>

            @if (passwordMismatch()) {
              <p class="text-xs font-semibold text-rose-600">
                {{ 'invitation.passwordMismatch' | t }}
              </p>
            }

            <button
              type="submit"
              [disabled]="submitting()"
              class="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              @if (submitting()) {
                {{ 'invitation.submitting' | t }}
              } @else {
                {{ 'invitation.submit' | t }}
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class AcceptInvitationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(UniformApiService);
  private readonly workflowStore = inject(UniformWorkflowStore);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);
  readonly invitation = signal<InvitationDetailsResponse | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordMismatch = signal<boolean>(false);

  readonly passwordForm = new FormGroup({
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    confirmPassword: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  constructor() {
    if (!this.token) {
      this.loading.set(false);
      this.errorMessage.set("Aucun jeton d'invitation n'a été fourni dans l'URL.");
      return;
    }

    this.api.getInvitationByToken(this.token).subscribe({
      next: (details) => {
        this.invitation.set(details);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.error?.detail) {
          this.errorMessage.set(err.error.detail);
        } else {
          this.errorMessage.set("Ce lien d'invitation est invalide ou a expiré.");
        }
      },
    });
  }

  isInvalid(controlName: 'password' | 'confirmPassword'): boolean {
    const control = this.passwordForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }

  onActivate(): void {
    this.submitted.set(true);
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      return;
    }
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (password !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);
    this.submitting.set(true);

    this.api.acceptInvitation(this.token, password).subscribe({
      next: (session) => {
        this.submitting.set(false);
        this.workflowStore.applyAuthenticatedSession(session);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse && err.error?.detail) {
          this.errorMessage.set(err.error.detail);
        } else {
          this.errorMessage.set("Impossible d'activer ce compte.");
        }
      },
    });
  }
}
