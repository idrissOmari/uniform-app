import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStore } from '../../core/auth/auth.store';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import {
  ALL_GENDERS,
  ALL_PRODUCT_TYPES,
  AddB2cOrderLineRequest,
  B2cOrderLineResponse,
  B2cOrderSummaryResponse,
  ClientSectionResponse,
  Gender,
  Size,
  getAllowedGendersForClientType,
  getAllowedSizesForCatalogItem,
  getAllowedSizesForGender,
} from '../../core/models/uniform.models';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';
import {
  TableActionItem,
  TableActionMenuComponent,
} from '../../shared/components/table-action-menu.component';

const MOROCCO_PHONE_PATTERN = /^(?:\+212|0)[\s.-]*[5-7](?:[\s.-]*\d){8}$/;

export interface ProductOrderSelection {
  readonly checked: boolean;
  readonly gender: Gender;
  readonly size: Size;
  readonly quantity: number;
}

export interface StockVariantSummaryRow {
  readonly catalogItemId: string;
  readonly itemName: string;
  readonly itemReference: string;
  readonly garmentStyle: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly availableQuantity: number;
  readonly pendingPickupQuantity: number;
  readonly deliveredQuantity: number;
  readonly netAfterPending: number;
  readonly updatedAt?: string;
}

@Component({
  selector: 'tr[app-b2c-line-pickup-row]',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, TableActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'border-b border-slate-100 transition hover:bg-slate-50/70',
  },
  template: `
    <td class="px-4 py-4 font-mono text-xs font-semibold text-slate-900">
      {{ line().receiptNumber }}
    </td>
    <td class="px-4 py-4 text-sm">
      <div class="font-bold text-slate-900">{{ line().buyerFullName }}</div>
      <div class="text-xs text-slate-400">{{ line().buyerPhone }}</div>
      @if (line().sectionName) {
        <div class="mt-1">
          <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#163672]">
            Section : {{ line().sectionName }}
          </span>
        </div>
      }
    </td>
    <td class="px-4 py-3.5 text-sm text-slate-800">
      <div class="font-semibold text-slate-900">{{ itemName() }}</div>
      <div class="mt-0.5 text-xs text-slate-500">
        {{ ('gender.' + line().gender) | t }} · Taille {{ ('size.' + line().size) | t }} · Qté : <strong>{{ line().quantity }}</strong>
      </div>
    </td>
    <td class="px-4 py-3.5 text-sm font-extrabold text-slate-900">
      {{ line().lineCashAmount | number: '1.0-2' }} DH
    </td>
    <td class="px-4 py-3.5">
      <span
        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
        [class.bg-[#fef3c7]]="line().lineStatus === 'PENDING_PICKUP'"
        [class.text-[#92400e]]="line().lineStatus === 'PENDING_PICKUP'"
        [class.bg-[#dcfce7]]="line().lineStatus === 'DELIVERED'"
        [class.text-[#15803d]]="line().lineStatus === 'DELIVERED'"
      >
        {{ line().lineStatus === 'DELIVERED' ? 'Distribuée' : 'En attente' }}
      </span>
    </td>
    <td class="px-4 py-3.5 text-right">
      <div class="inline-flex items-center justify-end gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-[#163672] shadow-2xs transition hover:bg-indigo-100 cursor-pointer"
          title="Imprimer le justificatif d'achat complet de ce client (PDF)"
          (click)="buyerReceiptDownloadRequested.emit(line().id)"
        >
          <span>🖨️</span>
          <span>Justificatif PDF</span>
        </button>
        <app-table-action-menu
          [menuTitle]="line().buyerFullName + ' · ' + line().receiptNumber"
          [actions]="rowActions()"
        />
      </div>
    </td>
  `,
})
export class B2cLinePickupRowComponent {
  readonly line = input.required<B2cOrderLineResponse>();
  readonly itemName = input<string>('Uniforme scolaire');
  readonly parentOrderInDelivery = input<boolean>(false);
  readonly detailRequested = output<B2cOrderLineResponse>();
  readonly receiptDownloadRequested = output<string>();
  readonly buyerReceiptDownloadRequested = output<string>();
  readonly deliveryConfirmed = output<string>();

  readonly rowActions = computed<readonly TableActionItem[]>(() => {
    const l = this.line();
    const items: TableActionItem[] = [
      {
        label: "Imprimer le Justificatif d'achat du client (PDF)",
        icon: '🖨️',
        variant: 'primary',
        onSelect: () => this.buyerReceiptDownloadRequested.emit(l.id),
      },
      {
        label: 'Imprimer le reçu de cette ligne uniquement (PDF)',
        icon: '📄',
        onSelect: () => this.receiptDownloadRequested.emit(l.id),
      },
      {
        label: 'Afficher le détail de la commande',
        icon: '🔍',
        onSelect: () => this.detailRequested.emit(l),
      },
    ];

    if (this.parentOrderInDelivery() && l.lineStatus === 'PENDING_PICKUP') {
      items.push({
        label: 'Remettre la commande au client',
        icon: '✅',
        variant: 'success',
        dividerBefore: true,
        onSelect: () => this.deliveryConfirmed.emit(l.id),
      });
    }

    return items;
  });
}

