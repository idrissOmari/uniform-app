import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/i18n.service';
import { ALL_PRODUCT_TYPES } from '../../core/models/uniform.models';
import { UniformWorkflowStore } from '../../core/services/uniform-workflow.store';

@Component({
  selector: 'app-admin-establishment-hub',
  standalone: true,
  imports: [DecimalPipe, DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      @if (workflowStore.selectedClient(); as activeClient) {
        <!-- ACCÈS RAPIDES BENTO 2026 AUX RUBRIQUES DE L'ÉTABLISSEMENT SÉLECTIONNÉ -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <!-- 1. Commandes de l'établissement -->
          <div class="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_12px_28px_-6px_rgba(79,70,229,0.12)]">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-lg ring-1 ring-indigo-500/20">
                  🛍️
                </span>
                <span class="rounded-full bg-indigo-50 ring-1 ring-inset ring-indigo-200/70 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700">
                  {{ workflowStore.b2cOrders().length }} commande(s)
                </span>
              </div>
              <h3 class="mt-4 text-base font-extrabold text-slate-900">
                Commandes de l'établissement
              </h3>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed">
                Saisir des commandes élèves, suivre l'avancement par section, lancer la fabrication ou distribuer les tenues.
              </p>
              @if (workflowStore.activeB2cOrder(); as activeOrder) {
                <div class="mt-3 rounded-xl border border-indigo-100/80 bg-indigo-50/40 px-3 py-2 text-xs">
                  <div class="font-bold text-slate-900">{{ activeOrder.orderNumber }}</div>
                  <div class="text-slate-500">
                    {{ activeOrder.totalQuantity }} article(s) ·
                    <span class="font-extrabold text-emerald-600">
                      {{ activeOrder.totalCashAmount | number: '1.2-2' }} DH
                    </span>
                  </div>
                </div>
              }
            </div>
            <button
              type="button"
              (click)="openOrders()"
              class="ui-btn-primary mt-4 w-full !text-xs"
            >
              Voir les commandes →
            </button>
          </div>

          <!-- 2. Catalogue Produits & Flyer -->
          <div class="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_12px_28px_-6px_rgba(139,92,246,0.12)]">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-lg ring-1 ring-violet-500/20">
                  👕
                </span>
                <span class="rounded-full bg-violet-50 ring-1 ring-inset ring-violet-200/70 px-2.5 py-0.5 text-xs font-extrabold text-violet-700">
                  {{ workflowStore.adminCatalogItems().length }} produit(s)
                </span>
              </div>
              <h3 class="mt-4 text-base font-extrabold text-slate-900">
                Catalogue Produits &amp; Flyer
              </h3>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed">
                Définir les produits disponibles à la vente pour {{ activeClient.name }}, leurs prix, tailles et fournisseurs rattachés.
              </p>
            </div>
            <div class="mt-4 flex flex-col gap-2">
              <button
                type="button"
                (click)="openCatalog()"
                class="ui-btn-primary w-full !text-xs"
              >
                Catalogue produits →
              </button>
              <button
                type="button"
                (click)="workflowStore.downloadCatalogFlyerPdf()"
                class="w-full rounded-xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100/70 cursor-pointer"
              >
                🖨️ Imprimer Flyer
              </button>
            </div>
          </div>

          <!-- 3. Bons de Commande Fournisseurs -->
          <div class="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_12px_28px_-6px_rgba(245,158,11,0.12)]">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-lg ring-1 ring-amber-500/20">
                  📋
                </span>
                <span class="rounded-full bg-amber-50 ring-1 ring-inset ring-amber-200/70 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                  {{ workflowStore.b2bPurchaseOrders().length }} BC fournisseur(s)
                </span>
              </div>
              <h3 class="mt-4 text-base font-extrabold text-slate-900">
                Bons de Commande
              </h3>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed">
                Éditer les bons de commande par fournisseur, suivre la fabrication et valider la réception des marchandises.
              </p>
            </div>
            <button
              type="button"
              (click)="openB2bOrders()"
              class="ui-btn-primary mt-4 w-full !text-xs"
            >
              Bons de commande →
            </button>
          </div>

          <!-- 4. Stock de l'établissement -->
          <div class="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.12)]">
            <div>
              <div class="flex items-center justify-between">
                <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-lg ring-1 ring-emerald-500/20">
                  📦
                </span>
                <span class="rounded-full bg-emerald-50 ring-1 ring-inset ring-emerald-200/70 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                  {{ totalEstablishmentStock() }} unité(s)
                </span>
              </div>
              <h3 class="mt-4 text-base font-extrabold text-slate-900">
                Stock de l'établissement
              </h3>
              <p class="mt-1 text-xs text-slate-500 leading-relaxed">
                Consulter et ajuster les quantités disponibles en stock pour {{ activeClient.name }} par produit et par taille.
              </p>
            </div>
            <button
              type="button"
              (click)="openEstablishmentStock()"
              class="ui-btn-emerald mt-4 w-full !text-xs"
            >
              Stock de l'établissement →
            </button>
          </div>
        </div>

        <!-- APERÇU SYNTHÉTIQUE DE L'ÉTABLISSEMENT (Catalogue & Bons de commande) -->
        <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
          <!-- Aperçu Catalogue de l'établissement -->
          <div class="lg:col-span-7 ui-card p-4 sm:p-6">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-extrabold text-slate-900">
                  Produits du catalogue — {{ activeClient.name }}
                </h3>
                <p class="text-xs text-slate-500">
                  {{ workflowStore.adminCatalogItems().length }} référence(s) configurée(s)
                </p>
              </div>
              <button
                type="button"
                (click)="openCatalog()"
                class="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Tout gérer →
              </button>
            </div>

            <div class="mt-4 divide-y divide-slate-100">
              @for (item of workflowStore.adminCatalogItems().slice(0, 5); track item.id) {
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-md bg-indigo-50 ring-1 ring-inset ring-indigo-200/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {{ resolveProductTypeLabel(item.productType) }}
                      </span>
                      <span class="font-bold text-slate-900">{{ item.name }}</span>
                    </div>
                    <div class="mt-0.5 text-slate-500">
                      Fournisseur : <span class="font-semibold text-slate-700">{{ item.supplierName }}</span> · Coloris : {{ item.colorReference }}
                    </div>
                  </div>
                  <div class="flex sm:block items-center justify-between sm:text-right shrink-0">
                    <div class="font-extrabold text-emerald-600">{{ item.b2cUnitPrice | number: '1.2-2' }} DH</div>
                    <div class="text-[11px] text-slate-400">Achat : {{ item.b2bUnitCost | number: '1.2-2' }} DH</div>
                  </div>
                </div>
              } @empty {
                <p class="py-6 text-center text-xs text-slate-400">
                  Aucun produit configuré pour cet établissement.
                </p>
              }
            </div>
          </div>

          <!-- Aperçu des Bons de Commande Fournisseurs -->
          <div class="lg:col-span-5 ui-card p-4 sm:p-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 class="text-sm font-extrabold text-slate-900">
                  Bons de Commande Fournisseurs
                </h3>
                <p class="text-xs text-slate-500">
                  Suivi de fabrication et arrivages
                </p>
              </div>
              <button
                type="button"
                (click)="openB2bOrders()"
                class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Voir tout →
              </button>
            </div>

            <div class="mt-4 divide-y divide-slate-100">
              @for (po of workflowStore.b2bPurchaseOrders().slice(0, 5); track po.id) {
                <div class="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <div class="font-bold text-slate-900">{{ po.poNumber }}</div>
                    <div class="text-slate-500">
                      🏭 {{ po.supplierName || 'Fournisseur' }} · {{ po.createdAt | date: 'dd/MM/yyyy' }}
                    </div>
                  </div>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    [class.bg-emerald-100]="po.status === 'RECEIVED'"
                    [class.text-emerald-800]="po.status === 'RECEIVED'"
                    [class.bg-amber-100]="po.status !== 'RECEIVED'"
                    [class.text-amber-800]="po.status !== 'RECEIVED'"
                  >
                    {{ ('b2bStatus.' + po.status) | t }}
                  </span>
                </div>
              } @empty {
                <p class="py-6 text-center text-xs text-slate-400">
                  Aucun bon de commande fournisseur émis pour cet établissement.
                </p>
              }
            </div>
          </div>
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
              Créez votre premier établissement scolaire pour accéder à son espace de pilotage (commandes, catalogue produits, bons de commande et stock).
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
export class AdminEstablishmentHubComponent {
  readonly workflowStore = inject(UniformWorkflowStore);
  private readonly router = inject(Router);

  readonly totalEstablishmentStock = computed(() =>
    this.workflowStore.stocks().reduce((sum, s) => sum + s.availableQuantity, 0)
  );

  openOrders(): void {
    this.workflowStore.navigateToB2cSubView('DASHBOARD');
  }

  openCatalog(): void {
    void this.router.navigate(['/admin/catalog']);
  }

  openB2bOrders(): void {
    void this.router.navigate(['/b2b']);
  }

  openEstablishmentStock(): void {
    this.workflowStore.navigateToB2cSubView('STOCK');
  }

  openClientsManagement(): void {
    void this.router.navigate(['/admin/clients']);
  }

  openSuppliersManagement(): void {
    void this.router.navigate(['/admin/suppliers']);
  }

  resolveProductTypeLabel(productType?: string | null): string {
    if (!productType) {
      return 'Polo';
    }
    const found = ALL_PRODUCT_TYPES.find((p) => p.code === productType.toUpperCase());
    return found ? found.label : productType;
  }
}
