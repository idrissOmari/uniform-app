import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { UserAccountResponse, UserRole } from '../../core/models/uniform.models';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';
import {
  DataTablePaginationComponent,
  SortDirection,
  compareTableValues,
  slicePageItems,
} from '../../shared/components/data-table-controls.component';
import {
  TableActionItem,
  TableActionMenuComponent,
} from '../../shared/components/table-action-menu.component';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    TranslatePipe,
    TableActionMenuComponent,
    DataTablePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <!-- Bannière de la page Utilisateurs -->
      <div class="ui-banner">
        <div>
          <h2 class="text-lg font-bold text-white">
            {{ 'adminUsers.listTitle' | t }} ({{ workflowStore.users().length }})
          </h2>
          <p class="mt-1 text-sm text-blue-100/90">
            {{ 'adminUsers.listSubtitle' | t }}
          </p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            class="ui-btn-emerald w-full sm:w-auto"
            (click)="openInviteModal()"
          >
            {{ 'adminUsers.openInviteModalBtn' | t }}
          </button>
        </div>
      </div>

      <!-- Bannière de confirmation d'invitation par email -->
      @if (workflowStore.lastInvitedUser(); as invited) {
        <div class="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 shadow-sm">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-1.5">
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-800">
                {{ 'adminUsers.emailSentBadge' | t }}
              </div>
              <div class="text-sm font-semibold">
                {{ 'adminUsers.recipientLabel' | t }} {{ invited.fullName }} —
                {{ 'adminUsers.assignedRoleLabel' | t }}
                <span class="font-bold">{{ ('role.' + invited.role) | t }}</span>
              </div>
              @if (invited.invitationUrl; as url) {
                @let publicUrl = resolvePublicUrl(url);
                <div class="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-white p-2.5">
                  <span class="text-xs font-semibold text-slate-600">
                    {{ 'adminUsers.activationLinkLabel' | t }}
                  </span>
                  <a
                    [href]="publicUrl"
                    target="_blank"
                    rel="noopener"
                    class="font-mono text-xs font-semibold text-indigo-600 underline hover:text-indigo-800"
                  >
                    {{ publicUrl }}
                  </a>
                  <button
                    type="button"
                    class="ml-auto rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                    (click)="copyLink(publicUrl)"
                  >
                    {{ (copiedUrl() === publicUrl ? 'common.copied' : 'common.copyLink') | t }}
                  </button>
                </div>
              }
            </div>
            <button
              type="button"
              class="text-xs font-semibold text-emerald-800 hover:underline"
              (click)="workflowStore.clearLastInvitedUser()"
            >
              {{ 'common.close' | t }}
            </button>
          </div>
        </div>
      }

      <!-- Tableau pleine largeur de consultation des Comptes Utilisateurs -->
      <div class="ui-card p-4 sm:p-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200/80 bg-[#f8fafc] align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th class="px-4 py-3 min-w-[200px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('fullName')"
                  >
                    <span>{{ 'adminUsers.colUser' | t }}</span>
                    <span class="text-indigo-600">{{ getSortIndicator('fullName') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterName()"
                    (input)="filterName.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer par nom..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 min-w-[170px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('role')"
                  >
                    <span>{{ 'adminUsers.colRole' | t }}</span>
                    <span class="text-indigo-600">{{ getSortIndicator('role') }}</span>
                  </div>
                  <select
                    [value]="filterRole()"
                    (change)="filterRole.set($any($event.target).value); currentPage.set(1)"
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Tous les profils</option>
                    <option value="ROLE_ADMIN">{{ 'role.short.ROLE_ADMIN' | t }}</option>
                    <option value="ROLE_USER">{{ 'role.short.ROLE_USER' | t }}</option>
                  </select>
                </th>
                <th class="px-4 py-3 min-w-[210px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('assignedClientName')"
                  >
                    <span>Établissement affecté</span>
                    <span class="text-indigo-600">{{ getSortIndicator('assignedClientName') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterEstablishment()"
                    (input)="filterEstablishment.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer établissement..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 text-center min-w-[140px]">
                  <div
                    class="inline-flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('active')"
                  >
                    <span>{{ 'adminUsers.colStatus' | t }}</span>
                    <span class="text-indigo-600">{{ getSortIndicator('active') }}</span>
                  </div>
                  <select
                    [value]="filterStatus()"
                    (change)="filterStatus.set($any($event.target).value); currentPage.set(1)"
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Tous</option>
                    <option value="ACTIVE">Actif</option>
                    <option value="PENDING">En attente</option>
                    <option value="INACTIVE">Inactif</option>
                  </select>
                </th>
                <th class="px-4 py-3 min-w-[140px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('createdAt')"
                  >
                    <span>Date de création</span>
                    <span class="text-indigo-600">{{ getSortIndicator('createdAt') }}</span>
                  </div>
                </th>
                <th class="px-4 py-3 text-right min-w-[110px]">
                  <div>{{ 'adminUsers.colActions' | t }}</div>
                  @if (hasActiveColumnFilters()) {
                    <button
                      type="button"
                      (click)="resetColumnFilters()"
                      class="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-indigo-600 hover:bg-indigo-50"
                    >
                      Réinitialiser
                    </button>
                  }
                </th>
              </tr>
            </thead>
            <tbody>
              @if (paginatedUsers().length === 0) {
                <tr>
                  <td colspan="6" class="px-5 py-8 text-center text-sm text-slate-500">
                    Aucun utilisateur ne correspond à votre recherche.
                  </td>
                </tr>
              } @else {
                @for (user of paginatedUsers(); track user.id) {
                  <tr class="border-b border-slate-200 hover:bg-slate-50">
                    <td class="px-5 py-4 text-sm font-bold text-slate-900">
                      {{ user.fullName }}
                    </td>
                    <td class="px-5 py-4 text-xs">
                      <span
                        class="rounded-full px-3 py-1 font-bold"
                        [class.bg-indigo-100]="user.role === 'ROLE_ADMIN'"
                        [class.text-indigo-800]="user.role === 'ROLE_ADMIN'"
                        [class.bg-slate-100]="user.role === 'ROLE_USER'"
                        [class.text-slate-800]="user.role === 'ROLE_USER'"
                      >
                        {{ ('role.short.' + user.role) | t }}
                      </span>
                    </td>
                    <td class="px-5 py-4 text-sm font-medium text-slate-700">
                      @if (user.role === 'ROLE_ADMIN') {
                        <span class="text-slate-500">Tous les établissements</span>
                      } @else {
                        {{ getEstablishmentName(user) }}
                      }
                    </td>
                    <td class="px-5 py-4 text-center">
                      @if (user.invitationStatus === 'ACTIVE' && user.active) {
                        <span
                          class="inline-flex items-center justify-center rounded-full bg-emerald-100 p-1.5 text-emerald-700"
                          title="Actif"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fill-rule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </span>
                      } @else if (user.invitationStatus === 'PENDING_INVITATION') {
                        <span
                          class="inline-flex items-center justify-center rounded-full bg-amber-100 p-1.5 text-amber-700"
                          title="Invitation en attente d'activation"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fill-rule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center justify-center rounded-full bg-rose-100 p-1.5 text-rose-700"
                          title="Inactif / Désactivé"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fill-rule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4 text-xs text-slate-500">
                      {{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </td>
                    <td class="px-5 py-4 text-right">
                      <app-table-action-menu
                        [menuTitle]="user.fullName"
                        [actions]="getUserActions(user)"
                      />
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-data-table-pagination
          [(currentPage)]="currentPage"
          [(pageSize)]="pageSize"
          [totalItems]="filteredUsers().length"
        />
      </div>

      <!-- POPIN (Modale) d'Ajout d'un Nouvel Utilisateur -->
      @if (showInviteModal()) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-lg">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ 'adminUsers.formTitle' | t }}
                </h3>
                <p class="text-xs text-slate-500">
                  {{ 'adminUsers.formSubtitle' | t }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                (click)="closeInviteModal()"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="inviteForm" (ngSubmit)="onInviteSubmit()" novalidate class="mt-4 space-y-4">
              <p class="text-[11px] text-slate-500">
                <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
              </p>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.fullNameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  formControlName="fullName"
                  placeholder="ex: Salma Bennani"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-rose-400]="isInvalid('fullName')"
                  [class.border-slate-300]="!isInvalid('fullName')"
                />
                @if (isInvalid('fullName')) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    {{ 'validation.required' | t }}
                  </p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.usernameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  formControlName="username"
                  placeholder="ex: salma.bennani"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  [class.border-rose-400]="isInvalid('username')"
                  [class.border-slate-300]="!isInvalid('username')"
                />
                @if (isInvalid('username')) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    {{ 'validation.required' | t }}
                  </p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.emailLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  formControlName="email"
                  placeholder="ex: salma.bennani@ecole.ma"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-rose-400]="isInvalid('email')"
                  [class.border-slate-300]="!isInvalid('email')"
                />
                @if (isInvalid('email')) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    @if (inviteForm.controls.email.errors?.['required']) {
                      {{ 'validation.required' | t }}
                    } @else {
                      {{ 'validation.emailInvalid' | t }}
                    }
                  </p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.roleSelectLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <select
                  formControlName="role"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                >
                  <option value="ROLE_USER">{{ 'role.ROLE_USER' | t }}</option>
                  <option value="ROLE_ADMIN">{{ 'role.ROLE_ADMIN' | t }}</option>
                </select>
              </div>

              @if (inviteForm.controls.role.value === 'ROLE_USER') {
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Établissement affecté <span class="font-bold text-rose-600">*</span>
                  </label>
                  <select
                    formControlName="assignedClientId"
                    class="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                    [class.border-rose-400]="isAssignedClientMissing()"
                    [class.border-slate-300]="!isAssignedClientMissing()"
                  >
                    <option value="">— Choisir l'établissement affecté à cet utilisateur —</option>
                    @for (client of workflowStore.clients(); track client.id) {
                      <option [value]="client.id">
                        {{ client.name }}
                      </option>
                    }
                  </select>
                  @if (isAssignedClientMissing()) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      Veuillez sélectionner l'établissement auquel cet opérateur est affecté.
                    </p>
                  }
                </div>
              }

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  (click)="closeInviteModal()"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="submit"
                  [disabled]="inviteForm.invalid || isInviteClientRequiredButEmpty() || workflowStore.loading()"
                  class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {{ 'adminUsers.submitInvite' | t }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- POPIN (Modale) d'Édition d'un Utilisateur (Nom, Profil, Établissement affecté) -->
      @if (editingUser(); as targetUser) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-lg">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Modifier l'utilisateur
                </h3>
                <p class="text-xs text-slate-500">
                  Mettez à jour le nom, le profil ou l'établissement affecté à {{ targetUser.fullName }}.
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                (click)="closeEditModal()"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="onEditSubmit()" novalidate class="mt-4 space-y-4">
              <p class="text-[11px] text-slate-500">
                <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
              </p>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.fullNameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  formControlName="fullName"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-rose-400]="editForm.controls.fullName.invalid && editForm.controls.fullName.touched"
                  [class.border-slate-300]="!(editForm.controls.fullName.invalid && editForm.controls.fullName.touched)"
                />
                @if (editForm.controls.fullName.invalid && editForm.controls.fullName.touched) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    {{ 'validation.required' | t }}
                  </p>
                }
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminUsers.roleSelectLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <select
                  formControlName="role"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                >
                  <option value="ROLE_USER">{{ 'role.ROLE_USER' | t }}</option>
                  <option value="ROLE_ADMIN">{{ 'role.ROLE_ADMIN' | t }}</option>
                </select>
              </div>

              @if (editForm.controls.role.value === 'ROLE_USER') {
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Établissement affecté <span class="font-bold text-rose-600">*</span>
                  </label>
                  <select
                    formControlName="assignedClientId"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  >
                    <option value="">— Choisir l'établissement affecté —</option>
                    @for (client of workflowStore.clients(); track client.id) {
                      <option [value]="client.id">
                        {{ client.name }}
                      </option>
                    }
                  </select>
                  @if (isEditClientRequiredButEmpty()) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      Veuillez sélectionner un établissement pour un Opérateur Comptoir.
                    </p>
                  }
                </div>
              }

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  (click)="closeEditModal()"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="submit"
                  [disabled]="editForm.invalid || isEditClientRequiredButEmpty() || workflowStore.loading()"
                  class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {{ 'common.save' | t }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- POPIN de confirmation de suppression d'utilisateur -->
      @if (deletingUser(); as userToDelete) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <h3 class="text-base font-bold text-slate-900">
              Supprimer l'utilisateur
            </h3>
            <p class="mt-2 text-sm text-slate-600">
              Confirmez-vous la suppression définitive du compte de
              <span class="font-bold text-slate-900">{{ userToDelete.fullName }}</span> ?
            </p>
            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                (click)="deletingUser.set(null)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="button"
                [disabled]="workflowStore.loading()"
                class="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-40"
                (click)="confirmDeleteUser()"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminUserManagementComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  readonly copiedUrl = signal<string | null>(null);
  readonly showInviteModal = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  readonly editingUser = signal<UserAccountResponse | null>(null);
  readonly deletingUser = signal<UserAccountResponse | null>(null);

  // Filtres sur les en-têtes du tableau, tri & pagination
  readonly filterName = signal<string>('');
  readonly filterRole = signal<string>('');
  readonly filterEstablishment = signal<string>('');
  readonly filterStatus = signal<string>('');
  readonly sortField = signal<string>('fullName');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly hasActiveColumnFilters = computed<boolean>(() =>
    Boolean(
      this.filterName().trim() ||
        this.filterRole() ||
        this.filterEstablishment().trim() ||
        this.filterStatus()
    )
  );

  readonly filteredUsers = computed(() => {
    const nameQuery = this.filterName().trim().toLowerCase();
    const roleFilter = this.filterRole();
    const establishmentQuery = this.filterEstablishment().trim().toLowerCase();
    const statusFilter = this.filterStatus();
    const field = this.sortField();
    const direction = this.sortDirection();

    const matches = this.workflowStore.users().filter((u) => {
      if (nameQuery && !u.fullName.toLowerCase().includes(nameQuery)) {
        return false;
      }
      if (roleFilter && u.role !== roleFilter) {
        return false;
      }
      if (establishmentQuery) {
        const establishment = this.getEstablishmentName(u).toLowerCase();
        if (!establishment.includes(establishmentQuery)) {
          return false;
        }
      }
      if (statusFilter === 'ACTIVE' && !(u.invitationStatus === 'ACTIVE' && u.active)) {
        return false;
      }
      if (statusFilter === 'PENDING' && u.invitationStatus !== 'PENDING_INVITATION') {
        return false;
      }
      if (statusFilter === 'INACTIVE' && (u.invitationStatus === 'PENDING_INVITATION' || u.active)) {
        return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      switch (field) {
        case 'role':
          return compareTableValues(a.role, b.role, direction);
        case 'assignedClientName':
          return compareTableValues(this.getEstablishmentName(a), this.getEstablishmentName(b), direction);
        case 'active':
          return compareTableValues(a.active, b.active, direction);
        case 'createdAt':
          return compareTableValues(a.createdAt, b.createdAt, direction);
        case 'fullName':
        default:
          return compareTableValues(a.fullName, b.fullName, direction);
      }
    });
  });

  readonly paginatedUsers = computed(() =>
    slicePageItems(this.filteredUsers(), this.currentPage(), this.pageSize())
  );

  readonly inviteForm = new FormGroup({
    fullName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    username: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<UserRole>('ROLE_USER', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    assignedClientId: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  readonly editForm = new FormGroup({
    fullName: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl<UserRole>('ROLE_USER', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    assignedClientId: new FormControl<string>('', {
      nonNullable: true,
    }),
  });

  constructor() {
    this.workflowStore.refreshUsers();
  }

  toggleColumnSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  getSortIndicator(field: string): string {
    if (this.sortField() !== field) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  resetColumnFilters(): void {
    this.filterName.set('');
    this.filterRole.set('');
    this.filterEstablishment.set('');
    this.filterStatus.set('');
    this.currentPage.set(1);
  }

  getEstablishmentName(user: UserAccountResponse): string {
    if (user.role === 'ROLE_ADMIN') {
      return 'Tous les établissements';
    }
    if (user.assignedClientName) {
      return user.assignedClientName;
    }
    if (user.assignedClientId) {
      return (
        this.workflowStore.clients().find((c) => c.id === user.assignedClientId)?.name ??
        'Non affecté'
      );
    }
    return 'Non affecté';
  }

  getUserActions(user: UserAccountResponse): readonly TableActionItem[] {
    const items: TableActionItem[] = [
      {
        label: "Modifier l'utilisateur",
        icon: '✏️',
        onSelect: () => this.openEditModal(user),
      },
    ];

    if (user.invitationStatus === 'PENDING_INVITATION') {
      if (user.invitationUrl) {
        const url = user.invitationUrl;
        items.push({
          label: "Copier le lien d'activation",
          icon: '🔗',
          variant: 'primary',
          onSelect: () => this.copyLink(url),
        });
      }
      items.push({
        label: "Renvoyer l'email d'invitation",
        icon: '✉️',
        onSelect: () => this.workflowStore.resendUserInvitation(user.id),
      });
    } else {
      items.push({
        label: user.active ? 'Désactiver ce compte' : 'Réactiver ce compte',
        icon: user.active ? '⛔' : '✅',
        variant: user.active ? 'default' : 'success',
        onSelect: () => this.workflowStore.toggleUserStatus(user.id, !user.active),
      });
    }

    items.push({
      label: "Supprimer l'utilisateur",
      icon: '🗑️',
      variant: 'danger',
      onSelect: () => this.deletingUser.set(user),
    });

    return items;
  }

  isInvalid(controlName: 'fullName' | 'username' | 'email'): boolean {
    const control = this.inviteForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }

  isInviteClientRequiredButEmpty(): boolean {
    return (
      this.inviteForm.controls.role.value === 'ROLE_USER' &&
      !this.inviteForm.controls.assignedClientId.value
    );
  }

  isAssignedClientMissing(): boolean {
    return this.submitted() && this.isInviteClientRequiredButEmpty();
  }

  isEditClientRequiredButEmpty(): boolean {
    return (
      this.editForm.controls.role.value === 'ROLE_USER' &&
      !this.editForm.controls.assignedClientId.value
    );
  }

  openInviteModal(): void {
    this.submitted.set(false);
    const defaultClientId =
      this.workflowStore.selectedClientId() ?? this.workflowStore.clients()[0]?.id ?? '';
    this.inviteForm.reset({
      fullName: '',
      username: '',
      email: '',
      role: 'ROLE_USER',
      assignedClientId: defaultClientId,
    });
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
    this.submitted.set(false);
  }

  onInviteSubmit(): void {
    this.submitted.set(true);
    this.inviteForm.markAllAsTouched();
    if (this.inviteForm.invalid || this.isInviteClientRequiredButEmpty()) {
      return;
    }
    const raw = this.inviteForm.getRawValue();
    this.workflowStore.inviteUser(
      {
        fullName: raw.fullName,
        username: raw.username,
        email: raw.email,
        role: raw.role,
        assignedClientId: raw.role === 'ROLE_USER' ? raw.assignedClientId : null,
      },
      () => {
        this.closeInviteModal();
      }
    );
  }

  openEditModal(user: UserAccountResponse): void {
    const fallbackClientId =
      user.assignedClientId ??
      this.workflowStore.selectedClientId() ??
      this.workflowStore.clients()[0]?.id ??
      '';
    this.editForm.reset({
      fullName: user.fullName,
      role: user.role,
      assignedClientId: user.role === 'ROLE_USER' ? fallbackClientId : '',
    });
    this.editingUser.set(user);
  }

  closeEditModal(): void {
    this.editingUser.set(null);
  }

  onEditSubmit(): void {
    const target = this.editingUser();
    if (!target || this.editForm.invalid || this.isEditClientRequiredButEmpty()) {
      return;
    }
    const raw = this.editForm.getRawValue();
    this.workflowStore.updateUser(
      target.id,
      {
        fullName: raw.fullName,
        role: raw.role,
        assignedClientId: raw.role === 'ROLE_USER' ? raw.assignedClientId : null,
      },
      () => {
        this.closeEditModal();
      }
    );
  }

  confirmDeleteUser(): void {
    const target = this.deletingUser();
    if (!target) {
      return;
    }
    this.workflowStore.deleteUser(target.id, () => {
      this.deletingUser.set(null);
    });
  }

  resolvePublicUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  copyLink(url: string): void {
    const publicUrl = this.resolvePublicUrl(url);
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(publicUrl);
    }
    this.copiedUrl.set(publicUrl);
  }
}