@Component({
  selector: 'app-b2c-order-counter',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    DatePipe,
    TranslatePipe,
    TableActionMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (workflowStore.selectedClient()) {
      <!-- =================================================================== -->
      <!-- VUE DÉDIÉE : GESTION DU STOCK PAR CLIENT (ADMIN UNIQUEMENT)         -->
      <!-- =================================================================== -->
      @if (workflowStore.activeB2cSubView() === 'STOCK' && authStore.isAdmin()) {
        <div class="ui-banner">
          <div>
            <h2 class="text-lg font-bold text-white">
              Stock disponible — {{ workflowStore.selectedClient()?.name }}
            </h2>
            <p class="mt-1 text-sm text-blue-100/90">
              Suivi en temps réel par article et par taille. Chaque remise aux parents déduit automatiquement le stock disponible.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
              (click)="workflowStore.refreshClientStocks()"
            >
              Actualiser le stock
            </button>

            @if (authStore.isAdmin()) {
              <button
                type="button"
                class="rounded-xl bg-[#16803c] px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#146c32] cursor-pointer"
                (click)="openStockAdjustModal()"
              >
                + Ajuster / Réceptionner du stock
              </button>
            }
          </div>
        </div>

        <!-- 4 KPIs de Stock du Client -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="text-xs font-medium text-slate-400">Stock physique disponible</div>
            <div class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {{ workflowStore.totalAvailableStock() }}
            </div>
            <div class="mt-2 text-xs font-semibold text-[#16803c]">
              Unités en stock ({{ workflowStore.selectedClient()?.name }})
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="text-xs font-medium text-slate-400">À remettre aux parents</div>
            <div class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {{ totalPendingPickupUnits() }}
            </div>
            <div class="mt-2 text-xs font-medium text-amber-700">
              Unités réservées non encore livrées
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="text-xs font-medium text-slate-400">Déjà livrées aux parents</div>
            <div class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {{ totalDeliveredUnits() }}
            </div>
            <div class="mt-2 text-xs font-medium text-slate-400">
              Unités sorties du stock après livraison
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="text-xs font-medium text-slate-400">Tailles en stock faible (≤ 5)</div>
            <div class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {{ lowStockVariantsCount() }}
            </div>
            <div class="mt-2 text-xs font-medium text-rose-600">
              Variantes à surveiller ou réapprovisionner
            </div>
          </div>
        </div>

        <!-- Tableau du Stock disponible ventilé par Article, Genre et Taille (Filtres sur les en-têtes) -->
        <div class="ui-card p-4 sm:p-6">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200/80 bg-slate-50/95 align-top text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th class="px-4 py-3 min-w-[200px]">
                    <div>Article &amp; Référence</div>
                    <select
                      class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold normal-case text-slate-700 focus:border-indigo-500"
                      [value]="stockFilterItemId()"
                      (change)="stockFilterItemId.set($any($event.target).value)"
                    >
                      <option value="ALL">Tous ({{ workflowStore.catalogItems().length }})</option>
                      @for (item of workflowStore.catalogItems(); track item.id) {
                        <option [value]="item.id">{{ item.name }} ({{ item.referenceCode }})</option>
                      }
                    </select>
                  </th>
                  <th class="px-4 py-3 min-w-[140px]">
                    <div>Genre / Coupe</div>
                    <select
                      class="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold normal-case text-slate-700 focus:border-indigo-500"
                      [value]="stockFilterGender()"
                      (change)="stockFilterGender.set($any($event.target).value)"
                    >
                      <option value="ALL">Tous</option>
                      @for (g of allowedGenders(); track g) {
                        <option [value]="g">{{ ('gender.' + g) | t }}</option>
                      }
                    </select>
                  </th>
                  <th class="px-4 py-3 align-middle">Taille</th>
                  <th class="px-4 py-3 align-middle">Stock Disponible</th>
                  <th class="px-4 py-3 align-middle">À livrer aux parents</th>
                  <th class="px-4 py-3 align-middle">Déjà livré</th>
                  <th class="px-4 py-3 align-middle">Stock Net prévisionnel</th>
                  <th class="px-4 py-3 align-middle">Dernière actualisation</th>
                  @if (authStore.isAdmin()) {
                    <th class="px-4 py-3 text-right align-middle">Action</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of filteredStockRows(); track row.catalogItemId + '-' + row.gender + '-' + row.size) {
                  <tr class="border-b border-slate-100 transition hover:bg-slate-50/70">
                    <td class="px-4 py-3.5">
                      <div class="text-sm font-bold text-slate-900">{{ row.itemName }}</div>
                      <div class="font-mono text-xs text-slate-400">{{ row.itemReference }} · {{ row.garmentStyle }}</div>
                    </td>
                    <td class="px-4 py-3.5 text-sm font-medium text-slate-700">
                      {{ ('gender.' + row.gender) | t }}
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                        {{ ('size.' + row.size) | t }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5">
                      <span
                        class="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                        [class.bg-[#dcfce7]]="row.availableQuantity > 5"
                        [class.text-[#15803d]]="row.availableQuantity > 5"
                        [class.bg-[#fef3c7]]="row.availableQuantity > 0 && row.availableQuantity <= 5"
                        [class.text-[#92400e]]="row.availableQuantity > 0 && row.availableQuantity <= 5"
                        [class.bg-rose-100]="row.availableQuantity === 0"
                        [class.text-rose-700]="row.availableQuantity === 0"
                      >
                        {{ row.availableQuantity }} unité(s)
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-sm font-semibold text-amber-700">
                      {{ row.pendingPickupQuantity }}
                    </td>
                    <td class="px-4 py-3.5 text-sm font-semibold text-[#15803d]">
                      {{ row.deliveredQuantity }}
                    </td>
                    <td class="px-4 py-3.5">
                      <span
                        class="text-sm font-bold"
                        [class.text-slate-900]="row.netAfterPending >= 0"
                        [class.text-rose-600]="row.netAfterPending < 0"
                      >
                        {{ row.netAfterPending }} unité(s)
                      </span>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-400">
                      {{ row.updatedAt ? (row.updatedAt | date: 'dd/MM/yyyy HH:mm') : '—' }}
                    </td>
                    @if (authStore.isAdmin()) {
                      <td class="px-4 py-3.5 text-right">
                        <app-table-action-menu
                          [menuTitle]="row.itemName + ' · ' + row.size"
                          [actions]="getStockRowActions(row)"
                        />
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="px-4 py-10 text-center text-sm text-slate-400">
                      Aucune variante de stock enregistrée pour ce filtre.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <!-- =================================================================== -->
        <!-- EN-TÊTE INFORMATIONS DE L'ÉTABLISSEMENT + COMPTEUR DE CAISSE         -->
        <!-- (Pour l'Opérateur Comptoir ; l'Admin dispose de la barre d'établissement globale) -->
        <!-- =================================================================== -->
        @if (!authStore.isAdmin() && workflowStore.selectedClient(); as activeEstablishment) {
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 sm:px-6 sm:py-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="space-y-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Établissement :
                </span>
                @if (workflowStore.clients().length > 1) {
                  <select
                    class="rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-1.5 text-sm font-extrabold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                    [value]="activeEstablishment.id"
                    (change)="workflowStore.selectClient($any($event.target).value)"
                  >
                    @for (c of workflowStore.clients(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                } @else {
                  <h2 class="text-base font-extrabold text-slate-900">
                    {{ activeEstablishment.name }}
                  </h2>
                }
                <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#163672]">
                  {{ ('clientType.short.' + (activeEstablishment.clientType || 'SECONDARY_SCHOOL')) | t }}
                </span>
              </div>
              <p class="text-xs text-slate-500">
                📍 {{ activeEstablishment.address }} ·
                <span class="font-semibold text-slate-700">
                  {{ activeEstablishment.sections?.length || 0 }} section(s)
                </span>
                ·
                <span class="font-semibold text-slate-700">
                  {{ workflowStore.catalogItems().length }} produit(s) au catalogue
                </span>
              </p>
            </div>

            <button
              type="button"
              class="ui-btn-primary w-full sm:w-auto !text-xs"
              (click)="workflowStore.downloadCatalogFlyerPdf()"
            >
              🖨️ Imprimer Flyer Catalogue (PDF)
            </button>
          </div>

          <!-- =============================================================== -->
          <!-- COMPTEUR DE CAISSE OPÉRATEUR (LIÉ À CHAQUE ÉTABLISSEMENT)       -->
          <!-- =============================================================== -->
          @let counterState = workflowStore.activeClientCashCounter();
          @let caisse = cashCounterMetrics();
          <div class="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 via-white to-indigo-50/40 p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.12)]">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div class="flex items-start gap-3.5">
                <div class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#16803c] text-xl text-white shadow-sm">
                  💰
                </div>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="text-base font-extrabold text-slate-900">
                      Compteur de Caisse — {{ activeEstablishment.name }}
                    </h3>
                    <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-[#15803d]">
                      Suivi caisse établissement
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-600">
                    @if (counterState?.resetAt) {
                      Compteur actif depuis la dernière remise à zéro du
                      <span class="font-bold text-slate-900">{{ counterState?.resetAt | date: 'dd/MM/yyyy à HH:mm' }}</span>
                      @if (counterState?.resetByFullName) {
                        <span>(par {{ counterState?.resetByFullName }})</span>
                      }
                    } @else {
                      Cumul des encaissements espèces depuis l'ouverture de la caisse pour cet établissement.
                    }
                  </p>
                  @if ((counterState?.resetCount ?? 0) > 0) {
                    <div class="mt-1.5 inline-flex flex-wrap items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      <span>📌 Dernier arrêté de caisse :</span>
                      <span class="font-extrabold text-slate-900">{{ counterState?.lastResetAmount | number: '1.2-2' }} DH</span>
                      <span>({{ counterState?.lastResetOrdersCount }} commande(s) · {{ counterState?.lastResetUnitsCount }} art.)</span>
                    </div>
                  }
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t border-emerald-200/60 pt-3.5 lg:border-t-0 lg:pt-0">
                <div class="flex items-center gap-4 sm:gap-6">
                  <div>
                    <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Commandes en caisse
                    </div>
                    <div class="mt-0.5 text-lg font-extrabold text-slate-900">
                      {{ caisse.clientsCount }} commande(s)
                    </div>
                    <div class="text-[11px] font-semibold text-slate-500">
                      {{ caisse.unitsCount }} article(s) encaissé(s)
                    </div>
                  </div>

                  <div class="h-10 w-px bg-slate-200"></div>

                  <div>
                    <div class="text-[11px] font-bold uppercase tracking-wider text-[#15803d]">
                      Total Caisse Actuel
                    </div>
                    <div class="mt-0.5 text-2xl font-extrabold tracking-tight text-[#15803d]">
                      {{ caisse.cashAmount | number: '1.2-2' }} DH
                    </div>
                    <div class="text-[11px] font-semibold text-emerald-700">
                      Espèces en caisse
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-rose-700 shadow-2xs transition hover:bg-rose-50 cursor-pointer"
                  (click)="showResetCashCounterModal.set(true)"
                >
                  <span>🔄</span>
                  <span>Remettre à zéro le compteur</span>
                </button>
              </div>
            </div>
          </div>
        }

        @if (workflowStore.lastStockNotice(); as notice) {
          <div class="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-xs font-bold text-[#163672] shadow-2xs">
            <div class="flex items-center gap-2">
              <span>ℹ️</span>
              <span>{{ notice }}</span>
            </div>
            <button
              type="button"
              class="rounded-lg p-1 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              (click)="workflowStore.clearStockNotice()"
            >
              ✕
            </button>
          </div>
        }

        <!-- =================================================================== -->
        <!-- VUE COMMANDE GLOBALE & DISTRIBUTION (OPÉRATEUR & ADMIN)             -->
        <!-- =================================================================== -->
        @if (workflowStore.lastCreatedReceiptLines().length > 0) {
          @let recentLines = workflowStore.lastCreatedReceiptLines();
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 px-5 py-4 shadow-xs">
            <div class="flex items-start sm:items-center gap-3">
              <span class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white">
                ✓
              </span>
              <div>
                <div class="text-sm font-extrabold text-emerald-950">
                  Commande enregistrée avec succès pour {{ recentLines[0].buyerFullName }}
                </div>
                <div class="text-xs font-medium text-emerald-800">
                  {{ recentLines.length }} article(s) enregistré(s) · N° {{ recentLines[0].receiptNumber }} · Le justificatif d'achat officiel est prêt à être imprimé.
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-xl bg-[#16803c] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#146c32] cursor-pointer"
                (click)="workflowStore.downloadBuyerPackageReceiptPdf(recentLines)"
              >
                🖨️ Imprimer le Justificatif d'achat (PDF)
              </button>
              <button
                type="button"
                class="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                title="Fermer"
                (click)="workflowStore.clearLastCreatedReceipt()"
              >
                ✕
              </button>
            </div>
          </div>
        }

        @if (workflowStore.activeB2cOrder(); as order) {
          <!-- BANNIÈRE PRINCIPALE -->
          <div class="ui-banner">
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <h2 class="text-lg font-bold text-white">
                  Commande Globale {{ order.orderNumber }}
                </h2>
                <span
                  class="rounded-full px-3 py-0.5 text-xs font-extrabold"
                  [class.bg-blue-400/25]="order.status === 'IN_PROGRESS'"
                  [class.text-blue-100]="order.status === 'IN_PROGRESS'"
                  [class.bg-purple-400/30]="order.status === 'IN_PRODUCTION'"
                  [class.text-purple-100]="order.status === 'IN_PRODUCTION'"
                  [class.bg-amber-400/30]="order.status === 'IN_DELIVERY'"
                  [class.text-amber-100]="order.status === 'IN_DELIVERY'"
                  [class.bg-emerald-400/30]="order.status === 'DELIVERED'"
                  [class.text-emerald-100]="order.status === 'DELIVERED'"
                >
                  {{ ('b2cOrderStatus.' + order.status) | t }}
                </span>
              </div>
              <p class="mt-1 text-sm text-blue-100/90">
                @if (order.status === 'IN_PROGRESS') {
                  Sélectionnez les produits souhaités par le client, encaissez en espèces et ajoutez la ligne à la commande globale.
                } @else if (order.status === 'IN_PRODUCTION') {
                  Commande en préparation chez les fournisseurs — Lecture seule (modifications verrouillées, consultation des clients inclus).
                } @else if (order.status === 'IN_DELIVERY') {
                  Mode Distribution — Pointez la remise des commandes aux clients au fur et à mesure.
                } @else {
                  Commande globale 100% distribuée aux clients.
                }
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              @if (!authStore.isAdmin() && order.status === 'IN_PROGRESS') {
                <button
                  type="button"
                  class="ui-btn-emerald w-full sm:w-auto"
                  (click)="openNewCashSaleModal()"
                >
                  + Saisir une commande client
                </button>
              }

              @if (authStore.isAdmin()) {
                <button
                  type="button"
                  class="ui-btn-emerald w-full sm:w-auto"
                  (click)="workflowStore.downloadClientOrdersExcel()"
                >
                  📊 Télécharger Récapitulatif Excel (.xlsx)
                </button>

                @if (order.status === 'IN_PROGRESS') {
                  <button
                    type="button"
                    class="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 disabled:opacity-40 cursor-pointer"
                    [disabled]="order.lines.length === 0"
                    (click)="workflowStore.moveActiveB2cOrderToProduction()"
                  >
                    {{ 'b2c.moveToProductionBtn' | t }}
                  </button>
                }
                @if (order.status === 'IN_PRODUCTION') {
                  <button
                    type="button"
                    class="rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 cursor-pointer"
                    (click)="workflowStore.moveActiveB2cOrderToDelivery()"
                  >
                    {{ 'b2c.moveToDeliveryBtn' | t }}
                  </button>
                }
              }
            </div>
          </div>

          <!-- 3 INDICATEURS ESSENTIELS (DISTRIBUTION PAR CLIENT) -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="text-xs font-medium text-slate-400">Volume de la commande globale</div>
              <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {{ buyerPackages().length }} client(s) · {{ order.totalQuantity }} article(s)
              </div>
              <div class="mt-1.5 text-xs font-semibold text-[#16803c]">
                Commandes clients pour {{ workflowStore.selectedClient()?.name }}
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="text-xs font-medium text-slate-400">Total encaissé (Espèces)</div>
              <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {{ order.totalCashAmount | number: '1.0-2' }} DH
              </div>
              <div class="mt-1.5 text-xs font-semibold text-[#16803c]">
                100% réglé au comptant ({{ buyerPackages().length }} client(s) final(aux))
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="text-xs font-medium text-slate-400">Suivi de la distribution par client</div>
              <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {{ deliveredClientsCount() }} / {{ buyerPackages().length }} client(s) distribué(s)
              </div>
              <div class="mt-1.5 text-xs font-medium text-amber-700">
                {{ pendingClientsCount() }} client(s) en attente de remise
              </div>
            </div>
          </div>

          <!-- SUIVI DE L'AVANCEMENT & COMPTEUR RESTANT PAR SECTION / CLASSE -->
          @if (clientSections().length > 0) {
            <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <div>
                  <h3 class="text-sm font-bold text-slate-900">
                    Avancement des commandes & Compteur par Section / Classe
                  </h3>
                  <p class="text-xs text-slate-500">
                    Chaque commande client enregistrée décrémente automatiquement le compteur de la section impactée.
                  </p>
                </div>
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#163672]">
                  {{ clientSections().length }} section(s) configurée(s)
                </span>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                @for (sec of clientSections(); track sec.id) {
                  @let orderedCount = getOrderedCountForSection(sec);
                  @let remaining = getRemainingCapacityForSection(sec);
                  @let pct = getSectionProgressPct(sec);
                  <div class="rounded-xl border border-slate-200/80 bg-[#f8fafc] p-3.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-bold text-slate-900">{{ sec.name }}</span>
                      <span
                        class="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold"
                        [class.bg-[#dcfce7]]="remaining > 5"
                        [class.text-[#15803d]]="remaining > 5"
                        [class.bg-amber-100]="remaining > 0 && remaining <= 5"
                        [class.text-amber-800]="remaining > 0 && remaining <= 5"
                        [class.bg-rose-100]="remaining === 0"
                        [class.text-rose-700]="remaining === 0"
                      >
                        Compteur : {{ remaining }} restant(s)
                      </span>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{{ orderedCount }} commande(s) saisie(s)</span>
                      <span>Capacité : {{ sec.capacity }}</span>
                    </div>
                    <div class="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
                        [style.width.%]="pct"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- HISTORIQUE DES COMMANDES GLOBALES DE L'ÉTABLISSEMENT (ADMIN) -->
          @if (authStore.isAdmin() && workflowStore.b2cOrders().length > 0) {
            <div class="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-3.5">
                <div>
                  <h3 class="text-sm font-extrabold text-slate-900">
                    📜 Historique des Commandes Globales — {{ workflowStore.selectedClient()?.name }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    Consultez l'historique des lots de commandes de l'établissement ou supprimez une commande avec confirmation.
                  </p>
                </div>
                <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
                  {{ workflowStore.b2cOrders().length }} lot(s) dans l'historique
                </span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th class="px-3.5 py-2.5">N° Commande</th>
                      <th class="px-3.5 py-2.5">Date de création</th>
                      <th class="px-3.5 py-2.5">Statut</th>
                      <th class="px-3.5 py-2.5">Articles</th>
                      <th class="px-3.5 py-2.5">Total Encaissé</th>
                      <th class="px-3.5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (summary of workflowStore.b2cOrders(); track summary.id) {
                      <tr
                        class="border-b border-slate-100 text-xs transition hover:bg-slate-50/80"
                        [class.bg-indigo-50/40]="summary.id === order.id"
                      >
                        <td class="px-3.5 py-3 font-mono font-bold text-slate-900">
                          <div class="flex items-center gap-2">
                            <span>{{ summary.orderNumber }}</span>
                            @if (summary.id === order.id) {
                              <span class="rounded-full bg-[#163672] px-2 py-0.5 font-sans text-[10px] font-extrabold text-white">
                                Affichée
                              </span>
                            }
                          </div>
                        </td>
                        <td class="px-3.5 py-3 text-slate-600">
                          {{ summary.createdAt | date: 'dd/MM/yyyy à HH:mm' }}
                        </td>
                        <td class="px-3.5 py-3">
                          <span
                            class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                            [class.bg-blue-100]="summary.status === 'IN_PROGRESS'"
                            [class.text-blue-800]="summary.status === 'IN_PROGRESS'"
                            [class.bg-purple-100]="summary.status === 'IN_PRODUCTION'"
                            [class.text-purple-800]="summary.status === 'IN_PRODUCTION'"
                            [class.bg-amber-100]="summary.status === 'IN_DELIVERY'"
                            [class.text-amber-800]="summary.status === 'IN_DELIVERY'"
                            [class.bg-emerald-100]="summary.status === 'DELIVERED'"
                            [class.text-emerald-800]="summary.status === 'DELIVERED'"
                          >
                            {{ ('b2cOrderStatus.' + summary.status) | t }}
                          </span>
                        </td>
                        <td class="px-3.5 py-3 font-semibold text-slate-800">
                          {{ summary.totalQuantity }} article(s)
                        </td>
                        <td class="px-3.5 py-3 font-extrabold text-[#15803d]">
                          {{ summary.totalCashAmount | number: '1.2-2' }} DH
                        </td>
                        <td class="px-3.5 py-3 text-right">
                          <div class="inline-flex items-center justify-end gap-2">
                            @if (summary.id !== order.id) {
                              <button
                                type="button"
                                class="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-[#163672] hover:bg-indigo-50 cursor-pointer"
                                (click)="workflowStore.selectB2cOrder(summary.id)"
                              >
                                👁️ Consulter
                              </button>
                            }
                            <button
                              type="button"
                              class="rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              title="Supprimer cette commande globale"
                              (click)="orderSummaryToDelete.set(summary)"
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- CARTE TABLEAU COMMANDE GLOBALE (VUE UNIQUE PAR CLIENT FINAL) -->
          @defer {
            <div class="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="flex flex-wrap items-center justify-between gap-4 pb-5">
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-base font-bold text-slate-900">
                    Historique des Commandes par Client ({{ filteredBuyerPackages().length }} / {{ buyerPackages().length }})
                  </h3>

                  @if (workflowStore.b2cOrders().length >= 1) {
                    <select
                      class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      [value]="order.id"
                      (change)="workflowStore.selectB2cOrder($any($event.target).value)"
                    >
                      @for (summary of workflowStore.b2cOrders(); track summary.id) {
                        <option [value]="summary.id">
                          {{ summary.orderNumber }} — {{ ('b2cOrderStatus.' + summary.status) | t }} ({{ summary.totalQuantity }} art.)
                        </option>
                      }
                    </select>
                  }
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <div class="relative w-full sm:w-64">
                    <input
                      type="search"
                      placeholder="🔍 Rechercher client, tél, reçu, section..."
                      class="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      [value]="buyerSearchQuery()"
                      (input)="buyerSearchQuery.set($any($event.target).value)"
                    />
                  </div>

                  @if (authStore.isAdmin()) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-[#15803d] shadow-2xs transition hover:bg-emerald-100 cursor-pointer"
                      (click)="workflowStore.downloadClientOrdersExcel()"
                    >
                      📊 Exporter Récapitulatif Excel (.xlsx)
                    </button>
                  }

                  @if (order.status !== 'IN_PROGRESS') {
                    <button
                      type="button"
                      class="rounded-xl bg-[#163672] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d2554] cursor-pointer"
                      (click)="workflowStore.initializeNewB2cOrder()"
                    >
                      + Nouvelle commande globale (En cours)
                    </button>
                  }
                </div>
              </div>

              <!-- VUE UNIQUE PAR CLIENT FINAL -->
              <div class="space-y-3">
                @for (pkg of filteredBuyerPackages(); track pkg.buyerKey) {
                  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-[#f8fafc] p-4 transition hover:border-indigo-200 hover:bg-slate-50">
                    <div class="space-y-2 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-md bg-slate-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                          {{ pkg.receiptNumberLabel }}
                        </span>
                        <span class="text-sm font-extrabold text-slate-900">{{ pkg.buyerFullName }}</span>
                        @if (pkg.buyerPhone) {
                          <span class="text-xs font-medium text-slate-500">· 📞 {{ pkg.buyerPhone }}</span>
                        }
                        @if (pkg.sectionName) {
                          <span class="rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#163672]">
                            Section : {{ pkg.sectionName }}
                          </span>
                        }
                        @if (pkg.createdAt) {
                          <span class="text-[11px] font-medium text-slate-400">
                            · 🕒 {{ pkg.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                          </span>
                        }
                      </div>

                      <!-- Liste des articles commandés par ce client -->
                      <div class="flex flex-wrap items-center gap-1.5">
                        @for (line of pkg.lines; track line.id) {
                          <span
                            class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-2.5 py-1 text-xs font-semibold text-[#163672]"
                          >
                            <span class="font-extrabold">{{ line.quantity }}×</span>
                            <span>{{ resolveCatalogItemName(line.catalogItemId) }}</span>
                            <span class="text-slate-500">
                              ({{ ('gender.' + line.gender) | t }} · {{ ('size.' + line.size) | t }})
                            </span>
                          </span>
                        }
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0 border-t border-slate-200/60 pt-3 lg:border-t-0 lg:pt-0">
                      <div class="text-left lg:text-right">
                        <div class="text-sm font-extrabold text-slate-900">
                          {{ pkg.totalCashAmount | number: '1.0-2' }} DH
                        </div>
                        <div class="text-[11px] font-semibold text-slate-500">
                          {{ pkg.totalQuantity }} article(s) payé(s)
                        </div>
                      </div>

                      <span
                        class="rounded-full px-3 py-1 text-xs font-bold"
                        [class.bg-[#dcfce7]]="pkg.allDelivered"
                        [class.text-[#15803d]]="pkg.allDelivered"
                        [class.bg-[#fef3c7]]="!pkg.allDelivered"
                        [class.text-[#92400e]]="!pkg.allDelivered"
                      >
                        {{ pkg.allDelivered ? 'Distribuée au client' : 'À distribuer au client' }}
                      </span>

                      <div class="flex flex-wrap items-center gap-2">
                        @if (order.status === 'IN_DELIVERY' && !pkg.allDelivered) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-[#16803c] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#146c32] cursor-pointer"
                            (click)="workflowStore.deliverBuyerPackage(pkg.lines)"
                          >
                            ✅ Distribuer au client
                          </button>
                        }

                        <button
                          type="button"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-[#163672] shadow-2xs transition hover:bg-indigo-50 cursor-pointer"
                          title="Imprimer le justificatif d'achat officiel du client (PDF)"
                          (click)="workflowStore.downloadBuyerPackageReceiptPdf(pkg.lines)"
                        >
                          🖨️ Justificatif PDF
                        </button>

                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
                          title="Afficher le détail complet de la commande du client"
                          (click)="selectedLineDetail.set(pkg.lines[0])"
                        >
                          🔍 Détail
                        </button>

                        @if (authStore.isAdmin()) {
                          <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition hover:bg-rose-100 cursor-pointer"
                            title="Supprimer la commande de ce client"
                            (click)="openDeleteBuyerPackageModal(pkg)"
                          >
                            🗑️ Supprimer
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="py-10 text-center text-sm text-slate-400">
                    {{ 'b2c.emptyLines' | t }}
                  </div>
                }
              </div>
            </div>
          }
        } @else {
          <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-2xs">
            <p class="text-sm text-slate-600">{{ 'b2c.noActiveOrder' | t }}</p>
            <button
              type="button"
              class="mt-4 rounded-xl bg-[#16803c] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#146c32] cursor-pointer"
              (click)="workflowStore.initializeNewB2cOrder()"
            >
              {{ 'b2c.initNewOrderBtn' | t }}
            </button>
          </div>
        }
      }

      <!-- =================================================================== -->
      <!-- POPIN (Modale) "Afficher détail" de la commande d'un client          -->
      <!-- =================================================================== -->
      @if (selectedLineDetail(); as detailLine) {
        @let buyerLines = getBuyerLinesForDetail(detailLine);
        @let buyerTotalCash = getBuyerTotalCash(buyerLines);
        @let buyerAllDelivered = areAllBuyerLinesDelivered(buyerLines);
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-xl">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Détail de la commande — {{ detailLine.buyerFullName }}
                </h3>
                <p class="text-xs text-slate-500">
                  Lot école : {{ workflowStore.activeB2cOrder()?.orderNumber }} · {{ buyerLines.length }} article(s)
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="selectedLineDetail.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-4 text-sm">
              <div class="grid grid-cols-2 gap-4 rounded-xl bg-[#f8fafc] p-4">
                <div>
                  <div class="text-xs text-slate-400">Parent / Acheteur</div>
                  <div class="mt-0.5 font-bold text-slate-900">{{ detailLine.buyerFullName }}</div>
                </div>
                <div>
                  <div class="text-xs text-slate-400">Section / Classe</div>
                  <div class="mt-0.5">
                    <span class="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#163672]">
                      {{ detailLine.sectionName || 'Non renseignée' }}
                    </span>
                  </div>
                </div>
                <div>
                  <div class="text-xs text-slate-400">Téléphone</div>
                  <div class="mt-0.5 font-semibold text-slate-800">{{ detailLine.buyerPhone || '—' }}</div>
                </div>
                <div>
                  <div class="text-xs text-slate-400">Email</div>
                  <div class="mt-0.5 text-slate-700">{{ detailLine.buyerEmail || '—' }}</div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200/80 p-4 space-y-3">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Articles commandés par ce client ({{ buyerLines.length }})
                </div>

                <div class="divide-y divide-slate-100">
                  @for (line of buyerLines; track line.id) {
                    <div class="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div class="font-bold text-slate-900">
                          {{ line.quantity }}× {{ resolveCatalogItemName(line.catalogItemId) }}
                        </div>
                        <div class="text-xs text-slate-500">
                          {{ ('gender.' + line.gender) | t }} — Taille {{ ('size.' + line.size) | t }}
                        </div>
                      </div>
                      <div class="flex items-center gap-2.5">
                        <span class="font-bold text-slate-900">
                          {{ line.lineCashAmount | number: '1.2-2' }} DH
                        </span>
                      </div>
                    </div>
                  }
                </div>

                <div class="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span class="text-xs font-bold uppercase text-slate-500">Total payé en espèces</span>
                  <span class="text-base font-extrabold text-[#15803d]">
                    {{ buyerTotalCash | number: '1.2-2' }} DH
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span class="text-xs font-semibold text-slate-600">Statut de distribution du client :</span>
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold"
                  [class.bg-[#fef3c7]]="!buyerAllDelivered"
                  [class.text-[#92400e]]="!buyerAllDelivered"
                  [class.bg-[#dcfce7]]="buyerAllDelivered"
                  [class.text-[#15803d]]="buyerAllDelivered"
                >
                  {{ buyerAllDelivered ? 'Distribuée au client' : 'En attente de distribution au client' }}
                </span>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2 text-xs font-bold text-[#163672] hover:bg-indigo-100 cursor-pointer"
                (click)="workflowStore.downloadBuyerPackageReceiptPdf(buyerLines)"
              >
                🖨️ Imprimer le Justificatif d'achat du client (PDF)
              </button>

              @if (workflowStore.activeB2cOrder()?.status === 'IN_DELIVERY' && !buyerAllDelivered) {
                <button
                  type="button"
                  class="rounded-xl bg-[#16803c] px-4 py-2 text-xs font-bold text-white hover:bg-[#146c32] cursor-pointer"
                  (click)="confirmBuyerPackageDeliveryFromDetail(buyerLines)"
                >
                  ✅ Distribuer la commande au client
                </button>
              }

              @if (authStore.isAdmin()) {
                <button
                  type="button"
                  class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                  (click)="requestDeleteBuyerLinesFromDetail(buyerLines)"
                >
                  🗑️ Supprimer la commande
                </button>
              }

              <button
                type="button"
                class="rounded-xl bg-[#163672] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d2554] cursor-pointer"
                (click)="selectedLineDetail.set(null)"
              >
                {{ 'common.close' | t }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- =================================================================== -->
      <!-- POPIN DE CONFIRMATION : REMISE À ZÉRO DU COMPTEUR DE CAISSE         -->
      <!-- =================================================================== -->
      @if (showResetCashCounterModal()) {
        @let caisse = cashCounterMetrics();
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-base text-amber-800">
                  🔄
                </span>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Remettre à zéro le compteur de caisse
                  </h3>
                  <p class="text-xs text-slate-500">
                    {{ workflowStore.selectedClient()?.name }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="showResetCashCounterModal.set(false)"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-3 text-xs text-slate-600">
              <p class="leading-relaxed">
                Confirmez-vous la remise à zéro du compteur de caisse pour l'établissement
                <strong class="text-slate-900">{{ workflowStore.selectedClient()?.name }}</strong> ?
              </p>

              <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-slate-600">Montant actuel en caisse :</span>
                  <span class="text-sm font-extrabold text-[#15803d]">{{ caisse.cashAmount | number: '1.2-2' }} DH</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-slate-600">Commandes suivies :</span>
                  <span class="font-bold text-slate-900">{{ caisse.clientsCount }} commande(s) ({{ caisse.unitsCount }} article(s))</span>
                </div>
              </div>

              <p class="text-[11px] text-slate-500 leading-relaxed">
                ℹ️ Ce montant sera archivé comme dernier arrêté de caisse et votre compteur repartira immédiatement à
                <strong>0,00 DH</strong> et <strong>0 commande</strong>. Les commandes clients déjà saisies restent conservées dans la commande globale de l'établissement.
              </p>
            </div>

            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                (click)="showResetCashCounterModal.set(false)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="button"
                class="rounded-xl bg-[#16803c] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#146c32] cursor-pointer"
                (click)="confirmResetCashCounter()"
              >
                🔄 Confirmer la remise à zéro
              </button>
            </div>
          </div>
        </div>
      }

      <!-- =================================================================== -->
      <!-- POPIN DE CONFIRMATION (ADMIN) : SUPPRESSION D'UNE COMMANDE CLIENT   -->
      <!-- =================================================================== -->
      @if (buyerPackageToDelete(); as pkgToDelete) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-base text-rose-700">
                  🗑️
                </span>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Supprimer la commande du client
                  </h3>
                  <p class="text-xs text-slate-500">
                    Confirmation de suppression définitive
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="buyerPackageToDelete.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-3 text-xs text-slate-600">
              <p class="leading-relaxed">
                Êtes-vous sûr de vouloir supprimer la commande du client
                <strong class="text-slate-900">{{ pkgToDelete.buyerFullName }}</strong> ?
              </p>

              <div class="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">N° Justificatif :</span>
                  <span class="font-mono font-bold text-slate-900">{{ pkgToDelete.receiptNumberLabel }}</span>
                </div>
                @if (pkgToDelete.sectionName) {
                  <div class="flex items-center justify-between">
                    <span class="text-slate-500">Section / Classe :</span>
                    <span class="font-bold text-[#163672]">{{ pkgToDelete.sectionName }}</span>
                  </div>
                }
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Volume commandé :</span>
                  <span class="font-bold text-slate-900">{{ pkgToDelete.totalQuantity }} article(s)</span>
                </div>
                <div class="flex items-center justify-between border-t border-rose-200/60 pt-1.5">
                  <span class="font-semibold text-slate-700">Montant encaissé :</span>
                  <span class="text-sm font-extrabold text-rose-700">{{ pkgToDelete.totalCashAmount | number: '1.2-2' }} DH</span>
                </div>
              </div>

              <p class="text-[11px] text-slate-500 leading-relaxed">
                ⚠️ Cette opération est irréversible. Si cette commande avait déjà été distribuée, les articles correspondants seront automatiquement recrédités dans le stock de l'établissement.
              </p>
            </div>

            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                (click)="buyerPackageToDelete.set(null)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="button"
                [disabled]="workflowStore.loading()"
                class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40 cursor-pointer"
                (click)="confirmDeleteBuyerPackage()"
              >
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      }

      <!-- =================================================================== -->
      <!-- POPIN DE CONFIRMATION (ADMIN) : SUPPRESSION D'UNE COMMANDE GLOBALE  -->
      <!-- =================================================================== -->
      @if (orderSummaryToDelete(); as orderToDelete) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-md">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2.5">
                <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-base text-rose-700">
                  🗑️
                </span>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Supprimer la commande globale {{ orderToDelete.orderNumber }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    Confirmation de suppression de l'historique
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="orderSummaryToDelete.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="mt-4 space-y-3 text-xs text-slate-600">
              <p class="leading-relaxed">
                Confirmez-vous la suppression définitive de la commande globale
                <strong class="text-slate-900">{{ orderToDelete.orderNumber }}</strong>
                pour l'établissement <strong class="text-slate-900">{{ workflowStore.selectedClient()?.name }}</strong> ?
              </p>

              <div class="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Date de création :</span>
                  <span class="font-bold text-slate-900">{{ orderToDelete.createdAt | date: 'dd/MM/yyyy à HH:mm' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Statut :</span>
                  <span class="font-bold text-slate-900">{{ ('b2cOrderStatus.' + orderToDelete.status) | t }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">Total articles :</span>
                  <span class="font-bold text-slate-900">{{ orderToDelete.totalQuantity }} article(s)</span>
                </div>
                <div class="flex items-center justify-between border-t border-rose-200/60 pt-1.5">
                  <span class="font-semibold text-slate-700">Total espèces :</span>
                  <span class="text-sm font-extrabold text-rose-700">{{ orderToDelete.totalCashAmount | number: '1.2-2' }} DH</span>
                </div>
              </div>

              <p class="text-[11px] text-slate-500 leading-relaxed">
                ⚠️ Toutes les commandes clients rattachées à ce lot seront supprimées. Les articles déjà distribués seront recrédités au stock de l'établissement.
              </p>
            </div>

            <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                (click)="orderSummaryToDelete.set(null)"
              >
                {{ 'common.cancel' | t }}
              </button>
              <button
                type="button"
                [disabled]="workflowStore.loading()"
                class="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40 cursor-pointer"
                (click)="confirmDeleteGlobalOrder()"
              >
                🗑️ Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      }

      <!-- =================================================================== -->
      <!-- POPIN (Modale) d'Ajustement / Approvisionnement du Stock (ADMIN)     -->
      <!-- =================================================================== -->
      @if (showStockAdjustModal()) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-lg">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Ajuster le stock disponible par article et par taille
                </h3>
                <p class="text-xs text-slate-500">
                  École : {{ workflowStore.selectedClient()?.name }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="showStockAdjustModal.set(false)"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="stockAdjustForm" (ngSubmit)="submitStockAdjust()" novalidate class="mt-4 space-y-4">
              <p class="text-[11px] text-slate-500">
                <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
              </p>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Article du catalogue <span class="font-bold text-rose-600">*</span>
                </label>
                <select
                  formControlName="catalogItemId"
                  class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  @for (item of workflowStore.catalogItems(); track item.id) {
                    <option [value]="item.id">{{ item.name }} ({{ item.referenceCode }})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Genre / Coupe <span class="font-bold text-rose-600">*</span>
                  </label>
                  <select
                    class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    [value]="adjustGender()"
                    (change)="onAdjustGenderChange($any($event.target).value)"
                  >
                    @for (g of allowedGenders(); track g) {
                      <option [value]="g">{{ ('gender.' + g) | t }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    Taille <span class="font-bold text-rose-600">*</span>
                  </label>
                  <select
                    class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    [value]="adjustSize()"
                    (change)="onAdjustSizeChange($any($event.target).value)"
                  >
                    @for (s of adjustAllowedSizes(); track s) {
                      <option [value]="s">{{ ('size.' + s) | t }}</option>
                    }
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-700">
                  Quantité disponible en stock <span class="font-bold text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  formControlName="availableQuantity"
                  class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-900"
                />
                @if (stockAdjustForm.controls.availableQuantity.invalid && stockAdjustForm.controls.availableQuantity.touched) {
                  <p class="mt-1 text-xs font-semibold text-rose-600">
                    La quantité en stock doit être supérieure ou égale à 0.
                  </p>
                }
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  (click)="showStockAdjustModal.set(false)"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="submit"
                  [disabled]="stockAdjustForm.invalid || workflowStore.loading()"
                  class="rounded-xl bg-[#16803c] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#146c32] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  Enregistrer le stock disponible
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- =================================================================== -->
      <!-- POPIN (Modale) de Saisie d'une Nouvelle Commande / Encaissement      -->
      <!-- =================================================================== -->
      @if (showCashSaleModal()) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-2xl">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  {{ 'b2c.newCashSaleTitle' | t }}
                </h3>
                <p class="text-xs text-slate-500">
                  {{ 'b2c.newCashSaleSubtitle' | t }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                (click)="closeCashSaleModal()"
              >
                ✕
              </button>
            </div>

            <form [formGroup]="lineForm" (ngSubmit)="confirmAndSubmitCashOrderLine()" novalidate class="mt-4 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-[11px] text-slate-500">
                  <span class="font-bold text-rose-600">*</span> {{ 'common.requiredLegend' | t }}
                </p>
                @if (isPrimarySchoolClient()) {
                  <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                    École Primaire : Tailles Enfant (2 ans à 14 ans) uniquement
                  </span>
                }
              </div>

              <!-- SÉLECTION DE LA SECTION / CLASSE DE L'ÉLÈVE -->
              <div class="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 space-y-2.5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="block text-xs font-bold text-slate-800">
                    Section / Classe de l'élève <span class="font-bold text-rose-600">*</span>
                  </label>
                </div>

                @if (clientSections().length > 0) {
                  <select
                    formControlName="sectionId"
                    class="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                    [class.border-rose-400]="submitted() && !isSectionSelectionValid()"
                    [class.border-slate-300]="!(submitted() && !isSectionSelectionValid())"
                  >
                    <option value="">-- Sélectionner une section --</option>
                    @for (sec of clientSections(); track sec.id) {
                      <option [value]="sec.id">{{ sec.name }}</option>
                    }
                  </select>
                } @else {
                  <input
                    type="text"
                    formControlName="sectionName"
                    placeholder="Ex: CP - Section A / 6ème B"
                    class="w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                    [class.border-rose-400]="submitted() && !isSectionSelectionValid()"
                    [class.border-slate-300]="!(submitted() && !isSectionSelectionValid())"
                  />
                }

                @if (submitted() && !isSectionSelectionValid()) {
                  <p class="text-xs font-semibold text-rose-600">
                    Veuillez renseigner la section / classe associée à cette commande.
                  </p>
                }
              </div>

              <!-- SÉLECTION MULTI-ARTICLES PAR CASES À COCHER -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold text-slate-800">
                    Articles souhaités par le client (cochez un ou plusieurs types disponibles)
                    <span class="font-bold text-rose-600">*</span>
                  </label>
                  <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#163672]">
                    {{ checkedItemsCount() }} article(s) coché(s) · {{ totalSelectedUnits() }} unité(s)
                  </span>
                </div>

                <div class="space-y-2.5">
                  @for (item of workflowStore.catalogItems(); track item.id) {
                    @let sel = getItemSelection(item.id);
                    <div
                      class="rounded-2xl border p-3.5 transition"
                      [class.border-[#163672]]="sel.checked"
                      [class.bg-blue-50/35]="sel.checked"
                      [class.border-slate-200]="!sel.checked"
                      [class.bg-white]="!sel.checked"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <label class="flex items-start gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            class="mt-1 h-4 w-4 rounded border-slate-300 text-[#163672] focus:ring-[#163672]"
                            [checked]="sel.checked"
                            (change)="toggleItemChecked(item.id, $any($event.target).checked)"
                          />
                          <div>
                            <div class="text-sm font-bold text-slate-900">
                              {{ item.name }}
                              <span class="ml-1 font-mono text-xs font-normal text-slate-500">
                                ({{ item.referenceCode }})
                              </span>
                            </div>
                            <div class="text-xs text-slate-500">
                              {{ item.garmentStyle }} · {{ item.colorReference }}
                            </div>
                          </div>
                        </label>

                        <div class="text-right shrink-0">
                          <div class="text-sm font-extrabold text-[#15803d]">
                            {{ item.b2cUnitPrice | number: '1.2-2' }} DH
                          </div>
                          @if (sel.checked) {
                            <div class="text-[11px] font-bold text-slate-600">
                              Sous-total : {{ (item.b2cUnitPrice * sel.quantity) | number: '1.2-2' }} DH
                            </div>
                          }
                        </div>
                      </div>

                      @if (sel.checked) {
                        <div class="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-3 sm:grid-cols-3">
                          <div>
                            <label class="block text-[11px] font-semibold text-slate-700">
                              {{ 'b2c.genderLabel' | t }} <span class="font-bold text-rose-600">*</span>
                            </label>
                            <select
                              class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                              [value]="sel.gender"
                              (change)="updateItemGender(item.id, $any($event.target).value)"
                            >
                              @for (gender of allowedGenders(); track gender) {
                                <option [value]="gender">{{ ('gender.' + gender) | t }}</option>
                              }
                            </select>
                          </div>

                          <div>
                            <label class="block text-[11px] font-semibold text-slate-700">
                              {{ (sel.gender === 'KIDS' ? 'b2c.sizeGridKids' : 'b2c.sizeGridAdult') | t }}
                              <span class="font-bold text-rose-600">*</span>
                            </label>
                            <select
                              class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                              [value]="sel.size"
                              (change)="updateItemSize(item.id, $any($event.target).value)"
                            >
                              @for (size of getAllowedSizesForItem(item.id); track size) {
                                <option [value]="size">{{ ('size.' + size) | t }}</option>
                              }
                            </select>
                          </div>

                          <div>
                            <label class="block text-[11px] font-semibold text-slate-700">
                              {{ 'b2c.quantityLabel' | t }} <span class="font-bold text-rose-600">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-900"
                              [value]="sel.quantity"
                              (input)="updateItemQuantity(item.id, +$any($event.target).value || 1)"
                            />
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>

                @if (submitted() && checkedItemsCount() === 0) {
                  <p class="text-xs font-semibold text-rose-600">
                    Veuillez cocher au moins un produit souhaité par le client.
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'b2c.buyerFullNameLabel' | t }} <span class="font-bold text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    formControlName="buyerFullName"
                    placeholder="Ex: M. Alaoui / Mme Bennis"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                    [class.border-rose-400]="isInvalid('buyerFullName')"
                    [class.border-slate-300]="!isInvalid('buyerFullName')"
                  />
                  @if (isInvalid('buyerFullName')) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      {{ 'validation.required' | t }}
                    </p>
                  }
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'b2c.buyerPhoneLabel' | t }} <span class="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="tel"
                    formControlName="buyerPhone"
                    placeholder="Ex: +212 6 12 34 56 78 ou 06 12 34 56 78"
                    class="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700">
                    {{ 'b2c.buyerEmailLabel' | t }} <span class="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="email"
                    formControlName="buyerEmail"
                    placeholder="parent@exemple.ma"
                    class="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
                    [class.border-rose-400]="isInvalid('buyerEmail')"
                    [class.border-slate-300]="!isInvalid('buyerEmail')"
                  />
                  @if (isInvalid('buyerEmail')) {
                    <p class="mt-1 text-xs font-semibold text-rose-600">
                      {{ 'validation.emailInvalid' | t }}
                    </p>
                  }
                </div>
              </div>

              <div class="rounded-2xl border border-emerald-200 bg-[#dcfce7]/50 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold uppercase text-[#15803d]">
                    {{ 'b2c.cashToCollectLabel' | t }}
                  </span>
                  <span class="text-lg font-extrabold text-[#15803d]">
                    {{ computedLineCashAmount() | number: '1.2-2' }} DH (MAD)
                  </span>
                </div>

                <label class="flex items-start gap-2 text-xs text-slate-900">
                  <input
                    type="checkbox"
                    [checked]="cashPaymentConfirmed()"
                    (change)="cashPaymentConfirmed.set($any($event.target).checked)"
                    class="mt-0.5 rounded border-emerald-500"
                  />
                  <span class="font-semibold">
                    {{ 'b2c.confirmCashCheckbox' | t }} <span class="font-bold text-rose-600">*</span>
                  </span>
                </label>
                @if (submitted() && !cashPaymentConfirmed()) {
                  <p class="text-xs font-semibold text-rose-600">
                    {{ 'b2c.confirmCashRequired' | t }}
                  </p>
                }
              </div>

              <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  class="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  (click)="closeCashSaleModal()"
                >
                  {{ 'common.cancel' | t }}
                </button>
                <button
                  type="submit"
                  [disabled]="lineForm.invalid || !isSectionSelectionValid() || !cashPaymentConfirmed() || checkedItemsCount() === 0 || workflowStore.loading()"
                  class="rounded-xl bg-[#16803c] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#146c32] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {{ 'b2c.confirmModalBtn' | t }}
                </button>
              </div>
            </form>
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
              @if (authStore.isAdmin()) {
                Créez votre premier établissement scolaire pour accéder à son espace de commandes et à son stock.
              } @else {
                Votre compte opérateur n'est rattaché à aucun établissement pour le moment. Veuillez contacter un administrateur.
              }
            </p>
          </div>
          @if (authStore.isAdmin()) {
            <div class="flex items-center justify-center pt-2">
              <button
                type="button"
                (click)="workflowStore.openNewClientModalFromNav()"
                class="ui-btn-emerald"
              >
                + Nouvel Établissement
              </button>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class B2cOrderCounterComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  readonly authStore = inject(AuthStore);

  readonly genders = ALL_GENDERS;
  readonly isPrimarySchoolClient = computed<boolean>(
    () => this.workflowStore.selectedClient()?.clientType === 'PRIMARY_SCHOOL'
  );
  readonly allowedGenders = computed<readonly Gender[]>(() =>
    getAllowedGendersForClientType(this.workflowStore.selectedClient()?.clientType)
  );

  readonly itemSelections = signal<Readonly<Record<string, ProductOrderSelection>>>({});
  readonly selectedLineDetail = signal<B2cOrderLineResponse | null>(null);
  readonly groupByBuyerView = signal<boolean>(false);
  readonly buyerSearchQuery = signal<string>('');
  readonly showResetCashCounterModal = signal<boolean>(false);
  readonly buyerPackageToDelete = signal<{
    readonly buyerFullName: string;
    readonly receiptNumberLabel: string;
    readonly sectionName: string | null;
    readonly totalQuantity: number;
    readonly totalCashAmount: number;
    readonly lines: readonly B2cOrderLineResponse[];
  } | null>(null);
  readonly orderSummaryToDelete = signal<B2cOrderSummaryResponse | null>(null);

  readonly buyerPackages = computed(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return [];
    }
    const groups = new Map<
      string,
      {
        buyerKey: string;
        buyerFullName: string;
        buyerPhone: string;
        sectionName: string | null;
        createdAt: string;
        items: string[];
        lines: B2cOrderLineResponse[];
        totalQuantity: number;
        totalCashAmount: number;
        allDelivered: boolean;
      }
    >();

    for (const line of order.lines) {
      const secKey = (line.sectionName ?? '').trim().toLowerCase();
      const key = `${line.buyerFullName.trim().toLowerCase()}|${line.buyerPhone.trim()}|${secKey}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          buyerKey: key,
          buyerFullName: line.buyerFullName,
          buyerPhone: line.buyerPhone,
          sectionName: line.sectionName ?? null,
          createdAt: line.createdAt,
          items: [],
          lines: [],
          totalQuantity: 0,
          totalCashAmount: 0,
          allDelivered: true,
        };
        groups.set(key, group);
      }
      const itemName = this.resolveCatalogItemName(line.catalogItemId);
      const sizeLabel = line.size.startsWith('AGE_') ? `${line.size.replace('AGE_', '')} ans` : line.size;
      group.items.push(`${line.quantity}× ${itemName} (${sizeLabel})`);
      group.lines.push(line);
      group.totalQuantity += line.quantity;
      group.totalCashAmount += line.lineCashAmount;
      if (line.lineStatus === 'PENDING_PICKUP') {
        group.allDelivered = false;
      }
    }

    return Array.from(groups.values()).map((g) => ({
      ...g,
      receiptNumberLabel:
        g.lines.length <= 1
          ? (g.lines[0]?.receiptNumber ?? 'REC')
          : `${g.lines[0].receiptNumber} (+${g.lines.length - 1})`,
      summaryText: `${g.buyerFullName} : ${g.items.join(', ')}`,
    }));
  });

  readonly filteredBuyerPackages = computed(() => {
    const q = this.buyerSearchQuery().trim().toLowerCase();
    const list = this.buyerPackages();
    if (!q) {
      return list;
    }
    return list.filter(
      (pkg) =>
        pkg.buyerFullName.toLowerCase().includes(q) ||
        pkg.buyerPhone.toLowerCase().includes(q) ||
        pkg.receiptNumberLabel.toLowerCase().includes(q) ||
        (pkg.sectionName ?? '').toLowerCase().includes(q) ||
        pkg.summaryText.toLowerCase().includes(q)
    );
  });

  readonly cashCounterMetrics = computed<{
    readonly clientsCount: number;
    readonly unitsCount: number;
    readonly cashAmount: number;
  }>(() => {
    const resetAt = this.workflowStore.activeClientCashCounter()?.resetAt ?? null;
    const resetTimeMs = resetAt ? Date.parse(resetAt) : 0;
    const packages = this.buyerPackages();

    const activePackages =
      resetTimeMs > 0
        ? packages.filter((pkg) => {
            const pkgTimeMs = pkg.createdAt ? Date.parse(pkg.createdAt) : 0;
            return pkgTimeMs > resetTimeMs;
          })
        : packages;

    const clientsCount = activePackages.length;
    const unitsCount = activePackages.reduce((sum, p) => sum + p.totalQuantity, 0);
    const cashAmount =
      Math.round(activePackages.reduce((sum, p) => sum + p.totalCashAmount, 0) * 100) / 100;

    return {
      clientsCount,
      unitsCount,
      cashAmount,
    };
  });

  // Filtres pour la vue Stock par Article & Taille
  readonly stockFilterItemId = signal<string>('ALL');
  readonly stockFilterGender = signal<'ALL' | Gender>('ALL');

  // Modale d'ajustement de stock (Admin)
  readonly showStockAdjustModal = signal<boolean>(false);
  readonly adjustCatalogItemId = signal<string>('');
  readonly adjustGender = signal<Gender>('KIDS');
  readonly adjustAllowedSizes = computed<readonly Size[]>(() => {
    const itemId = this.adjustCatalogItemId();
    const item = this.workflowStore.catalogItems().find((i) => i.id === itemId);
    return getAllowedSizesForCatalogItem(
      item,
      this.adjustGender(),
      this.workflowStore.selectedClient()?.clientType
    );
  });
  readonly adjustSize = linkedSignal<readonly Size[], Size>({
    source: this.adjustAllowedSizes,
    computation: (sizes) => sizes[0] ?? 'AGE_10',
  });

  readonly stockAdjustForm = new FormGroup({
    catalogItemId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    availableQuantity: new FormControl<number>(20, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
  });

  readonly firstName = computed<string>(() => {
    const full = this.authStore.currentFullName().trim();
    if (!full) {
      return 'Agent';
    }
    return full.split(/\s+/)[0];
  });

  readonly pendingClientsCount = computed<number>(() =>
    this.buyerPackages().filter((p) => !p.allDelivered).length
  );

  readonly deliveredClientsCount = computed<number>(() =>
    this.buyerPackages().filter((p) => p.allDelivered).length
  );

  readonly pendingPickupCount = computed<number>(() => this.pendingClientsCount());

  readonly deliveredCount = computed<number>(() => this.deliveredClientsCount());

  readonly totalPendingPickupUnits = computed<number>(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return 0;
    }
    return order.lines
      .filter((l) => l.lineStatus === 'PENDING_PICKUP')
      .reduce((acc, l) => acc + l.quantity, 0);
  });

  readonly totalDeliveredUnits = computed<number>(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return 0;
    }
    return order.lines
      .filter((l) => l.lineStatus === 'DELIVERED')
      .reduce((acc, l) => acc + l.quantity, 0);
  });

  readonly allStockVariantRows = computed<readonly StockVariantSummaryRow[]>(() => {
    const items = this.workflowStore.catalogItems();
    const stocks = this.workflowStore.stocks();
    const lines = this.workflowStore.activeB2cOrder()?.lines ?? [];

    const rows: StockVariantSummaryRow[] = [];
    const seenKeys = new Set<string>();

    // 1. Inclure toutes les lignes de stock existantes du client
    for (const st of stocks) {
      const item = items.find((i) => i.id === st.catalogItemId);
      const key = `${st.catalogItemId}:${st.gender}:${st.size}`;
      seenKeys.add(key);

      const pendingQty = lines
        .filter(
          (l) =>
            l.catalogItemId === st.catalogItemId &&
            l.gender === st.gender &&
            l.size === st.size &&
            l.lineStatus === 'PENDING_PICKUP'
        )
        .reduce((sum, l) => sum + l.quantity, 0);

      const deliveredQty = lines
        .filter(
          (l) =>
            l.catalogItemId === st.catalogItemId &&
            l.gender === st.gender &&
            l.size === st.size &&
            l.lineStatus === 'DELIVERED'
        )
        .reduce((sum, l) => sum + l.quantity, 0);

      rows.push({
        catalogItemId: st.catalogItemId,
        itemName: item?.name ?? 'Tenue scolaire',
        itemReference: item?.referenceCode ?? '—',
        garmentStyle: item?.garmentStyle ?? '',
        gender: st.gender,
        size: st.size,
        availableQuantity: st.availableQuantity,
        pendingPickupQuantity: pendingQty,
        deliveredQuantity: deliveredQty,
        netAfterPending: st.availableQuantity - pendingQty,
        updatedAt: st.updatedAt,
      });
    }

    // 2. Inclure également toute variante présente dans la commande B2C active mais non encore initialisée en stock
    for (const line of lines) {
      const key = `${line.catalogItemId}:${line.gender}:${line.size}`;
      if (seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      const item = items.find((i) => i.id === line.catalogItemId);
      const pendingQty = lines
        .filter(
          (l) =>
            l.catalogItemId === line.catalogItemId &&
            l.gender === line.gender &&
            l.size === line.size &&
            l.lineStatus === 'PENDING_PICKUP'
        )
        .reduce((sum, l) => sum + l.quantity, 0);

      const deliveredQty = lines
        .filter(
          (l) =>
            l.catalogItemId === line.catalogItemId &&
            l.gender === line.gender &&
            l.size === line.size &&
            l.lineStatus === 'DELIVERED'
        )
        .reduce((sum, l) => sum + l.quantity, 0);

      rows.push({
        catalogItemId: line.catalogItemId,
        itemName: item?.name ?? 'Tenue scolaire',
        itemReference: item?.referenceCode ?? '—',
        garmentStyle: item?.garmentStyle ?? '',
        gender: line.gender,
        size: line.size,
        availableQuantity: 0,
        pendingPickupQuantity: pendingQty,
        deliveredQuantity: deliveredQty,
        netAfterPending: -pendingQty,
      });
    }

    return rows;
  });

  readonly filteredStockRows = computed<readonly StockVariantSummaryRow[]>(() => {
    const itemIdFilter = this.stockFilterItemId();
    const genderFilter = this.stockFilterGender();
    return this.allStockVariantRows().filter((r) => {
      if (itemIdFilter !== 'ALL' && r.catalogItemId !== itemIdFilter) {
        return false;
      }
      if (genderFilter !== 'ALL' && r.gender !== genderFilter) {
        return false;
      }
      return true;
    });
  });

  readonly lowStockVariantsCount = computed<number>(() =>
    this.allStockVariantRows().filter((r) => r.availableQuantity <= 5).length
  );

  readonly displayedLines = computed<readonly B2cOrderLineResponse[]>(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return [];
    }
    if (this.workflowStore.activeB2cSubView() === 'ORDERS') {
      return order.lines;
    }
    return order.lines.slice(0, 10);
  });

  readonly checkedItemsCount = computed<number>(() => {
    const map = this.itemSelections();
    return this.workflowStore.catalogItems().filter((i) => map[i.id]?.checked).length;
  });

  readonly totalSelectedUnits = computed<number>(() => {
    const map = this.itemSelections();
    return this.workflowStore
      .catalogItems()
      .filter((i) => map[i.id]?.checked)
      .reduce((sum, i) => sum + (map[i.id]?.quantity ?? 1), 0);
  });

  readonly computedLineCashAmount = computed<number>(() => {
    const map = this.itemSelections();
    const total = this.workflowStore
      .catalogItems()
      .filter((i) => map[i.id]?.checked)
      .reduce((sum, i) => sum + i.b2cUnitPrice * (map[i.id]?.quantity ?? 1), 0);
    return Math.round(total * 100) / 100;
  });

  readonly showCashSaleModal = signal<boolean>(false);
  readonly cashPaymentConfirmed = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  readonly clientSections = computed<readonly ClientSectionResponse[]>(
    () => this.workflowStore.selectedClient()?.sections ?? []
  );

  readonly lineForm = new FormGroup({
    sectionId: new FormControl<string>('', { nonNullable: true }),
    sectionName: new FormControl<string>('', { nonNullable: true }),
    buyerFullName: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    buyerPhone: new FormControl<string>('', {
      nonNullable: true,
    }),
    buyerEmail: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.email],
    }),
  });

  selectedClientSection(): ClientSectionResponse | null {
    const id = this.lineForm.controls.sectionId.value;
    if (!id) {
      return null;
    }
    return this.clientSections().find((s) => s.id === id) ?? null;
  }

  getOrderedCountForSection(section: ClientSectionResponse): number {
    return this.buyerPackages().filter((pkg) => {
      const firstLine = pkg.lines[0];
      if (!firstLine) {
        return false;
      }
      return (
        (firstLine.sectionId && firstLine.sectionId === section.id) ||
        (!firstLine.sectionId &&
          pkg.sectionName &&
          pkg.sectionName.trim().toLowerCase() === section.name.trim().toLowerCase())
      );
    }).length;
  }

  getRemainingCapacityForSection(section: ClientSectionResponse): number {
    return Math.max(0, section.capacity - this.getOrderedCountForSection(section));
  }

  getSectionProgressPct(section: ClientSectionResponse): number {
    if (section.capacity <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((this.getOrderedCountForSection(section) / section.capacity) * 100));
  }

  isSectionSelectionValid(): boolean {
    if (this.clientSections().length > 0) {
      return this.lineForm.controls.sectionId.value.trim().length > 0;
    }
    return this.lineForm.controls.sectionName.value.trim().length > 0;
  }

  constructor() {
    effect(() => {
      if (this.workflowStore.cashSaleModalOpen()) {
        this.openNewCashSaleModal();
        this.workflowStore.setCashSaleModalOpen(false);
      }
    });
  }

  resolveCatalogItemName(catalogItemId: string): string {
    const found = this.workflowStore.catalogItems().find((i) => i.id === catalogItemId);
    return found ? found.name : 'Tenue scolaire';
  }

  toggleShowAll(): void {
    const next = this.workflowStore.activeB2cSubView() === 'ORDERS' ? 'DASHBOARD' : 'ORDERS';
    this.workflowStore.navigateToB2cSubView(next);
  }

  confirmDeliveryFromDetail(lineId: string): void {
    this.selectedLineDetail.set(null);
    this.workflowStore.deliverB2cLine(lineId);
  }

  getBuyerLinesForDetail(detailLine: B2cOrderLineResponse): readonly B2cOrderLineResponse[] {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return [detailLine];
    }
    const lines = this.workflowStore.getBuyerLinesFromOrder(order, detailLine);
    return lines.length > 0 ? lines : [detailLine];
  }

  getBuyerTotalCash(lines: readonly B2cOrderLineResponse[]): number {
    return lines.reduce((sum, l) => sum + Number(l.lineCashAmount || 0), 0);
  }

  areAllBuyerLinesDelivered(lines: readonly B2cOrderLineResponse[]): boolean {
    return lines.length > 0 && lines.every((l) => l.lineStatus === 'DELIVERED');
  }

  confirmBuyerPackageDeliveryFromDetail(lines: readonly B2cOrderLineResponse[]): void {
    this.selectedLineDetail.set(null);
    this.workflowStore.deliverBuyerPackage(lines);
  }

  confirmResetCashCounter(): void {
    const metrics = this.cashCounterMetrics();
    this.workflowStore.resetActiveClientCashCounter(
      metrics.cashAmount,
      metrics.clientsCount,
      metrics.unitsCount,
      () => this.showResetCashCounterModal.set(false)
    );
  }

  openDeleteBuyerPackageModal(pkg: {
    readonly buyerFullName: string;
    readonly receiptNumberLabel: string;
    readonly sectionName: string | null;
    readonly totalQuantity: number;
    readonly totalCashAmount: number;
    readonly lines: readonly B2cOrderLineResponse[];
  }): void {
    this.buyerPackageToDelete.set(pkg);
  }

  requestDeleteBuyerLinesFromDetail(lines: readonly B2cOrderLineResponse[]): void {
    if (lines.length === 0) {
      return;
    }
    const first = lines[0];
    const totalQuantity = lines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
    const totalCashAmount = lines.reduce((sum, l) => sum + Number(l.lineCashAmount || 0), 0);
    const receiptNumberLabel =
      lines.length <= 1 ? first.receiptNumber : `${first.receiptNumber} (+${lines.length - 1})`;
    this.selectedLineDetail.set(null);
    this.buyerPackageToDelete.set({
      buyerFullName: first.buyerFullName,
      receiptNumberLabel,
      sectionName: first.sectionName ?? null,
      totalQuantity,
      totalCashAmount,
      lines,
    });
  }

  confirmDeleteBuyerPackage(): void {
    const target = this.buyerPackageToDelete();
    if (!target) {
      return;
    }
    this.workflowStore.deleteBuyerPackage(target.lines, () => {
      this.buyerPackageToDelete.set(null);
    });
  }

  confirmDeleteGlobalOrder(): void {
    const target = this.orderSummaryToDelete();
    if (!target) {
      return;
    }
    this.workflowStore.deleteB2cOrderById(target.id, () => {
      this.orderSummaryToDelete.set(null);
    });
  }

  openStockAdjustModal(): void {
    const defaultItem = this.workflowStore.catalogItems()[0];
    const defaultItemId = defaultItem?.id ?? '';
    this.adjustCatalogItemId.set(defaultItemId);
    this.adjustGender.set('KIDS');
    const allowed = getAllowedSizesForCatalogItem(
      defaultItem,
      'KIDS',
      this.workflowStore.selectedClient()?.clientType
    );
    const defaultSize = allowed[0] ?? 'AGE_10';
    this.adjustSize.set(defaultSize);
    const currentStock = defaultItemId
      ? this.workflowStore.getAvailableStock(defaultItemId, 'KIDS', defaultSize)
      : 20;
    this.stockAdjustForm.reset({
      catalogItemId: defaultItemId,
      availableQuantity: currentStock,
    });
    this.showStockAdjustModal.set(true);
  }

  openStockAdjustModalForRow(row: StockVariantSummaryRow): void {
    const effectiveGender: Gender = this.isPrimarySchoolClient() ? 'KIDS' : row.gender;
    this.adjustCatalogItemId.set(row.catalogItemId);
    this.adjustGender.set(effectiveGender);
    this.adjustSize.set(row.size);
    this.stockAdjustForm.reset({
      catalogItemId: row.catalogItemId,
      availableQuantity: row.availableQuantity,
    });
    this.showStockAdjustModal.set(true);
  }

  getStockRowActions(row: StockVariantSummaryRow): readonly TableActionItem[] {
    return [
      {
        label: 'Ajuster la quantité en stock',
        icon: '📦',
        variant: 'primary',
        onSelect: () => this.openStockAdjustModalForRow(row),
      },
      {
        label: 'Réception rapide (+10 unités)',
        icon: '➕',
        variant: 'success',
        onSelect: () =>
          this.workflowStore.upsertClientStock({
            catalogItemId: row.catalogItemId,
            gender: row.gender,
            size: row.size,
            availableQuantity: row.availableQuantity + 10,
          }),
      },
    ];
  }

  onAdjustGenderChange(gender: Gender): void {
    const effectiveGender: Gender = this.isPrimarySchoolClient() ? 'KIDS' : gender;
    this.adjustGender.set(effectiveGender);
    const itemId = this.stockAdjustForm.controls.catalogItemId.value;
    this.adjustCatalogItemId.set(itemId);
    const item = this.workflowStore.catalogItems().find((i) => i.id === itemId);
    const firstAllowedSize =
      getAllowedSizesForCatalogItem(
        item,
        effectiveGender,
        this.workflowStore.selectedClient()?.clientType
      )[0] ?? 'AGE_10';
    this.adjustSize.set(firstAllowedSize);
    if (itemId) {
      this.stockAdjustForm.controls.availableQuantity.setValue(
        this.workflowStore.getAvailableStock(itemId, effectiveGender, firstAllowedSize)
      );
    }
  }

  onAdjustSizeChange(size: Size): void {
    this.adjustSize.set(size);
    const itemId = this.stockAdjustForm.controls.catalogItemId.value;
    if (itemId) {
      this.stockAdjustForm.controls.availableQuantity.setValue(
        this.workflowStore.getAvailableStock(itemId, this.adjustGender(), size)
      );
    }
  }

  submitStockAdjust(): void {
    this.stockAdjustForm.markAllAsTouched();
    if (this.stockAdjustForm.invalid) {
      return;
    }
    const raw = this.stockAdjustForm.getRawValue();
    this.workflowStore.upsertClientStock(
      {
        catalogItemId: raw.catalogItemId,
        gender: this.adjustGender(),
        size: this.adjustSize(),
        availableQuantity: raw.availableQuantity,
      },
      () => this.showStockAdjustModal.set(false)
    );
  }

  getItemSelection(catalogItemId: string): ProductOrderSelection {
    const item = this.workflowStore.catalogItems().find((i) => i.id === catalogItemId);
    const clientType = this.workflowStore.selectedClient()?.clientType;
    const existing = this.itemSelections()[catalogItemId];
    if (existing) {
      if (this.isPrimarySchoolClient() && existing.gender !== 'KIDS') {
        const allowedForKids = getAllowedSizesForCatalogItem(item, 'KIDS', clientType);
        return {
          ...existing,
          gender: 'KIDS',
          size: allowedForKids.includes(existing.size) ? existing.size : (allowedForKids[0] ?? 'AGE_10'),
        };
      }
      return existing;
    }
    const defaultGender: Gender = 'KIDS';
    const allowed = getAllowedSizesForCatalogItem(item, defaultGender, clientType);
    const defaultSize: Size = allowed[0] ?? 'AGE_10';
    return {
      checked: false,
      gender: defaultGender,
      size: defaultSize,
      quantity: 1,
    };
  }

  getAllowedSizesForItem(catalogItemId: string): readonly Size[] {
    const sel = this.getItemSelection(catalogItemId);
    const item = this.workflowStore.catalogItems().find((i) => i.id === catalogItemId);
    return getAllowedSizesForCatalogItem(
      item,
      sel.gender,
      this.workflowStore.selectedClient()?.clientType
    );
  }

  getAvailableStockForItemSelection(catalogItemId: string): number {
    const sel = this.getItemSelection(catalogItemId);
    return this.workflowStore.getAvailableStock(catalogItemId, sel.gender, sel.size);
  }

  toggleItemChecked(catalogItemId: string, checked: boolean): void {
    const current = this.getItemSelection(catalogItemId);
    this.itemSelections.update((prev) => ({
      ...prev,
      [catalogItemId]: {
        ...current,
        checked,
      },
    }));
  }

  updateItemGender(catalogItemId: string, gender: Gender): void {
    const effectiveGender: Gender = this.isPrimarySchoolClient() ? 'KIDS' : gender;
    const item = this.workflowStore.catalogItems().find((i) => i.id === catalogItemId);
    const allowed = getAllowedSizesForCatalogItem(
      item,
      effectiveGender,
      this.workflowStore.selectedClient()?.clientType
    );
    const current = this.getItemSelection(catalogItemId);
    const nextSize: Size = allowed.includes(current.size) ? current.size : (allowed[0] ?? 'AGE_10');
    this.itemSelections.update((prev) => ({
      ...prev,
      [catalogItemId]: {
        ...current,
        gender: effectiveGender,
        size: nextSize,
      },
    }));
  }

  updateItemSize(catalogItemId: string, size: Size): void {
    const current = this.getItemSelection(catalogItemId);
    this.itemSelections.update((prev) => ({
      ...prev,
      [catalogItemId]: {
        ...current,
        size,
      },
    }));
  }

  updateItemQuantity(catalogItemId: string, quantity: number): void {
    const current = this.getItemSelection(catalogItemId);
    this.itemSelections.update((prev) => ({
      ...prev,
      [catalogItemId]: {
        ...current,
        quantity: Math.max(1, quantity),
      },
    }));
  }

  isInvalid(controlName: 'buyerFullName' | 'buyerPhone' | 'buyerEmail'): boolean {
    const control = this.lineForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.submitted());
  }

  openNewCashSaleModal(): void {
    const items = this.workflowStore.catalogItems();
    const clientType = this.workflowStore.selectedClient()?.clientType;
    const initialMap: Record<string, ProductOrderSelection> = {};
    const defaultGender: Gender = 'KIDS';
    items.forEach((item, index) => {
      const allowed = getAllowedSizesForCatalogItem(item, defaultGender, clientType);
      const defaultSize: Size = allowed[0] ?? 'AGE_10';
      initialMap[item.id] = {
        checked: index === 0,
        gender: defaultGender,
        size: defaultSize,
        quantity: 1,
      };
    });
    this.itemSelections.set(initialMap);
    this.cashPaymentConfirmed.set(false);
    this.submitted.set(false);
    const firstSectionId = this.clientSections()[0]?.id ?? '';
    this.lineForm.reset({
      sectionId: firstSectionId,
      sectionName: '',
      buyerFullName: '',
      buyerPhone: '',
      buyerEmail: '',
    });
    this.showCashSaleModal.set(true);
  }

  closeCashSaleModal(): void {
    this.showCashSaleModal.set(false);
    this.workflowStore.setCashSaleModalOpen(false);
  }

  confirmAndSubmitCashOrderLine(): void {
    this.submitted.set(true);
    this.lineForm.markAllAsTouched();
    if (
      this.lineForm.invalid ||
      !this.isSectionSelectionValid() ||
      !this.cashPaymentConfirmed() ||
      this.checkedItemsCount() === 0
    ) {
      return;
    }
    const raw = this.lineForm.getRawValue();
    const chosenSection = this.selectedClientSection();
    const resolvedSectionId = chosenSection ? chosenSection.id : null;
    const resolvedSectionName = chosenSection
      ? chosenSection.name
      : raw.sectionName.trim() || null;

    const map = this.itemSelections();
    const payloads: AddB2cOrderLineRequest[] = this.workflowStore
      .catalogItems()
      .filter((item) => map[item.id]?.checked)
      .map((item) => {
        const sel = this.getItemSelection(item.id);
        return {
          catalogItemId: item.id,
          sectionId: resolvedSectionId,
          sectionName: resolvedSectionName,
          buyerFullName: raw.buyerFullName,
          buyerPhone: raw.buyerPhone,
          buyerEmail: raw.buyerEmail,
          gender: sel.gender,
          size: sel.size,
          quantity: Math.max(1, sel.quantity),
          cashPaymentConfirmed: true,
          irreversibilityAcknowledged: true,
        };
      });
    this.closeCashSaleModal();
    this.workflowStore.addMultipleCashLines(payloads);
  }
}
