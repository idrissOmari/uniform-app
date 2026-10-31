import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

export type TableActionVariant = 'default' | 'primary' | 'success' | 'danger';

export interface TableActionItem {
  readonly id?: string;
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly variant?: TableActionVariant;
  readonly disabled?: boolean;
  readonly dividerBefore?: boolean;
  readonly onSelect: () => void;
}

@Component({
  selector: 'app-table-action-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-block text-left',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
    '(window:scroll)': 'closeMenu()',
    '(window:resize)': 'closeMenu()',
  },
  template: `
    <button
      #triggerBtn
      type="button"
      (click)="toggleMenu($event)"
      [attr.aria-expanded]="isOpen()"
      [title]="ariaLabel()"
      class="inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      [class.border-indigo-600]="isOpen()"
      [class.bg-indigo-600]="isOpen()"
      [class.text-white]="isOpen()"
      [class.shadow-sm]="isOpen()"
      [class.border-slate-200]="!isOpen()"
      [class.bg-white]="!isOpen()"
      [class.text-slate-600]="!isOpen()"
      [class.hover:border-indigo-300]="!isOpen()"
      [class.hover:bg-indigo-50/60]="!isOpen()"
      [class.hover:text-indigo-700]="!isOpen()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        class="h-4 w-4"
        aria-hidden="true"
      >
        <path
          d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z"
        />
      </svg>
    </button>

    @if (isOpen()) {
      <div
        #menuPanel
        class="fixed z-[9999] w-60 origin-top-right animate-dropdown-in rounded-2xl border border-slate-200/95 bg-white p-1.5 shadow-[0_16px_40px_-6px_rgba(15,23,42,0.18),0_4px_14px_-2px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5"
        [style.top.px]="menuTop()"
        [style.left.px]="menuLeft()"
        role="menu"
        (click)="$event.stopPropagation()"
      >
        @if (menuTitle()) {
          <div class="border-b border-slate-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
            {{ menuTitle() }}
          </div>
        }

        <div class="py-0.5">
          @for (item of actions(); track item.label) {
            @if (item.dividerBefore) {
              <div class="my-1 border-t border-slate-100"></div>
            }
            <button
              type="button"
              role="menuitem"
              [disabled]="item.disabled"
              (click)="selectItem(item, $event)"
              class="group flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors duration-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              [class.text-slate-700]="!item.variant || item.variant === 'default'"
              [class.hover:bg-slate-100/90]="!item.variant || item.variant === 'default'"
              [class.hover:text-slate-950]="!item.variant || item.variant === 'default'"
              [class.text-indigo-600]="item.variant === 'primary'"
              [class.hover:bg-indigo-50/90]="item.variant === 'primary'"
              [class.text-emerald-700]="item.variant === 'success'"
              [class.hover:bg-emerald-50/90]="item.variant === 'success'"
              [class.text-rose-600]="item.variant === 'danger'"
              [class.hover:bg-rose-50/90]="item.variant === 'danger'"
            >
              <span class="flex items-center gap-2.5 truncate">
                @if (item.icon) {
                  <span class="w-4 shrink-0 text-center text-sm leading-none">{{ item.icon }}</span>
                }
                <span class="truncate">{{ item.label }}</span>
              </span>

              @if (item.badge !== undefined && item.badge !== null) {
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                  [class.bg-slate-100]="!item.variant || item.variant === 'default'"
                  [class.text-slate-700]="!item.variant || item.variant === 'default'"
                  [class.bg-indigo-100]="item.variant === 'primary'"
                  [class.text-indigo-700]="item.variant === 'primary'"
                  [class.bg-emerald-100]="item.variant === 'success'"
                  [class.text-emerald-700]="item.variant === 'success'"
                  [class.bg-rose-100]="item.variant === 'danger'"
                  [class.text-rose-700]="item.variant === 'danger'"
                >
                  {{ item.badge }}
                </span>
              }
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class TableActionMenuComponent {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly triggerBtn = viewChild<ElementRef<HTMLButtonElement>>('triggerBtn');
  private readonly menuPanel = viewChild<ElementRef<HTMLElement>>('menuPanel');

  readonly actions = input.required<readonly TableActionItem[]>();
  readonly menuTitle = input<string>('');
  readonly ariaLabel = input<string>('Actions de la ligne');

  readonly isOpen = signal<boolean>(false);
  readonly menuTop = signal<number>(0);
  readonly menuLeft = signal<number>(0);

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isOpen()) {
      this.closeMenu();
      return;
    }

    const btnEl = this.triggerBtn()?.nativeElement;
    if (btnEl) {
      const rect = btnEl.getBoundingClientRect();
      const menuWidth = 240; // w-60 = 15rem = 240px
      const estimatedHeight = Math.max(120, this.actions().length * 38 + 36);
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let targetLeft = rect.right - menuWidth;
      if (targetLeft < 12) {
        targetLeft = 12;
      } else if (targetLeft + menuWidth > viewportWidth - 12) {
        targetLeft = viewportWidth - menuWidth - 12;
      }

      let targetTop = rect.bottom + 6;
      if (targetTop + estimatedHeight > viewportHeight - 16 && rect.top > estimatedHeight + 16) {
        targetTop = rect.top - estimatedHeight - 6;
      }

      this.menuLeft.set(targetLeft);
      this.menuTop.set(targetTop);

      this.isOpen.set(true);

      // Ajustement précis après rendu (compense tout éventuel conteneur parent transform/filter et utilise la hauteur réelle)
      requestAnimationFrame(() => {
        const panelEl = this.menuPanel()?.nativeElement;
        if (!panelEl || !this.isOpen()) {
          return;
        }
        const panelRect = panelEl.getBoundingClientRect();
        const actualHeight = panelRect.height || estimatedHeight;

        let finalTop = rect.bottom + 6;
        if (finalTop + actualHeight > viewportHeight - 16 && rect.top > actualHeight + 16) {
          finalTop = rect.top - actualHeight - 6;
        }

        const offsetDeltaX = panelRect.left - this.menuLeft();
        const offsetDeltaY = panelRect.top - this.menuTop();

        this.menuLeft.set(targetLeft - offsetDeltaX);
        this.menuTop.set(finalTop - offsetDeltaY);
      });
    } else {
      this.isOpen.set(true);
    }
  }

  closeMenu(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  selectItem(item: TableActionItem, event: MouseEvent): void {
    event.stopPropagation();
    if (item.disabled) {
      return;
    }
    this.closeMenu();
    item.onSelect();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }
}
