import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import {
  B2bPurchaseOrderLineResponse,
  B2bPurchaseOrderResponse,
} from '../../core/models/uniform.models';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';
import { isImageUrl } from '../../core/utils/image-upload.util';
import {
  TableActionItem,
  TableActionMenuComponent,
} from '../../shared/components/table-action-menu.component';

@Component({
  selector: 'tr[app-b2b-po-line-row]',
  standalone: true,
  imports: [TranslatePipe, TableActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'border-b border-slate-200 hover:bg-slate-50',
  },
  template: `
    <td class="px-4 py-3 text-sm">
      <div class="font-bold text-slate-900">{{ line().itemNameSnapshot || line().garmentStyleSnapshot }}</div>
      <div class="text-xs text-slate-500">
        {{ line().garmentStyleSnapshot }} · Coloris : {{ line().colorReferenceSnapshot }}
      </div>
    </td>
    <td class="px-4 py-3 text-sm font-bold text-[#163672]">
      {{ ('size.' + line().size) | t }}
      <span class="block text-xs font-normal text-slate-500">{{ ('gender.' + line().gender) | t }}</span>
    </td>
    <td class="px-4 py-3 text-xs text-slate-600">
      <div class="flex items-center gap-2">
        @if (isImageUrl(line().frontVisualStorageSnapshot)) {
          <img
            [src]="line().frontVisualStorageSnapshot"
            alt="Visuel Face"
            class="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
          />
        } @else if (line().frontVisualStorageSnapshot) {
          <span class="font-mono text-[11px]">{{ line().frontVisualStorageSnapshot }}</span>
        } @else {
          <span class="text-slate-400">Standard</span>
        }
        @if (isImageUrl(line().backVisualStorageSnapshot)) {
          <img
            [src]="line().backVisualStorageSnapshot"
            alt="Visuel Dos"
            class="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain p-0.5"
          />
        }
      </div>
    </td>
    <td class="px-4 py-3 text-sm font-semibold text-slate-700">
      {{ line().b2cDemandedQuantity }} u.
    </td>
    <td class="px-4 py-3">
      @if (isDraft()) {
        <input
          type="number"
          min="0"
          class="w-20 rounded-lg border border-slate-300 px-2.5 py-1 text-sm font-bold text-slate-900"
          [value]="editableFinalQuantity()"
          (input)="onFinalQuantityInput(+$any($event.target).value)"
          (change)="finalQuantitySaved.emit(editableFinalQuantity())"
        />
      } @else {
        <span class="text-sm font-extrabold text-slate-900">{{ line().finalQuantity }} u.</span>
      }
    </td>
    <td class="px-4 py-3 text-right">
      <app-table-action-menu
        [menuTitle]="(line().itemNameSnapshot || line().garmentStyleSnapshot) + ' · ' + line().size"
        [actions]="lineActions()"
      />
    </td>
  `,
})
export class B2bPoLineRowComponent {
  readonly line = input.required<B2bPurchaseOrderLineResponse>();
  readonly isDraft = input<boolean>(false);
  readonly currentDraftQuantity = model<number>(0);
  readonly finalQuantitySaved = output<number>();
  readonly poPdfRequested = output<void>();
  readonly isImageUrl = isImageUrl;

  readonly editableFinalQuantity = linkedSignal<B2bPurchaseOrderLineResponse, number>({
    source: this.line,
    computation: (l) => l.finalQuantity,
  });

  readonly lineActions = computed<readonly TableActionItem[]>(() => {
    const items: TableActionItem[] = [];
    if (this.isDraft()) {
      items.push(
        {
          label: 'Valider la quantité saisie (' + this.editableFinalQuantity() + ' u.)',
          icon: '✓',
          variant: 'primary',
          onSelect: () => this.finalQuantitySaved.emit(this.editableFinalQuantity()),
        },
        {
          label: 'Ajouter +5 unités de marge stock',
          icon: '➕',
          variant: 'success',
          onSelect: () => {
            const next = this.editableFinalQuantity() + 5;
            this.onFinalQuantityInput(next);
            this.finalQuantitySaved.emit(next);
          },
        },
        {
          label: 'Aligner sur le besoin client (' + this.line().b2cDemandedQuantity + ' u.)',
          icon: '↺',
          onSelect: () => {
            const demanded = this.line().b2cDemandedQuantity;
            this.onFinalQuantityInput(demanded);
            this.finalQuantitySaved.emit(demanded);
          },
        }
      );
    }
    items.push({
      label: 'Télécharger le Bon de Commande PDF',
      icon: '📄',
      dividerBefore: items.length > 0,
      onSelect: () => this.poPdfRequested.emit(),
    });
    return items;
  });

