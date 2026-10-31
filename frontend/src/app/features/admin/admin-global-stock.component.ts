import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import {
  ALL_PRODUCT_TYPES,
  GlobalStockItemResponse,
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

@Component({
  selector: 'app-admin-global-stock',
  standalone: true,
  imports: [
    DatePipe,
    TranslatePipe,
    TableActionMenuComponent,
    DataTablePaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <!-- Bannière de la page Stock Global -->
      <div class="ui-banner">
        <div>
          <h2 class="text-lg font-bold text-white">
            Stock Global ({{ filteredStocks().length }} référence(s) · {{ totalFilteredUnits() }} unité(s))
          </h2>
          <p class="mt-1 text-sm text-indigo-100/90">
            Visibilité consolidée du stock tous établissements confondus. Utilisez les en-têtes du tableau pour filtrer et trier.
          </p>
        </div>

        @if (hasActiveFilters()) {
          <button
            type="button"
            (click)="resetFilters()"
            class="w-full sm:w-auto rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        }
      </div>

      <!-- TABLEAU DU STOCK GLOBAL (FILTRES & TRI UNIQUEMENT SUR LES EN-TÊTES) -->
      <div class="ui-card p-4 sm:p-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-200/80 bg-slate-50/95 align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <!-- Colonne 1 : Établissement -->
                <th class="px-4 py-3 min-w-[180px]">
                  <button
                    type="button"
                    (click)="toggleColumnSort('clientName')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Établissement</span>
                    <span class="text-indigo-600">{{ getSortIndicator('clientName') }}</span>
                  </button>
                  <select
                    class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold normal-case text-slate-700 focus:border-indigo-500"
                    [value]="filterClientId()"
                    (change)="onFilterClientChange($any($event.target).value)"
                  >
                    <option value="">Tous ({{ workflowStore.clients().length }})</option>
                    @for (client of workflowStore.clients(); track client.id) {
                      <option [value]="client.id">{{ client.name }}</option>
                    }
                  </select>
                </th>

                <!-- Colonne 2 : Type de produit -->
                <th class="px-4 py-3 min-w-[160px]">
                  <button
                    type="button"
                    (click)="toggleColumnSort('productType')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Type de produit</span>
                    <span class="text-indigo-600">{{ getSortIndicator('productType') }}</span>
                  </button>
                  <select
                    class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold normal-case text-slate-700 focus:border-indigo-500"
                    [value]="filterProductType()"
                    (change)="onFilterProductTypeChange($any($event.target).value)"
                  >
                    <option value="">Tous les types</option>
                    @for (pt of productTypes; track pt.code) {
                      <option [value]="pt.code">{{ pt.label }}</option>
                    }
                  </select>
                </th>

                <!-- Colonne 3 : Produit & Référence -->
                <th class="px-4 py-3 min-w-[190px]">
                  <button
                    type="button"
                    (click)="toggleColumnSort('itemName')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Produit &amp; Référence</span>
                    <span class="text-indigo-600">{{ getSortIndicator('itemName') }}</span>
                  </button>
                  <input
                    type="text"
                    placeholder="Filtrer produit / réf..."
                    [value]="searchQuery()"
                    (input)="onSearchChange($any($event.target).value)"
                    class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium normal-case text-slate-800 placeholder:text-slate-400 focus:border-indigo-500"
                  />
                </th>

                <!-- Colonne 4 : Fournisseur -->
                <th class="px-4 py-3 min-w-[170px]">
                  <button
                    type="button"
                    (click)="toggleColumnSort('supplierName')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Fournisseur</span>
                    <span class="text-indigo-600">{{ getSortIndicator('supplierName') }}</span>
                  </button>
                  <select
                    class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold normal-case text-slate-700 focus:border-indigo-500"
                    [value]="filterSupplier()"
                    (change)="onFilterSupplierChange($any($event.target).value)"
                  >
                    <option value="">Tous les fournisseurs</option>
                    @for (sup of availableSupplierOptions(); track sup) {
                      <option [value]="sup">{{ sup }}</option>
                    }
                  </select>
                </th>

                <!-- Colonne 5 : Coupe & Taille -->
                <th class="px-4 py-3 min-w-[140px]">
                  <button
                    type="button"
                    (click)="toggleColumnSort('size')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Coupe &amp; Taille</span>
                    <span class="text-indigo-600">{{ getSortIndicator('size') }}</span>
                  </button>
                  <input
                    type="text"
                    placeholder="Filtrer taille..."
                    [value]="filterSize()"
                    (input)="onFilterSizeChange($any($event.target).value)"
                    class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium normal-case text-slate-800 placeholder:text-slate-400 focus:border-indigo-500"
                  />
                </th>

                <!-- Colonne 6 : Stock disponible -->
                <th class="px-4 py-3 text-center align-middle">
                  <button
                    type="button"
                    (click)="toggleColumnSort('availableQuantity')"
                    class="mx-auto flex items-center justify-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Stock disponible</span>
                    <span class="text-indigo-600">{{ getSortIndicator('availableQuantity') }}</span>
                  </button>
                </th>

                <!-- Colonne 7 : Dernière mise à jour -->
                <th class="px-4 py-3 align-middle">
                  <button
                    type="button"
                    (click)="toggleColumnSort('updatedAt')"
                    class="flex items-center gap-1 font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 cursor-pointer"
                  >
                    <span>Dernière mise à jour</span>
                    <span class="text-indigo-600">{{ getSortIndicator('updatedAt') }}</span>
                  </button>
                </th>

                <!-- Colonne 8 : Actions -->
                <th class="px-4 py-3 text-right align-middle">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of paginatedStocks(); track row.stockId) {
                <tr class="border-b border-slate-200">
                  <td class="px-4 py-4 text-sm font-bold text-slate-900">
                    {{ row.clientName }}
                  </td>
                  <td class="px-4 py-4 text-xs">
                    <span class="rounded-md bg-indigo-50 ring-1 ring-inset ring-indigo-200/70 px-2.5 py-1 font-bold text-indigo-700">
                      {{ resolveProductTypeLabel(row.productType) }}
                    </span>
                  </td>
                  <td class="px-4 py-4">
                    <div class="text-sm font-bold text-slate-900">{{ row.itemName }}</div>
                    <div class="font-mono text-xs text-slate-400">{{ row.referenceCode }}</div>
                  </td>
                  <td class="px-4 py-4 text-xs">
                    <span class="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-900">
                      🏭 {{ row.supplierName }}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-xs">
                    <span class="font-semibold text-slate-700">{{ ('gender.' + row.gender) | t }}</span>
                    ·
                    <span class="rounded bg-slate-100 px-2 py-0.5 font-extrabold text-slate-900">
                      {{ ('size.' + row.size) | t }}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-center">
                    <span
                      class="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                      [class.bg-emerald-100]="row.availableQuantity > 10"
                      [class.text-emerald-800]="row.availableQuantity > 10"
                      [class.bg-amber-100]="row.availableQuantity > 0 && row.availableQuantity <= 10"
                      [class.text-amber-800]="row.availableQuantity > 0 && row.availableQuantity <= 10"
                      [class.bg-rose-100]="row.availableQuantity === 0"
                      [class.text-rose-800]="row.availableQuantity === 0"
                    >
                      {{ row.availableQuantity }} unité(s)
                    </span>
                  </td>
                  <td class="px-4 py-4 text-xs text-slate-500">
                    {{ row.updatedAt | date: 'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-4 py-4 text-right">
                    <app-table-action-menu
                      [menuTitle]="row.itemName + ' (' + row.size + ')'"
                      [actions]="getStockRowActions(row)"
                    />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-5 py-10 text-center text-sm text-slate-500">
                    Aucune ligne de stock disponible.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-data-table-pagination
          [(currentPage)]="currentPage"
          [(pageSize)]="pageSize"
          [totalItems]="filteredStocks().length"
        />
      </div>

      <!-- POPIN d'Ajustement de Stock -->
      @if (editingStockRow(); as targetRow) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Ajuster le stock disponible
                </h3>
                <p class="text-xs text-slate-500">
                  {{ targetRow.clientName }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                (click)="editingStockRow.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-4">
              <div class="rounded-xl bg-slate-50 p-3.5 text-xs space-y-1">
                <div class="font-bold text-slate-900">{{ targetRow.itemName }} ({{ targetRow.referenceCode }})</div>
                <div class="text-slate-600">
                  Fournisseur : <span class="font-semibold">{{ targetRow.supplierName }}</span>
                </div>
                <div class="text-slate-600">
                  Variante : <span class="font-bold text-indigo-700">{{ ('gender.' + targetRow.gender) | t }} · {{ ('size.' + targetRow.size) | t }}</span>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Nouvelle quantité disponible en stock <span class="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-extrabold text-slate-900"
                  [value]="editedQuantity()"
                  (input)="editedQuantity.set(+$any($event.target).value)"
                />
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  (click)="editingStockRow.set(null)"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="button"
                  [disabled]="editedQuantity() < 0 || workflowStore.loading()"
                  class="ui-btn-primary !py-2 !text-xs"
                  (click)="saveAdjustedStock()"
                >
                  {{ 'common.save' | t }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminGlobalStockComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  private readonly route = inject(ActivatedRoute);
  readonly productTypes = ALL_PRODUCT_TYPES;

  // Header filters
  readonly filterClientId = signal<string>('');
  readonly filterProductType = signal<string>('');
  readonly filterSupplier = signal<string>('');
  readonly filterSize = signal<string>('');
  readonly searchQuery = signal<string>('');

  // Table sort & pagination state
  readonly sortField = signal<string>('clientName');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Stock adjustment modal state
  readonly editingStockRow = signal<GlobalStockItemResponse | null>(null);
  readonly editedQuantity = signal<number>(0);

  readonly availableSupplierOptions = computed(() => {
    const names = new Set<string>();
    for (const s of this.workflowStore.suppliers()) {
      if (s.name) {
        names.add(s.name);
      }
    }
    for (const row of this.workflowStore.globalStocks()) {
      if (row.supplierName) {
        names.add(row.supplierName);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly filteredStocks = computed(() => {
    const clientFilter = this.filterClientId();
    const productTypeFilter = this.filterProductType().toUpperCase();
    const supplierFilter = this.filterSupplier().toLowerCase();
    const sizeFilter = this.filterSize().trim().toLowerCase();
    const query = this.searchQuery().trim().toLowerCase();
    const field = this.sortField();
    const direction = this.sortDirection();

    const matches = this.workflowStore.globalStocks().filter((row) => {
      if (clientFilter && row.clientId !== clientFilter) {
        return false;
      }
      if (productTypeFilter && (row.productType ?? '').toUpperCase() !== productTypeFilter) {
        return false;
      }
      if (supplierFilter && (row.supplierName ?? '').toLowerCase() !== supplierFilter) {
        return false;
      }
      if (sizeFilter && !row.size.toLowerCase().includes(sizeFilter) && !row.gender.toLowerCase().includes(sizeFilter)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        row.itemName.toLowerCase().includes(query) ||
        row.referenceCode.toLowerCase().includes(query) ||
        row.clientName.toLowerCase().includes(query)
      );
    });

    return [...matches].sort((a, b) => {
      switch (field) {
        case 'productType':
          return compareTableValues(a.productType, b.productType, direction);
        case 'itemName':
          return compareTableValues(a.itemName, b.itemName, direction);
        case 'supplierName':
          return compareTableValues(a.supplierName, b.supplierName, direction);
        case 'size':
          return compareTableValues(a.size, b.size, direction);
        case 'availableQuantity':
          return compareTableValues(a.availableQuantity, b.availableQuantity, direction);
        case 'updatedAt':
          return compareTableValues(a.updatedAt, b.updatedAt, direction);
        case 'clientName':
        default:
          return compareTableValues(a.clientName, b.clientName, direction);
      }
    });
  });

  readonly paginatedStocks = computed(() =>
    slicePageItems(this.filteredStocks(), this.currentPage(), this.pageSize())
  );

  readonly totalFilteredUnits = computed(() =>
    this.filteredStocks().reduce((sum, r) => sum + r.availableQuantity, 0)
  );

  constructor() {
    this.workflowStore.refreshGlobalStocks();
    this.workflowStore.refreshSuppliers();
    const initialClientId = this.route.snapshot.queryParamMap.get('clientId');
    if (initialClientId) {
      this.filterClientId.set(initialClientId);
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filterClientId() ||
      this.filterProductType() ||
      this.filterSupplier() ||
      this.filterSize().trim() ||
      this.searchQuery().trim()
    );
  }

  resetFilters(): void {
    this.filterClientId.set('');
    this.filterProductType.set('');
    this.filterSupplier.set('');
    this.filterSize.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  onFilterClientChange(value: string): void {
    this.filterClientId.set(value);
    this.currentPage.set(1);
  }

  onFilterProductTypeChange(value: string): void {
    this.filterProductType.set(value);
    this.currentPage.set(1);
  }

  onFilterSupplierChange(value: string): void {
    this.filterSupplier.set(value);
    this.currentPage.set(1);
  }

  onFilterSizeChange(value: string): void {
    this.filterSize.set(value);
    this.currentPage.set(1);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
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

  resolveProductTypeLabel(productType?: string | null): string {
    if (!productType) {
      return 'Polo';
    }
    const found = ALL_PRODUCT_TYPES.find((p) => p.code === productType.toUpperCase());
    return found ? found.label : productType;
  }

  getStockRowActions(row: GlobalStockItemResponse): readonly TableActionItem[] {
    return [
      {
        label: 'Ajuster la quantité en stock',
        icon: '✏️',
        variant: 'primary',
        onSelect: () => {
          this.editingStockRow.set(row);
          this.editedQuantity.set(row.availableQuantity);
        },
      },
    ];
  }

  saveAdjustedStock(): void {
    const target = this.editingStockRow();
    if (!target || this.editedQuantity() < 0) {
      return;
    }
    this.workflowStore.upsertGlobalStockItem(
      target.clientId,
      {
        catalogItemId: target.catalogItemId,
        gender: target.gender,
        size: target.size,
        availableQuantity: Math.max(0, Math.round(this.editedQuantity())),
      },
      () => {
        this.editingStockRow.set(null);
      }
    );
  }
}
