import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplierResponse } from '../../core/models/uniform.models';
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
  selector: 'app-admin-suppliers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    TableActionMenuComponent,
    DataTablePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      @if (workflowStore.suppliers().length > 0) {
      <!-- En-tête de la page de consultation globale des fournisseurs -->
      <div class="ui-banner">
        <div>
          <h2 class="text-lg font-bold text-white">
            Fournisseurs &amp; Ateliers de Confection ({{ workflowStore.suppliers().length }})
          </h2>
          <p class="mt-0.5 text-sm text-blue-100/90">
            Répertoire transversal des ateliers partenaires. Chaque produit ajouté au catalogue d'un établissement est rattaché à l'un de ces fournisseurs.
          </p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            (click)="openCreateSupplierModal()"
            class="ui-btn-emerald w-full sm:w-auto"
          >
            + Nouveau Fournisseur
          </button>
        </div>
      </div>

      <!-- Tableau de consultation des fournisseurs -->
      <section class="ui-card p-4 sm:p-6">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-slate-200/80 bg-[#f8fafc] align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th class="px-4 py-3 rounded-tl-xl min-w-[200px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('name')"
                  >
                    <span>Fournisseur / Atelier</span>
                    <span class="text-indigo-600">{{ getSortIndicator('name') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterName()"
                    (input)="filterName.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer fournisseur..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 min-w-[180px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('specialty')"
                  >
                    <span>Spécialité Textile</span>
                    <span class="text-indigo-600">{{ getSortIndicator('specialty') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterSpecialty()"
                    (input)="filterSpecialty.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer spécialité..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 min-w-[190px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('contactName')"
                  >
                    <span>Interlocuteur &amp; Coordonnées</span>
                    <span class="text-indigo-600">{{ getSortIndicator('contactName') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterContact()"
                    (input)="filterContact.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer contact, tél, email..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 min-w-[190px]">
                  <div
                    class="flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('cityAddress')"
                  >
                    <span>Ville / Zone Industrielle</span>
                    <span class="text-indigo-600">{{ getSortIndicator('cityAddress') }}</span>
                  </div>
                  <input
                    type="text"
                    [value]="filterCity()"
                    (input)="filterCity.set($any($event.target).value); currentPage.set(1)"
                    placeholder="Filtrer ville / adresse..."
                    class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </th>
                <th class="px-4 py-3 text-center min-w-[140px]">
                  <div
                    class="inline-flex items-center gap-1 cursor-pointer select-none hover:text-indigo-700"
                    (click)="toggleColumnSort('attachedCatalogItemsCount')"
                  >
                    <span>Produits rattachés</span>
                    <span class="text-indigo-600">{{ getSortIndicator('attachedCatalogItemsCount') }}</span>
                  </div>
                </th>
                <th class="px-4 py-3 text-right rounded-tr-xl min-w-[110px]">
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
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (supplier of paginatedSuppliers(); track supplier.id) {
                <tr>
                  <td class="px-5 py-4">
                    <div class="font-bold text-slate-900">{{ supplier.name }}</div>
                    <div class="text-[11px] text-slate-400">
                      Créé le {{ supplier.createdAt | date:'dd/MM/yyyy' }}
                    </div>
                  </td>
                  <td class="px-5 py-4">
                    @if (supplier.specialty) {
                      <span class="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
                        {{ supplier.specialty }}
                      </span>
                    } @else {
                      <span class="text-xs text-slate-400">Confection générale</span>
                    }
                  </td>
                  <td class="px-5 py-4">
                    <div class="text-xs font-semibold text-slate-800">
                      {{ supplier.contactName || '—' }}
                    </div>
                    <div class="text-xs text-slate-500">
                      {{ supplier.phone || '' }}
                      @if (supplier.email) {
                        <span class="text-slate-400"> · {{ supplier.email }}</span>
                      }
                    </div>
                  </td>
                  <td class="px-5 py-4 text-xs text-slate-600">
                    {{ supplier.cityAddress || '—' }}
                  </td>
                  <td class="px-5 py-4 text-center">
                    <span class="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/80">
                      {{ supplier.attachedCatalogItemsCount }} produit(s)
                    </span>
                  </td>
                  <td class="px-5 py-4 text-right">
                    <app-table-action-menu
                      [menuTitle]="supplier.name"
                      [actions]="getSupplierActions(supplier)"
                    />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">
                    Aucun fournisseur trouvé. Cliquez sur « + Nouveau Fournisseur » pour référencer un atelier de confection.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-data-table-pagination
          [(currentPage)]="currentPage"
          [(pageSize)]="pageSize"
          [totalItems]="filteredSuppliers().length"
        />
      </section>
      } @else {
        <div class="ui-card p-8 sm:p-12 text-center space-y-4">
          <div class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl ring-1 ring-indigo-200/60">
            🏭
          </div>
          <div class="space-y-1 max-w-md mx-auto">
            <h3 class="text-base font-extrabold text-slate-900">
              Aucun fournisseur disponible
            </h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Ajoutez votre premier fournisseur ou atelier de confection pour pouvoir lui rattacher les produits des établissements.
            </p>
          </div>
          <div class="flex items-center justify-center pt-2">
            <button
              type="button"
              (click)="openCreateSupplierModal()"
              class="ui-btn-emerald"
            >
              + Nouveau Fournisseur
            </button>
          </div>
        </div>
      }

      <!-- POPIN (MODAL) : CRÉATION / MODIFICATION D'UN FOURNISSEUR -->
      @if (showSupplierModal()) {
        <div
          class="ui-modal-backdrop"
          (click)="closeSupplierModal()"
        >
          <div
            class="ui-modal-panel max-w-lg"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ editingSupplierId() ? 'Modifier le fournisseur' : 'Nouveau fournisseur / atelier' }}
                </h3>
              </div>
              <button
                type="button"
                (click)="closeSupplierModal()"
                class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="supplierForm" (ngSubmit)="submitSupplier()" class="mt-4 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Nom du fournisseur / atelier <span class="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  formControlName="name"
                  placeholder="Ex: Atelier Textile Casablanca"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
                @if (isControlInvalid('name')) {
                  <p class="mt-1 text-xs font-medium text-rose-600">
                    Le nom du fournisseur est obligatoire (minimum 2 caractères).
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Spécialité de confection
                  </label>
                  <input
                    type="text"
                    formControlName="specialty"
                    placeholder="Ex: Polos, Chemises & Broderie"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Responsable / Interlocuteur
                  </label>
                  <input
                    type="text"
                    formControlName="contactName"
                    placeholder="Ex: Youssef Berrada"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Téléphone Maroc (+212 / 05 / 06)
                  </label>
                  <input
                    type="text"
                    formControlName="phone"
                    placeholder="+212 522 34 56 78"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Email de commande
                  </label>
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="production@atelier.ma"
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                  @if (isControlInvalid('email')) {
                    <p class="mt-1 text-xs font-medium text-rose-600">
                      Veuillez saisir une adresse email valide.
                    </p>
                  }
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Ville / Adresse de l'atelier
                </label>
                <input
                  type="text"
                  formControlName="cityAddress"
                  placeholder="Ex: Zone Industrielle Aïn Sebaâ, Casablanca"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div class="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  (click)="closeSupplierModal()"
                  class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  [disabled]="supplierForm.invalid || workflowStore.loading()"
                  class="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {{ editingSupplierId() ? 'Enregistrer les modifications' : 'Ajouter le fournisseur' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- POPIN DE CONFIRMATION DE SUPPRESSION -->
      @if (supplierPendingDeletion(); as target) {
        <div
          class="ui-modal-backdrop"
          (click)="supplierPendingDeletion.set(null)"
        >
          <div
            class="ui-modal-panel max-w-md"
            (click)="$event.stopPropagation()"
          >
            <h3 class="text-base font-bold text-slate-900">Retirer ce fournisseur ?</h3>
            <p class="mt-2 text-xs text-slate-600 leading-relaxed">
              Souhaitez-vous archiver le fournisseur <strong>{{ target.name }}</strong> ? Les produits déjà rattachés conserveront l'historique de ce fournisseur.
            </p>
            <div class="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="supplierPendingDeletion.set(null)"
                class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                (click)="confirmDeleteSupplier()"
                class="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminSuppliersComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  private readonly fb = inject(FormBuilder);

  readonly showSupplierModal = signal(false);
  readonly editingSupplierId = signal<string | null>(null);
  readonly supplierSubmitted = signal(false);
  readonly supplierPendingDeletion = signal<SupplierResponse | null>(null);

  // Filtres sur les en-têtes du tableau, tri & pagination
  readonly filterName = signal<string>('');
  readonly filterSpecialty = signal<string>('');
  readonly filterContact = signal<string>('');
  readonly filterCity = signal<string>('');
  readonly sortField = signal<string>('name');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  readonly hasActiveColumnFilters = computed<boolean>(() =>
    Boolean(
      this.filterName().trim() ||
        this.filterSpecialty().trim() ||
        this.filterContact().trim() ||
        this.filterCity().trim()
    )
  );

  readonly filteredSuppliers = computed(() => {
    const nameQuery = this.filterName().trim().toLowerCase();
    const specialtyQuery = this.filterSpecialty().trim().toLowerCase();
    const contactQuery = this.filterContact().trim().toLowerCase();
    const cityQuery = this.filterCity().trim().toLowerCase();
    const field = this.sortField();
    const direction = this.sortDirection();

    const matches = this.workflowStore.suppliers().filter((s) => {
      if (nameQuery && !s.name.toLowerCase().includes(nameQuery)) {
        return false;
      }
      if (specialtyQuery && !(s.specialty ?? 'confection générale').toLowerCase().includes(specialtyQuery)) {
        return false;
      }
      if (contactQuery) {
        const contactBlob = `${s.contactName ?? ''} ${s.phone ?? ''} ${s.email ?? ''}`.toLowerCase();
        if (!contactBlob.includes(contactQuery)) {
          return false;
        }
      }
      if (cityQuery && !(s.cityAddress ?? '').toLowerCase().includes(cityQuery)) {
        return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      switch (field) {
        case 'specialty':
          return compareTableValues(a.specialty, b.specialty, direction);
        case 'contactName':
          return compareTableValues(a.contactName, b.contactName, direction);
        case 'cityAddress':
          return compareTableValues(a.cityAddress, b.cityAddress, direction);
        case 'attachedCatalogItemsCount':
          return compareTableValues(a.attachedCatalogItemsCount, b.attachedCatalogItemsCount, direction);
        case 'name':
        default:
          return compareTableValues(a.name, b.name, direction);
      }
    });
  });

  readonly paginatedSuppliers = computed(() =>
    slicePageItems(this.filteredSuppliers(), this.currentPage(), this.pageSize())
  );

  readonly supplierForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    specialty: [''],
    contactName: [''],
    phone: [''],
    email: ['', [Validators.email]],
    cityAddress: [''],
  });

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
    this.filterName.set('');
    this.filterSpecialty.set('');
    this.filterContact.set('');
    this.filterCity.set('');
    this.currentPage.set(1);
  }

  getSupplierActions(supplier: SupplierResponse): readonly TableActionItem[] {
    return [
      {
        label: 'Modifier le fournisseur',
        icon: '✏️',
        variant: 'primary',
        onSelect: () => this.openEditSupplierModal(supplier),
      },
      {
        label: 'Supprimer / Archiver',
        icon: '🗑️',
        variant: 'danger',
        dividerBefore: true,
        onSelect: () => this.promptDeleteSupplier(supplier),
      },
    ];
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.supplierForm.get(controlName);
    return !!control && control.invalid && (control.touched || this.supplierSubmitted());
  }

  openCreateSupplierModal(): void {
    this.editingSupplierId.set(null);
    this.supplierSubmitted.set(false);
    this.supplierForm.reset({
      name: '',
      specialty: '',
      contactName: '',
      phone: '+212 ',
      email: '',
      cityAddress: '',
    });
    this.showSupplierModal.set(true);
  }

  openEditSupplierModal(supplier: SupplierResponse): void {
    this.editingSupplierId.set(supplier.id);
    this.supplierSubmitted.set(false);
    this.supplierForm.reset({
      name: supplier.name,
      specialty: supplier.specialty ?? '',
      contactName: supplier.contactName ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      cityAddress: supplier.cityAddress ?? '',
    });
    this.showSupplierModal.set(true);
  }

  closeSupplierModal(): void {
    this.showSupplierModal.set(false);
    this.editingSupplierId.set(null);
    this.supplierSubmitted.set(false);
  }

  submitSupplier(): void {
    this.supplierSubmitted.set(true);
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    const raw = this.supplierForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      specialty: raw.specialty.trim() || null,
      contactName: raw.contactName.trim() || null,
      phone: raw.phone.trim() || null,
      email: raw.email.trim() || null,
      cityAddress: raw.cityAddress.trim() || null,
    };

    const supplierId = this.editingSupplierId();
    if (supplierId) {
      this.workflowStore.updateSupplier(supplierId, payload, () => this.closeSupplierModal());
    } else {
      this.workflowStore.createSupplier(payload, () => this.closeSupplierModal());
    }
  }

  promptDeleteSupplier(supplier: SupplierResponse): void {
    this.supplierPendingDeletion.set(supplier);
  }

  confirmDeleteSupplier(): void {
    const target = this.supplierPendingDeletion();
    if (!target) {
      return;
    }
    this.workflowStore.deleteSupplier(target.id);
    this.supplierPendingDeletion.set(null);
  }
}
