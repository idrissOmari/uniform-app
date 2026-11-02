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
    B2cLinePickupRowComponent,
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
        <!-- EN-TÊTE INFORMATIONS DE L'ÉTABLISSEMENT + IMPRESSION FLYER CATALOGUE -->
        <!-- (Pour l'Opérateur Comptoir ; l'Admin dispose de la barre d'établissement globale) -->
        <!-- =================================================================== -->
        @if (!authStore.isAdmin() && workflowStore.selectedClient(); as activeEstablishment) {
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 sm:px-6 sm:py-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div class="space-y-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Établissement :
                </span>
                <h2 class="text-base font-extrabold text-slate-900">
                  {{ activeEstablishment.name }}
                </h2>
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
                  {{ recentLines.length }} ligne(s) ajoutée(s) · N° {{ recentLines[0].receiptNumber }} · Le justificatif d'achat officiel est prêt à être imprimé.
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
              @if (order.lines.length > 0) {
                <button
                  type="button"
                  class="rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 cursor-pointer"
                  (click)="workflowStore.downloadPackingListPdf(order.id)"
                >
                  📋 PDF Reconstitution par Client
                </button>
              }

              @if (order.status === 'IN_PROGRESS') {
                <button
                  type="button"
                  class="ui-btn-emerald w-full sm:w-auto"
                  (click)="openNewCashSaleModal()"
                >
                  + Saisir une commande client
                </button>
              }

              @if (authStore.isAdmin()) {
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

          <!-- 3 INDICATEURS ESSENTIELS (SANS STOCK POUR L'OPÉRATEUR) -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="text-xs font-medium text-slate-400">Volume de la commande globale</div>
              <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {{ order.totalQuantity }} article(s) · {{ order.lines.length }} ligne(s)
              </div>
              <div class="mt-1.5 text-xs font-semibold text-[#16803c]">
                Articles commandés pour {{ workflowStore.selectedClient()?.name }}
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
              <div class="text-xs font-medium text-slate-400">Suivi de la distribution</div>
              <div class="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {{ deliveredCount() }} / {{ order.lines.length }} distribuée(s)
              </div>
              <div class="mt-1.5 text-xs font-medium text-amber-700">
                {{ pendingPickupCount() }} ligne(s) en attente de remise
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
                    Chaque ligne ajoutée à la commande globale décrémente automatiquement le compteur de la section impactée.
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

          <!-- CARTE TABLEAU COMMANDE GLOBALE (LIGNES & RECONSTITUTION PAR CLIENT FINAL) -->
          @defer {
            <div class="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
              <div class="flex flex-wrap items-center justify-between gap-4 pb-5">
                <div class="flex flex-wrap items-center gap-3">
                  <h3 class="text-base font-bold text-slate-900">
                    Contenu de la Commande Globale
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
                  <div class="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                    <button
                      type="button"
                      class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                      [class.bg-indigo-600]="!groupByBuyerView()"
                      [class.text-white]="!groupByBuyerView()"
                      [class.shadow-xs]="!groupByBuyerView()"
                      [class.text-slate-600]="groupByBuyerView()"
                      (click)="groupByBuyerView.set(false)"
                    >
                      Lignes détaillées ({{ order.lines.length }})
                    </button>
                    <button
                      type="button"
                      class="rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                      [class.bg-indigo-600]="groupByBuyerView()"
                      [class.text-white]="groupByBuyerView()"
                      [class.shadow-xs]="groupByBuyerView()"
                      [class.text-slate-600]="!groupByBuyerView()"
                      (click)="groupByBuyerView.set(true)"
                    >
                      Reconstitution par client ({{ buyerPackages().length }})
                    </button>
                  </div>

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

              @if (groupByBuyerView()) {
                <!-- VUE RECONSTITUTION PAR CLIENT FINAL (Ex: Client A : 3 Polo M, 1 Chemise M) -->
                <div class="space-y-3">
                  @for (pkg of buyerPackages(); track pkg.buyerKey) {
                    <div class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-[#f8fafc] p-4">
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-sm font-bold text-slate-900">{{ pkg.buyerFullName }}</span>
                          <span class="text-xs text-slate-500">({{ pkg.buyerPhone }})</span>
                          @if (pkg.sectionName) {
                            <span class="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#163672]">
                              Section : {{ pkg.sectionName }}
                            </span>
                          }
                        </div>
                        <div class="mt-1.5 text-sm font-semibold text-[#163672]">
                          {{ pkg.summaryText }}
                        </div>
                      </div>

                      <div class="flex flex-wrap items-center gap-3">
                        <span class="text-xs font-bold text-slate-600">
                          {{ pkg.totalQuantity }} art. · {{ pkg.totalCashAmount | number: '1.0-2' }} DH
                        </span>
                        <span
                          class="rounded-full px-3 py-1 text-xs font-bold"
                          [class.bg-[#dcfce7]]="pkg.allDelivered"
                          [class.text-[#15803d]]="pkg.allDelivered"
                          [class.bg-[#fef3c7]]="!pkg.allDelivered"
                          [class.text-[#92400e]]="!pkg.allDelivered"
                        >
                          {{ pkg.allDelivered ? 'Colis remis' : 'À distribuer' }}
                        </span>
                        <button
                          type="button"
                          class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-[#163672] shadow-2xs transition hover:bg-indigo-50 cursor-pointer"
                          (click)="workflowStore.downloadBuyerPackageReceiptPdf(pkg.lines)"
                        >
                          🖨️ Justificatif d'achat (PDF)
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="py-10 text-center text-sm text-slate-400">
                      Aucun client inclus dans cette commande globale.
                    </div>
                  }
                </div>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="border-b border-slate-200/80 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th class="px-4 py-3.5">Reçu N°</th>
                        <th class="px-4 py-3.5">Client Final & Section</th>
                        <th class="px-4 py-3.5">Produit · Taille · Quantité</th>
                        <th class="px-4 py-3.5">Montant Payé</th>
                        <th class="px-4 py-3.5">Distribution</th>
                        <th class="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (line of order.lines; track line.id) {
                        <tr
                          app-b2c-line-pickup-row
                          [line]="line"
                          [itemName]="resolveCatalogItemName(line.catalogItemId)"
                          [parentOrderInDelivery]="order.status === 'IN_DELIVERY'"
                          (detailRequested)="selectedLineDetail.set($event)"
                          (receiptDownloadRequested)="workflowStore.downloadLineReceiptPdf($event)"
                          (buyerReceiptDownloadRequested)="workflowStore.downloadBuyerReceiptForLine($event)"
                          (deliveryConfirmed)="workflowStore.deliverB2cLine($event)"
                        ></tr>
                      } @empty {
                        <tr>
                          <td colspan="6" class="px-4 py-12 text-center text-sm text-slate-400">
                            {{ 'b2c.emptyLines' | t }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
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
      <!-- POPIN (Modale) "Afficher détail" d'une commande parent               -->
      <!-- =================================================================== -->
      @if (selectedLineDetail(); as detailLine) {
        <div class="ui-modal-backdrop">
          <div class="ui-modal-panel max-w-lg">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900">
                  Détail de la commande {{ detailLine.receiptNumber }}
                </h3>
                <p class="text-xs text-slate-500">
                  Lot école : {{ workflowStore.activeB2cOrder()?.orderNumber }}
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
                  <div class="text-xs text-slate-400">Téléphone (Maroc)</div>
                  <div class="mt-0.5 font-semibold text-slate-800">{{ detailLine.buyerPhone }}</div>
                </div>
                <div class="col-span-2">
                  <div class="text-xs text-slate-400">Email</div>
                  <div class="mt-0.5 text-slate-700">{{ detailLine.buyerEmail }}</div>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200/80 p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-400">Section / Classe</span>
                  <span class="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-[#163672]">
                    {{ detailLine.sectionName || 'Non renseignée' }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-400">Article commandé</span>
                  <span class="font-bold text-slate-900">{{ resolveCatalogItemName(detailLine.catalogItemId) }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-400">Coupe & Taille</span>
                  <span class="font-semibold text-slate-800">
                    {{ ('gender.' + detailLine.gender) | t }} — {{ ('size.' + detailLine.size) | t }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-400">Quantité commandée</span>
                  <span class="font-bold text-slate-900">{{ detailLine.quantity }} unité(s)</span>
                </div>
                @if (authStore.isAdmin()) {
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-400">Stock disponible (cette taille)</span>
                    <span class="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      {{ workflowStore.getAvailableStock(detailLine.catalogItemId, detailLine.gender, detailLine.size) }} unité(s) en stock
                    </span>
                  </div>
                }
                <div class="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span class="text-xs font-bold uppercase text-slate-500">Total payé en espèces</span>
                  <span class="text-base font-extrabold text-[#15803d]">
                    {{ detailLine.lineCashAmount | number: '1.2-2' }} DH
                  </span>
                </div>
              </div>

              <div class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span class="text-xs font-semibold text-slate-600">Statut de distribution :</span>
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold"
                  [class.bg-[#fef3c7]]="detailLine.lineStatus === 'PENDING_PICKUP'"
                  [class.text-[#92400e]]="detailLine.lineStatus === 'PENDING_PICKUP'"
                  [class.bg-[#dcfce7]]="detailLine.lineStatus === 'DELIVERED'"
                  [class.text-[#15803d]]="detailLine.lineStatus === 'DELIVERED'"
                >
                  {{ detailLine.lineStatus === 'DELIVERED' ? 'Distribuée au client' : 'En attente de distribution' }}
                </span>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-2 text-xs font-bold text-[#163672] hover:bg-indigo-100 cursor-pointer"
                (click)="workflowStore.downloadBuyerReceiptForLine(detailLine.id)"
              >
                🖨️ Imprimer le Justificatif d'achat du client (PDF)
              </button>

              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                (click)="workflowStore.downloadLineReceiptPdf(detailLine.id)"
              >
                📄 Reçu de cet article seul (PDF)
              </button>

              @if (workflowStore.activeB2cOrder()?.status === 'IN_DELIVERY' && detailLine.lineStatus === 'PENDING_PICKUP') {
                <button
                  type="button"
                  class="rounded-xl bg-[#16803c] px-4 py-2 text-xs font-bold text-white hover:bg-[#146c32] cursor-pointer"
                  (click)="confirmDeliveryFromDetail(detailLine.id)"
                >
                  Confirmer la remise au client
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
      summaryText: `${g.buyerFullName} : ${g.items.join(', ')}`,
    }));
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

  readonly pendingPickupCount = computed<number>(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return 0;
    }
    return order.lines.filter((l) => l.lineStatus === 'PENDING_PICKUP').length;
  });

  readonly deliveredCount = computed<number>(() => {
    const order = this.workflowStore.activeB2cOrder();
    if (!order) {
      return 0;
    }
    return order.lines.filter((l) => l.lineStatus === 'DELIVERED').length;
  });

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
    const lines = this.workflowStore.activeB2cOrder()?.lines ?? [];
    return lines.filter(
      (l) =>
        (l.sectionId && l.sectionId === section.id) ||
        (!l.sectionId &&
          l.sectionName &&
          l.sectionName.trim().toLowerCase() === section.name.trim().toLowerCase())
    ).length;
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
