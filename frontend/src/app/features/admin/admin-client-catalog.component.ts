import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import {
  ADULT_SIZES,
  ALL_CLIENT_TYPES,
  ALL_GENDERS,
  ALL_PRODUCT_TYPES,
  AdminCatalogItemResponse,
  ClientResponse,
  ClientSectionInput,
  ClientType,
  Gender,
  KIDS_SIZES,
  ProductType,
  Size,
  getAllowedGendersForClientType,
  getAllowedSizesForGender,
} from '../../core/models/uniform.models';
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

export interface EditableClientSectionRow {
  readonly uid: string;
  readonly id?: string | null;
  readonly name: string;
  readonly capacity: number;
}

/**
 * Page (/admin/clients) : Consultation dédiée des Établissements
 */
@Component({
  selector: 'app-admin-clients-list',
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
      @if (workflowStore.clients().length > 0) {
      <!-- Bannière de la page Établissements -->
      <div class="ui-banner">
        <div>
          <h2 class="text-lg font-bold text-white">
            {{ 'adminClients.listTitle' | t }} ({{ workflowStore.clients().length }})
          </h2>
          <p class="mt-1 text-sm text-blue-100/90">
            Consultez et configurez la liste des établissements scolaires et organismes partenaires.
          </p>
        </div>

        <button
          type="button"
          class="ui-btn-emerald w-full sm:w-auto"
          (click)="openCreateClientModal()"
        >
          {{ 'adminClients.openCreateModalBtn' | t }}
        </button>
      </div>

      <!-- Tableau pleine largeur de consultation des Établissements -->
      <div class="ui-card p-4 sm:p-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200/80 bg-[#f8fafc] align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th class="px-4 py-3 min-w-[210px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('name')"
                  >
                    <span>Établissement</span>
                    <span class="text-indigo-600">{{ getSortIndicator('name') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterName()"
                    (input)="filterName.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer établissement..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 min-w-[200px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('clientType')"
                  >
                    <span>Type d'établissement & Tailles</span>
                    <span class="text-indigo-600">{{ getSortIndicator('clientType') }}</span>
                  </div>
                  <select
                    [value]="filterClientType()"
                    (change)="filterClientType.set($any($event.target).value); currentPage.set(1)"
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Tous les types</option>
                    @for (ct of clientTypes; track ct) {
                      <option [value]="ct">{{ ('clientType.short.' + ct) | t }}</option>
                    }
                  </select>
                </th>
                <th class="px-4 py-3 min-w-[210px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('address')"
                  >
                    <span>Ville / Adresse</span>
                    <span class="text-indigo-600">{{ getSortIndicator('address') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterAddress()"
                    (input)="filterAddress.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer ville / adresse..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
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
                  <div>Actions</div>
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
              @for (client of paginatedClients(); track client.id) {
                <tr class="border-b border-slate-200 transition hover:bg-slate-50">
                  <td class="px-5 py-4">
                    <span class="text-sm font-bold text-slate-900">{{ client.name }}</span>
                  </td>
                  <td class="px-5 py-4">
                    <div class="flex flex-col items-start gap-1">
                      <span
                        class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                        [class.bg-amber-100]="client.clientType === 'PRIMARY_SCHOOL'"
                        [class.text-amber-800]="client.clientType === 'PRIMARY_SCHOOL'"
                        [class.bg-indigo-50]="client.clientType !== 'PRIMARY_SCHOOL'"
                        [class.text-indigo-700]="client.clientType !== 'PRIMARY_SCHOOL'"
                      >
                        {{ ('clientType.short.' + (client.clientType || 'SECONDARY_SCHOOL')) | t }}
                      </span>
                      @if (client.clientType === 'PRIMARY_SCHOOL') {
                        <span class="text-[11px] font-semibold text-amber-700">
                          Tailles Enfant uniquement (2 à 14 ans)
                        </span>
                      } @else {
                        <span class="text-[11px] text-slate-400">
                          Tailles Enfant & Adulte
                        </span>
                      }
                    </div>
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-600">{{ client.address }}</td>
                  <td class="px-5 py-4 text-xs text-slate-500">
                    {{ client.createdAt | date: 'dd/MM/yyyy' }}
                  </td>
                  <td class="px-5 py-4 text-right">
                    <app-table-action-menu
                      [menuTitle]="client.name"
                      [actions]="getClientActions(client)"
                    />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-5 py-10 text-center text-sm text-slate-500">
                    Aucun établissement trouvé. Cliquez sur « + Nouvel Établissement » pour en ajouter un.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-data-table-pagination
          [(currentPage)]="currentPage"
          [(pageSize)]="pageSize"
          [totalItems]="filteredClients().length"
        />
      </div>
      } @else {
        <div class="ui-card p-8 sm:p-12 text-center space-y-4">
          <div class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl ring-1 ring-indigo-200/60">
            🏫
          </div>
          <div class="space-y-1 max-w-md mx-auto">
            <h3 class="text-base font-extrabold text-slate-900">
              Aucun établissement disponible
            </h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Créez votre premier établissement scolaire ou organisme partenaire pour configurer ses sections, son catalogue et ses commandes.
            </p>
          </div>
          <div class="flex items-center justify-center pt-2">
            <button
              type="button"
              class="ui-btn-emerald"
              (click)="openCreateClientModal()"
            >
              {{ 'adminClients.openCreateModalBtn' | t }}
            </button>
          </div>
        </div>
      }

      <!-- POPIN (Modale) Création / Modification d'un Établissement & Sections -->
      @if (showClientModal()) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-2xl">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 class="text-base font-bold text-slate-900">
                {{ (editingClientId() ? 'adminClients.editTitle' : 'adminClients.createTitle') | t }}
              </h3>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                (click)="closeClientModal()"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="clientForm" (ngSubmit)="onSubmitClient()" novalidate class="mt-4 space-y-4">
              <p class="text-[11px] text-slate-500">
                <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
              </p>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'adminClients.nameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="name"
                    placeholder="ex: Groupe Scolaire Al Jabr — Casablanca"
                    class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    [class.border-rose-400]="isClientFieldInvalid('name')"
                    [class.border-slate-300]="!isClientFieldInvalid('name')"
                  />
                  @if (isClientFieldInvalid('name')) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      {{ 'validation.required' | t }}
                    </p>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Type d'établissement <span class="font-bold text-rose-600">*</span>
                  </label>
                  <select
                    formControlName="clientType"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
                  >
                    @for (ct of clientTypes; track ct) {
                      <option [value]="ct">{{ ('clientType.' + ct) | t }}</option>
                    }
                  </select>
                </div>
              </div>

              @if (clientForm.controls.clientType.value === 'PRIMARY_SCHOOL') {
                <div class="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
                  ✓ École Primaire sélectionnée : seules les tailles Enfant (2 ans à 14 ans) seront proposées pour cet établissement.
                </div>
              }

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  {{ 'adminClients.addressLabel' | t }} <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  formControlName="address"
                  placeholder="ex: Boulevard d'Anfa, 20000 Casablanca, Maroc"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-rose-400]="isClientFieldInvalid('address')"
                  [class.border-slate-300]="!isClientFieldInvalid('address')"
                />
                @if (isClientFieldInvalid('address')) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    {{ 'validation.required' | t }}
                  </p>
                }
              </div>

              <!-- DÉCOUPAGE PAR SECTIONS & CAPACITÉS À INITIER -->
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-bold uppercase tracking-wider text-[#163672]">
                      Découpage en Sections & Capacités
                    </div>
                    <p class="text-[11px] text-slate-500">
                      Définissez les sections (classes / niveaux) de l'établissement et la capacité de chaque section.
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-extrabold text-[#15803d]">
                      {{ draftSections().length }} section(s) · Capacité totale : {{ draftTotalCapacity() }}
                    </span>
                    <button
                      type="button"
                      class="rounded-xl bg-[#163672] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0d2554] cursor-pointer"
                      (click)="addDraftSection()"
                    >
                      + Ajouter une section
                    </button>
                  </div>
                </div>

                <!-- Suggestions rapides de sections selon le type d'établissement -->
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[11px] font-semibold text-slate-500">Ajout rapide :</span>
                  @for (preset of getSectionPresets(clientForm.controls.clientType.value); track preset.name) {
                    <button
                      type="button"
                      class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer"
                      (click)="addPresetSection(preset.name, preset.capacity)"
                    >
                      + {{ preset.name }} ({{ preset.capacity }})
                    </button>
                  }
                </div>

                <!-- Liste des sections -->
                <div class="space-y-2">
                  @for (sec of draftSections(); track sec.uid; let idx = $index) {
                    <div class="grid grid-cols-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
                      <div class="col-span-7">
                        <label class="block text-[10px] font-bold uppercase text-slate-400">
                          Nom de la section #{{ idx + 1 }} <span class="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="ex: CP - Section A, 1ère Année Collège..."
                          class="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                          [class.border-rose-400]="!sec.name.trim()"
                          [class.border-slate-300]="!!sec.name.trim()"
                          [value]="sec.name"
                          (input)="updateDraftSectionName(sec.uid, $any($event.target).value)"
                        />
                      </div>

                      <div class="col-span-4">
                        <label class="block text-[10px] font-bold uppercase text-slate-400">
                          Capacité (effectif) <span class="text-rose-600">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          class="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs font-extrabold text-[#15803d]"
                          [class.border-rose-400]="sec.capacity < 1"
                          [class.border-slate-300]="sec.capacity >= 1"
                          [value]="sec.capacity"
                          (input)="updateDraftSectionCapacity(sec.uid, +$any($event.target).value || 0)"
                        />
                      </div>

                      <div class="col-span-1 flex justify-end pt-4">
                        <button
                          type="button"
                          class="rounded-lg p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Supprimer cette section"
                          (click)="removeDraftSection(sec.uid)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center text-xs text-slate-500">
                      Aucune section initiée pour le moment. Cliquez sur « + Ajouter une section » ou sur un bouton d'ajout rapide ci-dessus.
                    </div>
                  }
                </div>

                @if (sectionValidationError(); as secErr) {
                  <p class="text-xs font-semibold text-rose-600">
                    {{ secErr }}
                  </p>
                }
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  (click)="closeClientModal()"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="submit"
                  [disabled]="clientForm.invalid || !areDraftSectionsValid() || workflowStore.loading()"
                  class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {{ (editingClientId() ? 'adminClients.saveUpdateBtn' : 'adminClients.saveCreateBtn') | t }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- POPIN Dédiée : Gérer les Sections & Capacités d'un Établissement existant -->
      @if (sectionsModalClient(); as secClient) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-xl">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Sections & Capacités — {{ secClient.name }}
                </h3>
                <p class="text-xs text-slate-500">
                  Initiez et gérez les sections de cet établissement ainsi que la capacité de chaque section.
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                (click)="closeSectionsModal()"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8fafc] p-3.5 border border-slate-200/80">
                <div class="text-xs font-bold text-slate-700">
                  Total configuré :
                  <span class="text-[#163672]">{{ draftSections().length }} section(s)</span> ·
                  Capacité cumulée :
                  <span class="text-[#15803d]">{{ draftTotalCapacity() }} élèves</span>
                </div>
                <button
                  type="button"
                  class="rounded-xl bg-[#163672] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0d2554] cursor-pointer"
                  (click)="addDraftSection()"
                >
                  + Ajouter une section
                </button>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] font-semibold text-slate-500">Ajout rapide :</span>
                @for (preset of getSectionPresets(secClient.clientType); track preset.name) {
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 cursor-pointer"
                    (click)="addPresetSection(preset.name, preset.capacity)"
                  >
                    + {{ preset.name }} ({{ preset.capacity }})
                  </button>
                }
              </div>

              <div class="space-y-2.5">
                @for (sec of draftSections(); track sec.uid; let idx = $index) {
                  <div class="grid grid-cols-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div class="col-span-7">
                      <label class="block text-[10px] font-bold uppercase text-slate-400">
                        Nom de la section #{{ idx + 1 }} <span class="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ex: CP - Section A"
                        class="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                        [class.border-rose-400]="!sec.name.trim()"
                        [class.border-slate-300]="!!sec.name.trim()"
                        [value]="sec.name"
                        (input)="updateDraftSectionName(sec.uid, $any($event.target).value)"
                      />
                    </div>

                    <div class="col-span-4">
                      <label class="block text-[10px] font-bold uppercase text-slate-400">
                        Capacité <span class="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        class="mt-0.5 w-full rounded-lg border px-2.5 py-1.5 text-xs font-extrabold text-[#15803d]"
                        [class.border-rose-400]="sec.capacity < 1"
                        [class.border-slate-300]="sec.capacity >= 1"
                        [value]="sec.capacity"
                        (input)="updateDraftSectionCapacity(sec.uid, +$any($event.target).value || 0)"
                      />
                    </div>

                    <div class="col-span-1 flex justify-end pt-4">
                      <button
                        type="button"
                        class="rounded-lg p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        (click)="removeDraftSection(sec.uid)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    Aucune section configurée pour cet établissement. Utilisez les boutons ci-dessus pour initier des sections.
                  </div>
                }
              </div>

              @if (sectionValidationError(); as secErr) {
                <p class="text-xs font-semibold text-rose-600">
                  {{ secErr }}
                </p>
              }

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  (click)="closeSectionsModal()"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="button"
                  [disabled]="!areDraftSectionsValid() || workflowStore.loading()"
                  class="rounded-xl bg-[#16803c] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#146c32] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  (click)="onSubmitSectionsModal(secClient.id)"
                >
                  Enregistrer les sections & capacités
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- POPIN Confirmation de suppression d'un Établissement -->
      @if (clientToDelete(); as target) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <h4 class="text-base font-bold text-slate-900">Supprimer l'établissement</h4>
            <p class="mt-2 text-sm text-slate-600">
              Confirmez-vous la suppression de l'établissement <strong>{{ target.name }}</strong> ?
            </p>
            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                (click)="clientToDelete.set(null)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="button"
                class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                (click)="executeDeleteClient(target.id)"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminClientsListComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  private readonly router = inject(Router);

  readonly showClientModal = signal<boolean>(false);
  readonly editingClientId = signal<string | null>(null);
  readonly clientSubmitted = signal<boolean>(false);
  readonly clientToDelete = signal<ClientResponse | null>(null);
  readonly sectionsModalClient = signal<ClientResponse | null>(null);
  readonly draftSections = signal<readonly EditableClientSectionRow[]>([]);
  readonly sectionValidationError = signal<string | null>(null);
  readonly clientTypes = ALL_CLIENT_TYPES;

  // Filtres sur les en-têtes du tableau, tri & pagination
  readonly filterName = signal<string>('');
  readonly filterClientType = signal<string>('');
  readonly filterAddress = signal<string>('');
  readonly sortField = signal<string>('name');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly hasActiveColumnFilters = computed<boolean>(() =>
    Boolean(
      this.filterName().trim() ||
        this.filterClientType() ||
        this.filterAddress().trim()
    )
  );

  readonly filteredClients = computed(() => {
    const nameQuery = this.filterName().trim().toLowerCase();
    const typeFilter = this.filterClientType();
    const addressQuery = this.filterAddress().trim().toLowerCase();
    const field = this.sortField();
    const direction = this.sortDirection();

    const matches = this.workflowStore.clients().filter((c) => {
      if (nameQuery && !c.name.toLowerCase().includes(nameQuery)) {
        return false;
      }
      if (typeFilter && (c.clientType || 'SECONDARY_SCHOOL') !== typeFilter) {
        return false;
      }
      if (addressQuery && !c.address.toLowerCase().includes(addressQuery)) {
        return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      switch (field) {
        case 'clientType':
          return compareTableValues(a.clientType, b.clientType, direction);
        case 'address':
          return compareTableValues(a.address, b.address, direction);
        case 'createdAt':
          return compareTableValues(a.createdAt, b.createdAt, direction);
        case 'name':
        default:
          return compareTableValues(a.name, b.name, direction);
      }
    });
  });

  readonly paginatedClients = computed(() =>
    slicePageItems(this.filteredClients(), this.currentPage(), this.pageSize())
  );

  readonly draftTotalCapacity = computed<number>(() =>
    this.draftSections().reduce((sum, s) => sum + (s.capacity > 0 ? s.capacity : 0), 0)
  );

  readonly clientForm = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    clientType: new FormControl<ClientType>('SECONDARY_SCHOOL', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    address: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    logoStorageKey: new FormControl<string>('', { nonNullable: true }),
  });

  constructor() {
    if (this.workflowStore.consumeNewClientModalRequest()) {
      this.openCreateClientModal();
    }
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
    this.filterClientType.set('');
    this.filterAddress.set('');
    this.currentPage.set(1);
  }

  areDraftSectionsValid(): boolean {
    const rows = this.draftSections();
    const seen = new Set<string>();
    for (const row of rows) {
      const trimmed = row.name.trim();
      if (!trimmed || !row.capacity || row.capacity < 1) {
        return false;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
    }
    return true;
  }

  getSectionPresets(
    clientType?: ClientType | null
  ): readonly { readonly name: string; readonly capacity: number }[] {
    if (clientType === 'PRIMARY_SCHOOL') {
      return [
        { name: 'Maternelle - Section A', capacity: 25 },
        { name: 'CP - Section A', capacity: 28 },
        { name: 'CE1 - Section A', capacity: 30 },
        { name: 'CE2 - Section A', capacity: 28 },
        { name: 'CM1 - Section A', capacity: 30 },
        { name: 'CM2 - Section A', capacity: 30 },
      ];
    }
    if (clientType === 'ORGANIZATION') {
      return [
        { name: 'Section Junior', capacity: 30 },
        { name: 'Section Senior', capacity: 40 },
        { name: 'Section Staff / Encadrement', capacity: 20 },
      ];
    }
    return [
      { name: '1ère Année Collège - Section A', capacity: 32 },
      { name: '2ème Année Collège - Section A', capacity: 30 },
      { name: '3ème Année Collège - Section A', capacity: 30 },
      { name: 'Tronc Commun - Section A', capacity: 28 },
      { name: '1ère Bac - Section A', capacity: 28 },
      { name: '2ème Bac - Section A', capacity: 26 },
    ];
  }

  addDraftSection(): void {
    this.sectionValidationError.set(null);
    const nextIndex = this.draftSections().length + 1;
    this.draftSections.update((list) => [
      ...list,
      {
        uid: `sec-${Date.now()}-${Math.random()}`,
        id: null,
        name: `Section ${nextIndex}`,
        capacity: 30,
      },
    ]);
  }

  addPresetSection(name: string, capacity: number): void {
    this.sectionValidationError.set(null);
    const exists = this.draftSections().some(
      (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const finalName = exists ? `${name} (${this.draftSections().length + 1})` : name;
    this.draftSections.update((list) => [
      ...list,
      {
        uid: `sec-${Date.now()}-${Math.random()}`,
        id: null,
        name: finalName,
        capacity,
      },
    ]);
  }

  updateDraftSectionName(uid: string, name: string): void {
    this.sectionValidationError.set(null);
    this.draftSections.update((list) =>
      list.map((s) => (s.uid === uid ? { ...s, name } : s))
    );
  }

  updateDraftSectionCapacity(uid: string, capacity: number): void {
    this.sectionValidationError.set(null);
    this.draftSections.update((list) =>
      list.map((s) => (s.uid === uid ? { ...s, capacity } : s))
    );
  }

  removeDraftSection(uid: string): void {
    this.sectionValidationError.set(null);
    this.draftSections.update((list) => list.filter((s) => s.uid !== uid));
  }

  private validateAndBuildSectionsPayload(): readonly ClientSectionInput[] | null {
    const rows = this.draftSections();
    const seen = new Set<string>();
    const result: ClientSectionInput[] = [];
    for (const row of rows) {
      const trimmed = row.name.trim();
      if (!trimmed) {
        this.sectionValidationError.set('Chaque section initiée doit avoir un nom.');
        return null;
      }
      if (!row.capacity || row.capacity < 1) {
        this.sectionValidationError.set(
          `La capacité de la section « ${trimmed} » doit être supérieure ou égale à 1.`
        );
        return null;
      }
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        this.sectionValidationError.set(
          `Deux sections ne peuvent pas porter le même nom : « ${trimmed} ».`
        );
        return null;
      }
      seen.add(key);
      result.push({
        id: row.id ?? null,
        name: trimmed,
        capacity: Math.round(row.capacity),
      });
    }
    this.sectionValidationError.set(null);
    return result;
  }

  isClientFieldInvalid(controlName: 'name' | 'address'): boolean {
    const control = this.clientForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.clientSubmitted());
  }

  openCreateClientModal(): void {
    this.editingClientId.set(null);
    this.clientSubmitted.set(false);
    this.sectionValidationError.set(null);
    this.draftSections.set([
      {
        uid: `sec-init-1`,
        id: null,
        name: 'Section A',
        capacity: 30,
      },
    ]);
    this.clientForm.reset({
      name: '',
      clientType: 'SECONDARY_SCHOOL',
      address: '',
      logoStorageKey: '',
    });
    this.showClientModal.set(true);
  }

  openEditClientModal(client: ClientResponse): void {
    this.editingClientId.set(client.id);
    this.clientSubmitted.set(false);
    this.sectionValidationError.set(null);
    this.draftSections.set(
      (client.sections ?? []).map((s, idx) => ({
        uid: `sec-${s.id || idx}`,
        id: s.id,
        name: s.name,
        capacity: s.capacity,
      }))
    );
    this.clientForm.setValue({
      name: client.name,
      clientType: client.clientType ?? 'SECONDARY_SCHOOL',
      address: client.address,
      logoStorageKey: client.logoStorageKey ?? '',
    });
    this.showClientModal.set(true);
  }

  closeClientModal(): void {
    this.showClientModal.set(false);
    this.editingClientId.set(null);
    this.clientSubmitted.set(false);
    this.sectionValidationError.set(null);
  }

  openSectionsModal(client: ClientResponse): void {
    this.sectionValidationError.set(null);
    this.draftSections.set(
      (client.sections ?? []).map((s, idx) => ({
        uid: `sec-${s.id || idx}`,
        id: s.id,
        name: s.name,
        capacity: s.capacity,
      }))
    );
    this.sectionsModalClient.set(client);
  }

  closeSectionsModal(): void {
    this.sectionsModalClient.set(null);
    this.sectionValidationError.set(null);
  }

  onSubmitSectionsModal(clientId: string): void {
    const sectionsPayload = this.validateAndBuildSectionsPayload();
    if (!sectionsPayload) {
      return;
    }
    this.workflowStore.updateClientSections(clientId, sectionsPayload, () =>
      this.closeSectionsModal()
    );
  }

  onSubmitClient(): void {
    this.clientSubmitted.set(true);
    this.clientForm.markAllAsTouched();
    const sectionsPayload = this.validateAndBuildSectionsPayload();
    if (this.clientForm.invalid || !sectionsPayload) {
      return;
    }
    const raw = this.clientForm.getRawValue();
    const payload = {
      name: raw.name,
      clientType: raw.clientType,
      address: raw.address,
      logoStorageKey: raw.logoStorageKey || null,
      sections: sectionsPayload,
    };
    const editId = this.editingClientId();
    if (editId) {
      this.workflowStore.updateClient(editId, payload, () => this.closeClientModal());
    } else {
      this.workflowStore.createClient(payload, () => this.closeClientModal());
    }
  }

  openClientDashboardPage(clientId: string): void {
    this.workflowStore.selectClient(clientId);
    void this.router.navigate(['/admin/dashboard']);
  }

  openClientCatalogPage(clientId: string): void {
    this.workflowStore.selectClient(clientId);
    void this.router.navigate(['/admin/catalog']);
  }

  getClientActions(client: ClientResponse): readonly TableActionItem[] {
    return [
      {
        label: "Piloter l'établissement",
        icon: '📊',
        variant: 'primary',
        onSelect: () => this.openClientDashboardPage(client.id),
      },
      {
        label: 'Catalogue produits',
        icon: '👕',
        onSelect: () => this.openClientCatalogPage(client.id),
      },
      {
        label: 'Gérer les sections & capacités',
        icon: '📐',
        badge: `${client.sections?.length || 0}`,
        variant: 'success',
        onSelect: () => this.openSectionsModal(client),
      },
      {
        label: "Modifier l'établissement",
        icon: '✏️',
        onSelect: () => this.openEditClientModal(client),
      },
      {
        label: "Supprimer l'établissement",
        icon: '🗑️',
        variant: 'danger',
        dividerBefore: true,
        onSelect: () => this.confirmDeleteClient(client),
      },
    ];
  }

  confirmDeleteClient(client: ClientResponse): void {
    this.clientToDelete.set(client);
  }

  executeDeleteClient(clientId: string): void {
    this.clientToDelete.set(null);
    this.workflowStore.deleteClient(clientId);
  }
}

/**
 * Page (/admin/catalog) : Consultation dédiée du Catalogue Produits d'un Établissement
 */
@Component({
  selector: 'app-admin-catalog-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    TranslatePipe,
    TableActionMenuComponent,
    DataTablePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (workflowStore.selectedClient(); as activeClient) {
        <!-- Bannière de la page Catalogue Produits -->
        <div class="ui-banner">
          <div>
            <div class="flex items-center gap-2.5">
              <h2 class="text-lg font-bold text-white">
                {{ activeClient.name }}
              </h2>
            </div>
            <p class="mt-1 text-sm text-blue-100/90">
              {{ activeClient.address }} — Catalogue des produits disponibles à la vente (DH / MAD) et tailles associées.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              class="ui-btn-emerald w-full sm:w-auto"
              (click)="openCreateCatalogModal()"
            >
              {{ 'adminCatalog.openCreateModalBtn' | t }}
            </button>
          </div>
        </div>

        <!-- VUE ESSENTIELLE : Tableau des Produits disponibles à la vente pour cet Établissement -->
        @if (activeTab() === 'CATALOG') {
          <div class="ui-card p-4 sm:p-6">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-slate-200/80 bg-[#f8fafc] align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th class="px-4 py-3 min-w-[220px]">
                      <div
                        class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                        (click)="toggleColumnSort('name')"
                      >
                        <span>Type UniformApp & Produit</span>
                        <span class="text-indigo-600">{{ getSortIndicator('name') }}</span>
                      </div>
                      <input
                        type="text"
                        [value]="filterProduct()"
                        (input)="filterProduct.set($any($event.target).value); currentPage.set(1)"
                        placeholder="Filtrer nom, réf. ou type..."
                        class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </th>
                    <th class="px-4 py-3 min-w-[190px]">
                      <div
                        class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                        (click)="toggleColumnSort('supplierName')"
                      >
                        <span>Fournisseur Rattaché</span>
                        <span class="text-indigo-600">{{ getSortIndicator('supplierName') }}</span>
                      </div>
                      <input
                        type="text"
                        [value]="filterSupplier()"
                        (input)="filterSupplier.set($any($event.target).value); currentPage.set(1)"
                        placeholder="Filtrer fournisseur..."
                        class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </th>
                    <th class="px-4 py-3 min-w-[180px]">
                      <div>Coloris & Tailles Associées</div>
                      <input
                        type="text"
                        [value]="filterColorOrSize()"
                        (input)="filterColorOrSize.set($any($event.target).value); currentPage.set(1)"
                        placeholder="Filtrer coloris ou taille..."
                        class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                      />
                    </th>
                    <th class="px-4 py-3 min-w-[160px]">Photos du Produit</th>
                    <th class="px-4 py-3 min-w-[130px]">
                      <div
                        class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                        (click)="toggleColumnSort('b2cUnitPrice')"
                      >
                        <span>Prix Vente Client</span>
                        <span class="text-indigo-600">{{ getSortIndicator('b2cUnitPrice') }}</span>
                      </div>
                    </th>
                    <th class="px-4 py-3 min-w-[130px]">
                      <div
                        class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                        (click)="toggleColumnSort('b2bUnitCost')"
                      >
                        <span>Prix Achat Fournisseur</span>
                        <span class="text-indigo-600">{{ getSortIndicator('b2bUnitCost') }}</span>
                      </div>
                    </th>
                    <th class="px-4 py-3 text-right min-w-[110px]">
                      <div>{{ 'adminCatalog.colActions' | t }}</div>
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
                  @for (item of paginatedCatalogItems(); track item.id) {
                    <tr class="border-b border-slate-200 hover:bg-slate-50">
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-2">
                          <span class="rounded-md bg-indigo-50 ring-1 ring-inset ring-indigo-200/70 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            {{ resolveProductTypeLabel(item.productType) }}
                          </span>
                          <span class="font-mono text-xs text-slate-400">{{ item.referenceCode }}</span>
                        </div>
                        <div class="mt-1 text-sm font-bold text-slate-900">{{ item.name }}</div>
                      </td>
                      <td class="px-5 py-4">
                        <span class="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                          🏭 {{ item.supplierName || 'Atelier Textile Atlas — Casablanca' }}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-xs">
                        <div class="font-bold text-slate-800">Coloris : {{ item.colorReference }}</div>
                        <div class="mt-1 text-slate-500">
                          Tailles : <span class="font-semibold text-slate-700">{{ formatAvailableSizes(item.availableSizes) }}</span>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-xs text-slate-600 space-y-0.5">
                        <div>
                          <span class="font-semibold text-slate-700">Photo 1 :</span>
                          <code class="ml-1 font-mono text-[11px]">{{ item.frontVisualStorageKey }}</code>
                        </div>
                        @if (item.backVisualStorageKey) {
                          <div>
                            <span class="font-semibold text-slate-700">Photo 2 :</span>
                            <code class="ml-1 font-mono text-[11px]">{{ item.backVisualStorageKey }}</code>
                          </div>
                        }
                      </td>
                      <td class="px-5 py-4 text-sm font-extrabold text-[#15803d]">
                        {{ item.b2cUnitPrice | number: '1.2-2' }} DH
                      </td>
                      <td class="px-5 py-4 text-sm font-bold text-[#163672]">
                        {{ item.b2bUnitCost | number: '1.2-2' }} DH
                      </td>
                      <td class="px-5 py-4 text-right">
                        <app-table-action-menu
                          [menuTitle]="item.name"
                          [actions]="getCatalogItemActions(item)"
                        />
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-5 py-10 text-center text-sm text-slate-500">
                        {{ 'adminCatalog.emptyItems' | t }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <app-data-table-pagination
              [(currentPage)]="currentPage"
              [(pageSize)]="pageSize"
              [totalItems]="filteredCatalogItems().length"
            />
          </div>
        }

        <!-- VUE 2 : Consultation des Grilles de Tailles et du Stock de l'Établissement -->
        @if (activeTab() === 'VARIANTS_STOCK') {
          <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ 'adminVariants.sectionTitle' | t }}
                </h3>
                <p class="mt-1 text-xs text-slate-500">
                  {{ 'adminVariants.sectionSubtitle' | t }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                (click)="activeTab.set('CATALOG')"
              >
                ← Retour au catalogue produits
              </button>
            </div>

            <div class="grid grid-cols-1 gap-6 md:grid-cols-12 items-center rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div class="md:col-span-5 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {{ 'adminVariants.selectGenderLabel' | t }}
                </label>
                <div class="flex flex-wrap gap-2">
                  @for (g of allowedGenders(); track g) {
                    <button
                      type="button"
                      class="rounded-lg px-3.5 py-2 text-xs font-bold transition"
                      [class.bg-slate-900]="previewGender() === g"
                      [class.text-white]="previewGender() === g"
                      [class.bg-white]="previewGender() !== g"
                      [class.border]="previewGender() !== g"
                      [class.border-slate-300]="previewGender() !== g"
                      [class.text-slate-700]="previewGender() !== g"
                      (click)="previewGender.set(g)"
                    >
                      {{ ('gender.' + g) | t }}
                    </button>
                  }
                </div>
              </div>

              <div class="md:col-span-7 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {{ 'adminVariants.activeGridLabel' | t }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    [class.bg-amber-100]="previewGender() === 'KIDS'"
                    [class.text-amber-800]="previewGender() === 'KIDS'"
                    [class.bg-indigo-100]="previewGender() !== 'KIDS'"
                    [class.text-indigo-800]="previewGender() !== 'KIDS'"
                  >
                    {{ (previewGender() === 'KIDS' ? 'adminVariants.gridKidsBadge' : 'adminVariants.gridAdultBadge') | t }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-2">
                  @for (s of previewAllowedSizes(); track s) {
                    <button
                      type="button"
                      class="rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                      [class.border-[#163672]]="previewSelectedSize() === s"
                      [class.bg-[#163672]]="previewSelectedSize() === s"
                      [class.text-white]="previewSelectedSize() === s"
                      [class.border-slate-300]="previewSelectedSize() !== s"
                      [class.bg-white]="previewSelectedSize() !== s"
                      [class.text-slate-800]="previewSelectedSize() !== s"
                      (click)="previewSelectedSize.set(s)"
                    >
                      {{ ('size.' + s) | t }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Saisie rapide d'approvisionnement / ajustement du stock pour la variante sélectionnée -->
            @if (workflowStore.adminCatalogItems().length > 0) {
              <div class="flex flex-wrap items-end gap-4 rounded-xl border border-emerald-200 bg-[#dcfce7]/40 p-4">
                <div class="flex-1 min-w-[220px]">
                  <label class="block text-xs font-bold text-slate-700">
                    Article à approvisionner ({{ ('gender.' + previewGender()) | t }} · {{ ('size.' + previewSelectedSize()) | t }})
                  </label>
                  <select
                    class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    [value]="selectedStockCatalogItemId()"
                    (change)="selectedStockCatalogItemId.set($any($event.target).value)"
                  >
                    @for (item of workflowStore.adminCatalogItems(); track item.id) {
                      <option [value]="item.id">{{ item.name }} ({{ item.referenceCode }})</option>
                    }
                  </select>
                </div>

                <div class="w-40">
                  <label class="block text-xs font-bold text-slate-700">
                    Stock disponible
                  </label>
                  <input
                    type="number"
                    min="0"
                    class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-900"
                    [value]="stockQuantityToSave()"
                    (input)="stockQuantityToSave.set(+$any($event.target).value || 0)"
                  />
                </div>

                <button
                  type="button"
                  class="rounded-xl bg-[#16803c] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#146c32] cursor-pointer"
                  (click)="saveSelectedVariantStock()"
                >
                  Enregistrer le stock de cette taille
                </button>
              </div>
            }

            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                {{ 'adminVariants.stockTableTitle' | t }} ({{ activeClient.name }})
              </h4>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                      <th class="px-4 py-2.5">Article du Catalogue</th>
                      <th class="px-4 py-2.5">Genre / Coupe</th>
                      <th class="px-4 py-2.5">Taille</th>
                      <th class="px-4 py-2.5">Stock Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (stock of workflowStore.stocks(); track stock.id) {
                      <tr class="border-b border-slate-200 hover:bg-slate-50">
                        <td class="px-4 py-3 text-sm font-semibold text-slate-900">
                          {{ resolveCatalogItemName(stock.catalogItemId) }}
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-700">
                          {{ ('gender.' + stock.gender) | t }}
                        </td>
                        <td class="px-4 py-3 text-sm font-medium text-slate-800">
                          {{ ('size.' + stock.size) | t }}
                        </td>
                        <td class="px-4 py-3 text-sm font-bold text-emerald-700">
                          {{ stock.availableQuantity }} unités
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-sm text-slate-500">
                          Aucun stock réceptionné pour le moment sur cet établissement.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- POPIN (Modale) Ajout / Modification d'un Produit du Catalogue -->
        @if (showCatalogModal()) {
          <div class="ui-modal-backdrop">
            <div class="ui-modal-panel max-w-2xl">
              <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    {{ (editingCatalogItemId() ? 'adminCatalog.editTitle' : 'adminCatalog.createTitle') | t }}
                  </h3>
                  <p class="text-xs text-slate-500">Établissement : {{ activeClient.name }}</p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  (click)="closeCatalogModal()"
                >
                  ✕
                </button>
              </div>

              <form [formGroup]="catalogForm" (ngSubmit)="onSubmitCatalogItem(activeClient.id)" novalidate class="mt-4 space-y-4">
                <p class="text-[11px] text-slate-500">
                  <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
                </p>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      Type de produit UniformApp <span class="font-bold text-rose-600">*</span>
                    </label>
                    <select
                      formControlName="productType"
                      class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-[#163672]"
                    >
                      @for (pt of productTypes; track pt.code) {
                        <option [value]="pt.code">{{ pt.label }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      Fournisseur chargé de la fabrication <span class="font-bold text-rose-600">*</span>
                    </label>
                    <select
                      formControlName="supplierId"
                      class="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-bold text-amber-900"
                      [class.border-rose-400]="isCatalogFieldInvalid('supplierId')"
                      [class.border-amber-300]="!isCatalogFieldInvalid('supplierId')"
                    >
                      <option value="">— Sélectionner un fournisseur —</option>
                      @for (sup of workflowStore.suppliers(); track sup.id) {
                        <option [value]="sup.id">
                          🏭 {{ sup.name }}{{ sup.specialty ? ' (' + sup.specialty + ')' : '' }}
                        </option>
                      }
                    </select>
                    @if (isCatalogFieldInvalid('supplierId')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        Veuillez choisir le fournisseur qui s'occupera de la fabrication de ce produit.
                      </p>
                    }
                    @if (selectedModalSupplier(); as activeSup) {
                      <div class="mt-1.5 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 text-[11px] text-amber-900">
                        <span class="font-bold">{{ activeSup.name }}</span>
                        @if (activeSup.cityAddress) {
                          <span> · {{ activeSup.cityAddress }}</span>
                        }
                      </div>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      {{ 'adminCatalog.referenceCodeLabel' | t }} <span class="font-bold text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      formControlName="referenceCode"
                      placeholder="ex: POLO-CASA-01"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                      [class.border-rose-400]="isCatalogFieldInvalid('referenceCode')"
                      [class.border-slate-300]="!isCatalogFieldInvalid('referenceCode')"
                    />
                    @if (isCatalogFieldInvalid('referenceCode')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        {{ 'validation.required' | t }}
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      {{ 'adminCatalog.nameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      formControlName="name"
                      placeholder="ex: Polo Écusson Officiel"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      [class.border-rose-400]="isCatalogFieldInvalid('name')"
                      [class.border-slate-300]="!isCatalogFieldInvalid('name')"
                    />
                    @if (isCatalogFieldInvalid('name')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        {{ 'validation.required' | t }}
                      </p>
                    }
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'adminCatalog.colorReferenceLabel' | t }} <span class="font-bold text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="colorReference"
                    placeholder="ex: Bleu Marine / Blanc Optique"
                    class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    [class.border-rose-400]="isCatalogFieldInvalid('colorReference')"
                    [class.border-slate-300]="!isCatalogFieldInvalid('colorReference')"
                  />
                  @if (isCatalogFieldInvalid('colorReference')) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      {{ 'validation.required' | t }}
                    </p>
                  }
                </div>

                <!-- TAILLES ASSOCIÉES AU PRODUIT -->
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <label class="block text-xs font-bold text-slate-800">
                      Tailles associées à ce produit ({{ selectedProductSizes().length }} sélectionnée(s)) <span class="text-rose-600">*</span>
                    </label>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        class="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 cursor-pointer"
                        (click)="selectAllKidsSizes()"
                      >
                        Tailles Enfant (2-14 ans)
                      </button>
                      @if (activeClient.clientType !== 'PRIMARY_SCHOOL') {
                        <button
                          type="button"
                          class="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 cursor-pointer"
                          (click)="selectAllAdultSizes()"
                        >
                          + Tailles Adulte (XS-3XL)
                        </button>
                      }
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    @for (sz of availableSizesForClient(); track sz) {
                      <button
                        type="button"
                        class="rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                        [class.border-[#163672]]="selectedProductSizes().includes(sz)"
                        [class.bg-[#163672]]="selectedProductSizes().includes(sz)"
                        [class.text-white]="selectedProductSizes().includes(sz)"
                        [class.border-slate-300]="!selectedProductSizes().includes(sz)"
                        [class.bg-white]="!selectedProductSizes().includes(sz)"
                        [class.text-slate-700]="!selectedProductSizes().includes(sz)"
                        (click)="toggleProductSize(sz)"
                      >
                        {{ ('size.' + sz) | t }}
                      </button>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      {{ 'adminCatalog.frontVisualLabel' | t }} <span class="font-bold text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      formControlName="frontVisualStorageKey"
                      placeholder="visuals/design-face.png"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-xs font-mono"
                      [class.border-rose-400]="isCatalogFieldInvalid('frontVisualStorageKey')"
                      [class.border-slate-300]="!isCatalogFieldInvalid('frontVisualStorageKey')"
                    />
                    @if (isCatalogFieldInvalid('frontVisualStorageKey')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        {{ 'validation.required' | t }}
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700">
                      {{ 'adminCatalog.backVisualLabel' | t }}
                    </label>
                    <input
                      type="text"
                      formControlName="backVisualStorageKey"
                      placeholder="visuals/design-dos.png"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'adminCatalog.placementNotesLabel' | t }}
                  </label>
                  <input
                    type="text"
                    formControlName="visualPlacementNotes"
                    placeholder="ex: Logo brodé cœur 7cm + sérigraphie dos épaules"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="block text-xs font-semibold text-emerald-800">
                      {{ 'adminCatalog.b2cPriceLabel' | t }} <span class="font-bold text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      formControlName="b2cUnitPrice"
                      (input)="previewB2cPrice.set(+$any($event.target).value || 0)"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold text-emerald-900"
                      [class.border-rose-400]="isCatalogFieldInvalid('b2cUnitPrice')"
                      [class.border-emerald-300]="!isCatalogFieldInvalid('b2cUnitPrice')"
                    />
                    @if (isCatalogFieldInvalid('b2cUnitPrice')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        {{ 'validation.priceMin' | t }}
                      </p>
                    }
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-indigo-800">
                      {{ 'adminCatalog.b2bCostLabel' | t }} <span class="font-bold text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      formControlName="b2bUnitCost"
                      (input)="previewB2bCost.set(+$any($event.target).value || 0)"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-bold text-indigo-900"
                      [class.border-rose-400]="isCatalogFieldInvalid('b2bUnitCost')"
                      [class.border-indigo-300]="!isCatalogFieldInvalid('b2bUnitCost')"
                    />
                    @if (isCatalogFieldInvalid('b2bUnitCost')) {
                      <p class="mt-1 text-xs font-semibold text-rose-600">
                        {{ 'validation.priceMin' | t }}
                      </p>
                    }
                  </div>
                </div>

                <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs border border-slate-200">
                  <span class="font-semibold text-slate-600">{{ 'adminCatalog.unitMarginLabel' | t }}</span>
                  <span
                    class="font-bold"
                    [class.text-emerald-700]="computedUnitMargin() >= 0"
                    [class.text-rose-600]="computedUnitMargin() < 0"
                  >
                    {{ computedUnitMargin() | number: '1.2-2' }} MAD / unité
                  </span>
                </div>

                <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    (click)="closeCatalogModal()"
                  >
                    {{ 'common.cancel' | t }}
                  </button>
                  <button
                    type="submit"
                    [disabled]="catalogForm.invalid || selectedProductSizes().length === 0 || workflowStore.loading()"
                    class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {{ (editingCatalogItemId() ? 'adminCatalog.saveUpdateBtn' : 'adminCatalog.saveCreateBtn') | t }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }

        <!-- POPIN Confirmation de suppression d'un Article -->
        @if (itemToDelete(); as targetItem) {
          <div class="ui-modal-backdrop">
            <div class="ui-modal-panel max-w-md">
              <h4 class="text-base font-bold text-slate-900">Supprimer l'article du catalogue</h4>
              <p class="mt-2 text-sm text-slate-600">
                Confirmez-vous la suppression de l'article
                <strong>{{ targetItem.name }} ({{ targetItem.referenceCode }})</strong> ?
              </p>
              <div class="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
                  (click)="itemToDelete.set(null)"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="button"
                  class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  (click)="executeDeleteCatalogItem(activeClient.id, targetItem.id)"
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="ui-card p-8 sm:p-12 text-center space-y-4">
          <div class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl ring-1 ring-indigo-200/60">
            🏫
          </div>
          <div class="space-y-1 max-w-md mx-auto">
            <h3 class="text-base font-extrabold text-slate-900">
              Aucun établissement disponible
            </h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Créez votre premier établissement scolaire pour accéder au catalogue produits.
            </p>
          </div>
          <div class="flex items-center justify-center pt-2">
            <button
              type="button"
              (click)="workflowStore.openNewClientModalFromNav()"
              class="ui-btn-emerald"
            >
              + Nouvel Établissement
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminCatalogListComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  readonly genders = ALL_GENDERS;
  readonly productTypes = ALL_PRODUCT_TYPES;

  readonly activeTab = signal<'CATALOG' | 'VARIANTS_STOCK'>('CATALOG');
  readonly showCatalogModal = signal<boolean>(false);
  readonly editingCatalogItemId = signal<string | null>(null);
  readonly catalogSubmitted = signal<boolean>(false);
  readonly itemToDelete = signal<AdminCatalogItemResponse | null>(null);
  readonly selectedProductSizes = signal<readonly Size[]>([...KIDS_SIZES]);

  // Filtres sur les en-têtes du tableau, tri & pagination
  readonly filterProduct = signal<string>('');
  readonly filterSupplier = signal<string>('');
  readonly filterColorOrSize = signal<string>('');
  readonly sortField = signal<string>('name');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly hasActiveColumnFilters = computed<boolean>(() =>
    Boolean(
      this.filterProduct().trim() ||
        this.filterSupplier().trim() ||
        this.filterColorOrSize().trim()
    )
  );

  readonly filteredCatalogItems = computed(() => {
    const productQuery = this.filterProduct().trim().toLowerCase();
    const supplierQuery = this.filterSupplier().trim().toLowerCase();
    const colorOrSizeQuery = this.filterColorOrSize().trim().toLowerCase();
    const field = this.sortField();
    const direction = this.sortDirection();

    const matches = this.workflowStore.adminCatalogItems().filter((item) => {
      if (productQuery) {
        const productBlob = `${item.name} ${item.referenceCode} ${this.resolveProductTypeLabel(item.productType)}`.toLowerCase();
        if (!productBlob.includes(productQuery)) {
          return false;
        }
      }
      if (supplierQuery && !(item.supplierName ?? '').toLowerCase().includes(supplierQuery)) {
        return false;
      }
      if (colorOrSizeQuery) {
        const colorSizeBlob = `${item.colorReference} ${this.formatAvailableSizes(item.availableSizes)}`.toLowerCase();
        if (!colorSizeBlob.includes(colorOrSizeQuery)) {
          return false;
        }
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      switch (field) {
        case 'productType':
          return compareTableValues(a.productType, b.productType, direction);
        case 'supplierName':
          return compareTableValues(a.supplierName, b.supplierName, direction);
        case 'b2cUnitPrice':
          return compareTableValues(a.b2cUnitPrice, b.b2cUnitPrice, direction);
        case 'b2bUnitCost':
          return compareTableValues(a.b2bUnitCost, b.b2bUnitCost, direction);
        case 'name':
        default:
          return compareTableValues(a.name, b.name, direction);
      }
    });
  });

  readonly paginatedCatalogItems = computed(() =>
    slicePageItems(this.filteredCatalogItems(), this.currentPage(), this.pageSize())
  );

  constructor() {
    this.workflowStore.refreshSuppliers();
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
    this.filterProduct.set('');
    this.filterSupplier.set('');
    this.filterColorOrSize.set('');
    this.currentPage.set(1);
  }

  selectedModalSupplier() {
    const id = this.catalogForm.controls.supplierId.value;
    if (!id) {
      return null;
    }
    return this.workflowStore.suppliers().find((s) => s.id === id) ?? null;
  }

  readonly availableSizesForClient = computed<readonly Size[]>(() => {
    const ct = this.workflowStore.selectedClient()?.clientType;
    if (ct === 'PRIMARY_SCHOOL') {
      return KIDS_SIZES;
    }
    return [...KIDS_SIZES, ...ADULT_SIZES];
  });

  readonly previewB2cPrice = signal<number>(250);
  readonly previewB2bCost = signal<number>(115);
  readonly computedUnitMargin = computed<number>(
    () => Math.round((this.previewB2cPrice() - this.previewB2bCost()) * 100) / 100
  );

  readonly allowedGenders = computed<readonly Gender[]>(() =>
    getAllowedGendersForClientType(this.workflowStore.selectedClient()?.clientType)
  );
  readonly previewGender = linkedSignal<readonly Gender[], Gender>({
    source: this.allowedGenders,
    computation: (genders) => genders[0] ?? 'KIDS',
  });
  readonly previewAllowedSizes = computed<readonly Size[]>(() =>
    getAllowedSizesForGender(this.previewGender(), this.workflowStore.selectedClient()?.clientType)
  );
  readonly previewSelectedSize = linkedSignal<readonly Size[], Size>({
    source: this.previewAllowedSizes,
    computation: (sizes) => sizes[0] ?? 'M',
  });

  readonly selectedStockCatalogItemId = linkedSignal<readonly AdminCatalogItemResponse[], string>({
    source: this.workflowStore.adminCatalogItems,
    computation: (items) => items[0]?.id ?? '',
  });
  readonly stockQuantityToSave = signal<number>(20);

  saveSelectedVariantStock(): void {
    const itemId =
      this.selectedStockCatalogItemId() || this.workflowStore.adminCatalogItems()[0]?.id || '';
    if (!itemId) {
      return;
    }
    this.workflowStore.upsertClientStock({
      catalogItemId: itemId,
      gender: this.previewGender(),
      size: this.previewSelectedSize(),
      availableQuantity: Math.max(0, this.stockQuantityToSave()),
    });
  }

  readonly catalogForm = new FormGroup({
    productType: new FormControl<ProductType>('POLO', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    supplierId: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    referenceCode: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    colorReference: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    frontVisualStorageKey: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    backVisualStorageKey: new FormControl<string>('', { nonNullable: true }),
    visualPlacementNotes: new FormControl<string>('', { nonNullable: true }),
    b2cUnitPrice: new FormControl<number>(250, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    b2bUnitCost: new FormControl<number>(115, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  isCatalogFieldInvalid(
    controlName:
      | 'supplierId'
      | 'referenceCode'
      | 'name'
      | 'colorReference'
      | 'frontVisualStorageKey'
      | 'b2cUnitPrice'
      | 'b2bUnitCost'
  ): boolean {
    const control = this.catalogForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.catalogSubmitted());
  }

  resolveProductTypeLabel(productType?: string | null): string {
    if (!productType) {
      return 'Polo';
    }
    const found = ALL_PRODUCT_TYPES.find((p) => p.code === productType.toUpperCase());
    return found ? found.label : productType;
  }

  formatAvailableSizes(availableSizes?: string | null): string {
    if (!availableSizes || !availableSizes.trim()) {
      return 'Toutes tailles';
    }
    return availableSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('AGE_') ? `${s.replace('AGE_', '')}a` : s))
      .join(', ');
  }

  toggleProductSize(size: Size): void {
    this.selectedProductSizes.update((curr) => {
      if (curr.includes(size)) {
        return curr.length > 1 ? curr.filter((s) => s !== size) : curr;
      }
      return [...curr, size];
    });
  }

  selectAllKidsSizes(): void {
    this.selectedProductSizes.set([...KIDS_SIZES]);
  }

  selectAllAdultSizes(): void {
    this.selectedProductSizes.set([...KIDS_SIZES, ...ADULT_SIZES]);
  }

  openCreateCatalogModal(): void {
    this.workflowStore.refreshSuppliers();
    this.editingCatalogItemId.set(null);
    this.catalogSubmitted.set(false);
    this.previewB2cPrice.set(250);
    this.previewB2bCost.set(115);
    this.selectedProductSizes.set([...KIDS_SIZES]);
    const defaultSupplierId = this.workflowStore.suppliers()[0]?.id ?? '';
    this.catalogForm.reset({
      productType: 'POLO',
      supplierId: defaultSupplierId,
      referenceCode: '',
      name: '',
      colorReference: '',
      frontVisualStorageKey: '',
      backVisualStorageKey: '',
      visualPlacementNotes: '',
      b2cUnitPrice: 250,
      b2bUnitCost: 115,
    });
    this.showCatalogModal.set(true);
  }

  openEditCatalogModal(item: AdminCatalogItemResponse): void {
    this.workflowStore.refreshSuppliers();
    this.editingCatalogItemId.set(item.id);
    this.catalogSubmitted.set(false);
    this.previewB2cPrice.set(item.b2cUnitPrice);
    this.previewB2bCost.set(item.b2bUnitCost);
    const parsedSizes = item.availableSizes
      ? (item.availableSizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean) as Size[])
      : [...KIDS_SIZES];
    this.selectedProductSizes.set(parsedSizes.length > 0 ? parsedSizes : [...KIDS_SIZES]);
    const matchedSupplierId =
      item.supplierId ||
      this.workflowStore
        .suppliers()
        .find((s) => s.name.toLowerCase() === (item.supplierName ?? '').toLowerCase())?.id ||
      this.workflowStore.suppliers()[0]?.id ||
      '';
    this.catalogForm.setValue({
      productType: (item.productType as ProductType) || 'POLO',
      supplierId: matchedSupplierId,
      referenceCode: item.referenceCode,
      name: item.name,
      colorReference: item.colorReference,
      frontVisualStorageKey: item.frontVisualStorageKey,
      backVisualStorageKey: item.backVisualStorageKey ?? '',
      visualPlacementNotes: item.visualPlacementNotes ?? '',
      b2cUnitPrice: item.b2cUnitPrice,
      b2bUnitCost: item.b2bUnitCost,
    });
    this.showCatalogModal.set(true);
  }

  closeCatalogModal(): void {
    this.showCatalogModal.set(false);
    this.editingCatalogItemId.set(null);
    this.catalogSubmitted.set(false);
  }

  onSubmitCatalogItem(clientId: string): void {
    this.catalogSubmitted.set(true);
    this.catalogForm.markAllAsTouched();
    if (this.catalogForm.invalid || this.selectedProductSizes().length === 0) {
      return;
    }
    const raw = this.catalogForm.getRawValue();
    const chosenSupplier = this.workflowStore
      .suppliers()
      .find((s) => s.id === raw.supplierId);
    const payload = {
      productType: raw.productType,
      supplierId: chosenSupplier ? chosenSupplier.id : raw.supplierId || null,
      supplierName: chosenSupplier ? chosenSupplier.name : 'Atelier UniformApp',
      availableSizes: this.selectedProductSizes().join(','),
      referenceCode: raw.referenceCode,
      name: raw.name,
      garmentStyle: this.resolveProductTypeLabel(raw.productType),
      colorReference: raw.colorReference,
      frontVisualStorageKey: raw.frontVisualStorageKey,
      backVisualStorageKey: raw.backVisualStorageKey || null,
      visualPlacementNotes: raw.visualPlacementNotes || null,
      b2cUnitPrice: raw.b2cUnitPrice,
      b2bUnitCost: raw.b2bUnitCost,
    };
    const editId = this.editingCatalogItemId();
    if (editId) {
      this.workflowStore.updateCatalogItem(clientId, editId, payload, () =>
        this.closeCatalogModal()
      );
    } else {
      this.workflowStore.createCatalogItem(clientId, payload, () =>
        this.closeCatalogModal()
      );
    }
  }

  executeDeleteCatalogItem(clientId: string, itemId: string): void {
    this.itemToDelete.set(null);
    this.workflowStore.deleteCatalogItem(clientId, itemId);
  }

  getCatalogItemActions(item: AdminCatalogItemResponse): readonly TableActionItem[] {
    return [
      {
        label: 'Modifier le produit & fournisseur',
        icon: '✏️',
        variant: 'primary',
        onSelect: () => this.openEditCatalogModal(item),
      },
      {
        label: 'Approvisionner / Gérer le stock',
        icon: '📦',
        variant: 'success',
        onSelect: () => {
          this.selectedStockCatalogItemId.set(item.id);
          this.activeTab.set('VARIANTS_STOCK');
        },
      },
      {
        label: 'Supprimer du catalogue',
        icon: '🗑️',
        variant: 'danger',
        dividerBefore: true,
        onSelect: () => this.itemToDelete.set(item),
      },
    ];
  }

  resolveCatalogItemName(catalogItemId: string): string {
    const found = this.workflowStore
      .adminCatalogItems()
      .find((item) => item.id === catalogItemId);
    return found ? `${found.name} (${found.referenceCode})` : catalogItemId;
  }
}
