import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';

export type SortDirection = 'asc' | 'desc';

export interface TableSortOption {
  readonly value: string;
  readonly label: string;
}

export type DataTableSortOption = TableSortOption;

export function compareTableValues(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
  direction: 'asc' | 'desc'
): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (a === b) {
    return 0;
  }
  if (a === null || a === undefined) {
    return 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * factor;
  }
  return String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true }) * factor;
}

export function slicePageItems<T>(
  items: readonly T[],
  currentPage: number,
  pageSize: number
): readonly T[] {
  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

@Component({
  selector: 'app-data-table-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
      <!-- Barre de recherche pleine largeur sur mobile -->
      <div class="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
        <div class="relative w-full sm:max-w-md flex-1">
          <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
              <path
                fill-rule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          <input
            type="text"
            [placeholder]="searchPlaceholder()"
            [value]="searchQuery()"
            (input)="onSearchInput($any($event.target).value)"
            class="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-9 pr-8 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white"
          />
          @if (searchQuery()) {
            <button
              type="button"
              (click)="onSearchInput('')"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Effacer la recherche"
            >
              ✕
            </button>
          }
        </div>

        <!-- Filtres additionnels projetés -->
        <ng-content />
      </div>

      <!-- Tri & Compteur -->
      <div class="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        @if (sortOptions().length > 0) {
          <div class="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <span class="hidden sm:inline text-[11px] font-bold uppercase tracking-wider text-slate-400">Trier :</span>
            <select
              [value]="sortField()"
              (change)="sortField.set($any($event.target).value)"
              class="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              @for (opt of sortOptions(); track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
            <button
              type="button"
              (click)="toggleSortDirection()"
              class="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              [title]="sortDirection() === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'"
            >
              <span>{{ sortDirection() === 'asc' ? '↑ Croissant' : '↓ Décroissant' }}</span>
            </button>
          </div>
        }

        <span class="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {{ displayedCount() }} résultat(s)
        </span>
      </div>
    </div>
  `,
})
export class DataTableToolbarComponent {
  readonly searchQuery = model<string>('');
  readonly searchPlaceholder = input<string>('Rechercher...');
  readonly sortField = model<string>('');
  readonly sortDirection = model<SortDirection>('asc');
  readonly sortOptions = input<readonly TableSortOption[]>([]);
  readonly totalFilteredCount = input<number>(0);
  readonly filteredCount = input<number | null>(null);
  readonly totalCount = input<number | null>(null);

  readonly displayedCount = computed(() => this.filteredCount() ?? this.totalFilteredCount());

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }
}

@Component({
  selector: 'app-data-table-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
        <span>
          Affichage de
          <strong class="text-slate-900">{{ startIndex() }}</strong>
          à
          <strong class="text-slate-900">{{ endIndex() }}</strong>
          sur
          <strong class="text-slate-900">{{ totalItems() }}</strong>
        </span>

        <div class="flex items-center gap-1.5">
          <span class="text-slate-400">· Par page :</span>
          <select
            [value]="pageSize()"
            (change)="onPageSizeChange(+$any($event.target).value)"
            class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            @for (size of pageSizeOptions(); track size) {
              <option [value]="size">{{ size }}</option>
            }
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between gap-1.5 sm:justify-end">
        <button
          type="button"
          [disabled]="effectivePage() <= 1"
          (click)="goToPage(effectivePage() - 1)"
          class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          ← Préc.
        </button>

        <div class="flex items-center gap-1">
          @for (p of visiblePages(); track p) {
            <button
              type="button"
              (click)="goToPage(p)"
              class="h-8 min-w-[32px] rounded-xl border px-2.5 text-xs font-bold transition cursor-pointer"
              [class.border-indigo-600]="effectivePage() === p"
              [class.bg-indigo-600]="effectivePage() === p"
              [class.text-white]="effectivePage() === p"
              [class.shadow-xs]="effectivePage() === p"
              [class.border-slate-200]="effectivePage() !== p"
              [class.bg-white]="effectivePage() !== p"
              [class.text-slate-700]="effectivePage() !== p"
              [class.hover:bg-slate-50]="effectivePage() !== p"
            >
              {{ p }}
            </button>
          }
        </div>

        <button
          type="button"
          [disabled]="effectivePage() >= totalPages()"
          (click)="goToPage(effectivePage() + 1)"
          class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          Suiv. →
        </button>
      </div>
    </div>
  `,
})
export class DataTablePaginationComponent {
  readonly currentPage = model<number>(1);
  readonly pageSize = model<number>(10);
  readonly totalItems = input.required<number>();
  readonly pageSizeOptions = input<readonly number[]>([5, 10, 20, 50]);

  readonly totalPages = computed<number>(() => {
    const size = Math.max(1, this.pageSize());
    return Math.max(1, Math.ceil(this.totalItems() / size));
  });

  readonly effectivePage = computed<number>(() =>
    Math.min(Math.max(1, this.currentPage()), this.totalPages())
  );

  readonly startIndex = computed<number>(() => {
    if (this.totalItems() === 0) {
      return 0;
    }
    return (this.effectivePage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed<number>(() => {
    if (this.totalItems() === 0) {
      return 0;
    }
    return Math.min(this.totalItems(), this.effectivePage() * this.pageSize());
  });

  readonly visiblePages = computed<readonly number[]>(() => {
    const total = this.totalPages();
    const current = this.effectivePage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = Math.max(1, end - 4); i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  goToPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.totalPages());
    this.currentPage.set(clamped);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize || 10);
    this.currentPage.set(1);
  }
}