  onFinalQuantityInput(value: number): void {
    const normalized = Math.max(0, value || 0);
    this.editableFinalQuantity.set(normalized);
    this.currentDraftQuantity.set(normalized);
  }
}

@Component({
  selector: 'app-b2b-purchase-order-editor',
  standalone: true,
  imports: [B2bPoLineRowComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (workflowStore.selectedClient()) {
      <!-- BANNIÈRE PRÉPARATION DE LA COMMANDE & ARRIVAGES FOURNISSEURS -->
      <div class="ui-banner">
        <div>
          <h2 class="text-lg font-bold text-white">
            Préparation de la Commande & Bons de Commande par Fournisseur
          </h2>
          <p class="mt-1 text-sm text-blue-100/90">
            Téléchargez le Bon de Commande PDF de chaque fournisseur, gérez les arrivages au fur et à mesure pour alimenter le stock, puis imprimez le PDF de reconstitution par client final.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          @if (workflowStore.activeB2cOrder(); as activeOrder) {
            @if (activeOrder.status === 'IN_PROGRESS' && activeOrder.moqReached) {
              <button
                type="button"
                class="rounded-xl bg-[#16803c] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#146c32] cursor-pointer"
                (click)="workflowStore.moveActiveB2cOrderToProduction()"
              >
                🚀 Lancer la commande en fabrication
              </button>
            }

            @if (activeOrder.lines.length > 0) {
              <button
                type="button"
                class="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                (click)="workflowStore.downloadPackingListPdf(activeOrder.id)"
              >
                📋 Imprimer PDF Reconstitution par Client Final
              </button>
            }

            @if (activeOrder.status === 'IN_PRODUCTION' && allPosReceived()) {
              <button
                type="button"
                class="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 cursor-pointer"
                (click)="workflowStore.moveActiveB2cOrderToDelivery()"
              >
                🚚 Passer en Mode Distribution aux Clients
              </button>
            }
          }
        </div>
      </div>

      <!-- BARRE D'AVANCEMENT DES ARRIVAGES FOURNISSEURS -->
      @if (workflowStore.b2bPurchaseOrders().length > 0) {
        <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-sm font-bold text-slate-900">
                Suivi de complétion des arrivages fournisseurs
              </div>
              <p class="text-xs text-slate-500">
                La commande globale se complète au fur et à mesure que chaque fournisseur livre ses produits.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="rounded-full px-3.5 py-1 text-xs font-extrabold"
                [class.bg-[#dcfce7]]="allPosReceived()"
                [class.text-[#15803d]]="allPosReceived()"
                [class.bg-amber-100]="!allPosReceived()"
                [class.text-amber-800]="!allPosReceived()"
              >
                {{ receivedPosCount() }} / {{ workflowStore.b2bPurchaseOrders().length }} fournisseur(s) livré(s) ({{ completionPercentage() }}%)
              </span>
            </div>
          </div>

          <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full transition-all duration-300"
              [class.bg-[#16803c]]="allPosReceived()"
              [class.bg-[#163672]]="!allPosReceived()"
              [style.width.%]="completionPercentage()"
            ></div>
          </div>

          @if (allPosReceived()) {
            <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-[#dcfce7]/50 px-4 py-3">
              <span class="text-xs font-bold text-[#15803d]">
                ✓ Tous les fournisseurs ont livré ! Le stock est alimenté et la commande est 100% complète. Imprimez le PDF de reconstitution pour préparer les colis par client final.
              </span>
              @if (workflowStore.activeB2cOrder(); as activeOrder) {
                <button
                  type="button"
                  class="rounded-xl bg-[#16803c] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#146c32] cursor-pointer"
                  (click)="workflowStore.downloadPackingListPdf(activeOrder.id)"
                >
                  📋 Imprimer PDF Reconstitution par Client
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- LISTE DES BONS DE COMMANDE PAR FOURNISSEUR -->
      @for (po of workflowStore.b2bPurchaseOrders(); track po.id) {
        <div class="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-extrabold text-amber-900">
                  🏭 Fournisseur : {{ po.supplierName || 'Atelier Textile Atlas — Casablanca' }}
                </span>
                <h3 class="text-base font-bold text-slate-900">
                  Bon de Commande {{ po.poNumber }}
                </h3>
                <span
                  class="rounded-full px-3 py-0.5 text-xs font-bold"
                  [class.bg-[#fef3c7]]="po.status === 'DRAFT'"
                  [class.text-[#92400e]]="po.status === 'DRAFT'"
                  [class.bg-blue-100]="po.status === 'ORDERED'"
                  [class.text-blue-800]="po.status === 'ORDERED'"
                  [class.bg-[#dcfce7]]="po.status === 'RECEIVED'"
                  [class.text-[#15803d]]="po.status === 'RECEIVED'"
                >
                  {{ ('b2bOrderStatus.' + po.status) | t }}
                </span>
              </div>
              <p class="mt-1.5 text-xs text-slate-500">
                Total à fabriquer :
                <strong class="text-sm text-[#163672]">{{ getTotalPoUnits(po) }} unité(s)</strong>
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <!-- Le Bon de Commande PDF est TOUJOURS disponible sur une commande en fabrication -->
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                (click)="workflowStore.downloadB2bPurchaseOrderPdf(po.id)"
              >
                📄 Bon de Commande Fournisseur (PDF)
              </button>

              @if (po.status === 'DRAFT') {
                <button
                  type="button"
                  class="rounded-xl border border-[#163672] bg-blue-50/60 px-3.5 py-2 text-xs font-bold text-[#163672] hover:bg-blue-100 cursor-pointer"
                  (click)="workflowStore.confirmB2bOrder(po.id)"
                >
                  Figer quantités (Commandé)
                </button>
              }

              @if (po.status !== 'RECEIVED') {
                <button
                  type="button"
                  class="rounded-xl bg-[#16803c] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#146c32] cursor-pointer"
                  (click)="workflowStore.receiveB2bStock(po.id)"
                >
                  📦 Réceptionner l'arrivage fournisseur (+Stock)
                </button>
              } @else {
                <span class="rounded-xl bg-[#dcfce7] px-3.5 py-2 text-xs font-extrabold text-[#15803d]">
                  ✓ Arrivage reçu & Stock crédité
                </span>
              }
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200/80 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th class="px-4 py-2.5">Intitulé du Produit & Coloris</th>
                  <th class="px-4 py-2.5">Taille</th>
                  <th class="px-4 py-2.5">Photo / Visuel</th>
                  <th class="px-4 py-2.5">Besoin Client</th>
                  <th class="px-4 py-2.5">Qté à Fabriquer</th>
                  <th class="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (line of po.lines; track line.id) {
                  <tr
                    app-b2b-po-line-row
                    [line]="line"
                    [isDraft]="po.status === 'DRAFT'"
                    (finalQuantitySaved)="onSaveFinalQuantity(po, line.id, $event)"
                    (poPdfRequested)="workflowStore.downloadB2bPurchaseOrderPdf(po.id)"
                  ></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @empty {
        <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {{ 'b2b.emptyPos' | t }}
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
              Créez votre premier établissement scolaire pour accéder aux bons de commande fournisseurs.
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
export class B2bPurchaseOrderEditorComponent {
  readonly workflowStore = inject(UniformWorkflowStore);

  readonly receivedPosCount = computed<number>(
    () => this.workflowStore.b2bPurchaseOrders().filter((p) => p.status === 'RECEIVED').length
  );

  readonly allPosReceived = computed<boolean>(() => {
    const pos = this.workflowStore.b2bPurchaseOrders();
    return pos.length > 0 && pos.every((p) => p.status === 'RECEIVED');
  });

  readonly completionPercentage = computed<number>(() => {
    const pos = this.workflowStore.b2bPurchaseOrders();
    if (pos.length === 0) {
      return 0;
    }
    return Math.round((this.receivedPosCount() / pos.length) * 100);
  });

  onSaveFinalQuantity(po: B2bPurchaseOrderResponse, lineId: string, finalQuantity: number): void {
    this.workflowStore.updateB2bLineFinalQuantity(po.id, lineId, finalQuantity);
  }

  getTotalPoUnits(po: B2bPurchaseOrderResponse): number {
    return po.lines.reduce((acc, l) => acc + l.finalQuantity, 0);
  }
}
