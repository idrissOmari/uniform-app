import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStore } from './core/auth/auth.store';
import { TranslatePipe } from './core/i18n/i18n.service';
import { UniformWorkflowStore } from './core/services/uniform-workflow.store';
import { isImageUrl } from './core/utils/image-upload.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authStore.isAuthenticated()) {
      <div class="flex min-h-screen text-slate-900">
        <!-- =============================================================== -->
        <!-- TIROIR MOBILE & TABLETTE (Slide-Over Drawer < lg)               -->
        <!-- =============================================================== -->
        @if (mobileMenuOpen()) {
          <div
            class="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs transition-opacity lg:hidden"
            (click)="closeMobileMenu()"
          ></div>

          <aside
            class="fixed inset-y-0 left-0 z-50 flex w-[285px] max-w-[85vw] flex-col justify-between bg-[#090d16] bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.22),_transparent_55%)] text-white shadow-2xl border-r border-white/10 select-none lg:hidden"
          >
            <div>
              <!-- En-tête Marque + Bouton Fermer -->
              <div class="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/10">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-base font-extrabold text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] ring-1 ring-white/25">
                    B
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-[15px] font-extrabold tracking-tight leading-tight text-white">
                      {{ 'app.title' | t }}
                    </div>
                    <div class="truncate text-[11px] font-medium text-indigo-300/80">
                      {{ (authStore.isAdmin() ? 'app.subtitleAdmin' : 'app.subtitle') | t }}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="closeMobileMenu()"
                  class="rounded-xl bg-white/10 p-2 text-xs font-bold text-slate-300 hover:bg-white/20 hover:text-white cursor-pointer"
                  aria-label="Fermer le menu"
                >
                  ✕
                </button>
              </div>

              <!-- Liens de navigation mobile -->
              <div class="px-5 pt-5 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-300/60">
                Espace Global
              </div>
              <nav class="mt-1 space-y-1.5 px-3.5">
                @if (authStore.isAdmin()) {
                  <a
                    routerLink="/admin/dashboard"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all"
                    [class.bg-gradient-to-r]="isEstablishmentWorkspaceRoute()"
                    [class.from-indigo-500/25]="isEstablishmentWorkspaceRoute()"
                    [class.to-violet-500/15]="isEstablishmentWorkspaceRoute()"
                    [class.ring-1]="isEstablishmentWorkspaceRoute()"
                    [class.ring-indigo-400/35]="isEstablishmentWorkspaceRoute()"
                    [class.font-semibold]="isEstablishmentWorkspaceRoute()"
                    [class.text-white]="isEstablishmentWorkspaceRoute()"
                    [class.text-slate-300]="!isEstablishmentWorkspaceRoute()"
                    [class.hover:bg-white/5]="!isEstablishmentWorkspaceRoute()"
                  >
                    <span class="text-base leading-none">📊</span>
                    <span>Tableau de Bord</span>
                  </a>

                  <a
                    routerLink="/admin/stocks"
                    routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <span class="text-base leading-none">📦</span>
                    <span>Stock</span>
                  </a>

                  <a
                    routerLink="/admin/clients"
                    routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <span class="text-base leading-none">🏫</span>
                    <span>Établissements</span>
                  </a>

                  <a
                    routerLink="/admin/suppliers"
                    routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <span class="text-base leading-none">🏭</span>
                    <span>Fournisseurs</span>
                  </a>

                  <a
                    routerLink="/admin/users"
                    routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white"
                    (click)="closeMobileMenu()"
                    class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <span class="text-base leading-none">👥</span>
                    <span>Utilisateurs</span>
                  </a>
                } @else {
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all cursor-pointer"
                    [class.bg-gradient-to-r]="isB2cRoute()"
                    [class.from-indigo-500/25]="isB2cRoute()"
                    [class.to-violet-500/15]="isB2cRoute()"
                    [class.ring-1]="isB2cRoute()"
                    [class.ring-indigo-400/35]="isB2cRoute()"
                    [class.font-semibold]="isB2cRoute()"
                    [class.text-white]="isB2cRoute()"
                    [class.text-slate-300]="!isB2cRoute()"
                    (click)="workflowStore.navigateToB2cSubView('DASHBOARD'); closeMobileMenu()"
                  >
                    <span class="text-base leading-none">🛍️</span>
                    <span>Commande Globale</span>
                  </button>

                  @if (!workflowStore.activeB2cOrder() || workflowStore.activeB2cOrder()?.status === 'IN_PROGRESS') {
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/15 ring-1 ring-emerald-400/30 px-4 py-3 text-left text-sm font-semibold text-emerald-200 transition hover:bg-emerald-600/30 hover:text-white cursor-pointer"
                      (click)="workflowStore.openNewOrderModalFromNav(); closeMobileMenu()"
                    >
                      <span class="text-base font-bold leading-none">+</span>
                      <span>{{ 'nav.newOrder' | t }}</span>
                    </button>
                  }
                }
              </nav>
            </div>

            <!-- Profil & Déconnexion mobile -->
            <div class="border-t border-white/10 p-4 space-y-3 bg-white/[0.02]">
              <div class="flex items-center gap-3 px-1">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-xs">
                  {{ userInitials() }}
                </div>
                <div class="min-w-0">
                  <div class="truncate text-xs font-bold text-white">{{ authStore.currentFullName() }}</div>
                  <div class="truncate text-[11px] text-indigo-300/75">
                    {{ authStore.isAdmin() ? 'Admin' : 'Opérateur Comptoir' }}
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-500/20 hover:ring-rose-400/30 hover:text-white cursor-pointer"
                (click)="workflowStore.logout(); closeMobileMenu()"
              >
                <span>{{ 'nav.logout' | t }}</span>
                <span>↪</span>
              </button>
            </div>
          </aside>
        }

        <!-- =============================================================== -->
        <!-- BARRE LATÉRALE FIXE DESKTOP (>= lg) - STYLE OBSIDIAN 2026       -->
        <!-- =============================================================== -->
        <aside
          class="hidden lg:flex lg:w-[265px] lg:shrink-0 lg:flex-col lg:justify-between bg-[#090d16] bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.22),_transparent_55%)] border-r border-slate-800/80 text-white select-none sticky top-0 h-screen"
        >
          <div>
            <!-- En-tête Marque -->
            <div class="flex items-center gap-3.5 px-5 pt-6 pb-5 border-b border-white/10">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-base font-extrabold text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] ring-1 ring-white/25">
                B
              </div>
              <div class="min-w-0">
                <div class="truncate text-[15px] font-extrabold tracking-tight leading-tight text-white">
                  {{ 'app.title' | t }}
                </div>
                <div class="truncate text-[11px] font-medium text-indigo-300/80">
                  {{ (authStore.isAdmin() ? 'app.subtitleAdmin' : 'app.subtitle') | t }}
                </div>
              </div>
            </div>

            <div class="px-5 pt-5 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-indigo-300/60">
              Espace Global
            </div>

            <!-- Menu Latéral Global -->
            <nav class="space-y-1.5 px-3.5">
              @if (authStore.isAdmin()) {
                <!-- Rubrique d'accès au choix et au pilotage d'un établissement -->
                <a
                  routerLink="/admin/dashboard"
                  class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all"
                  [class.bg-gradient-to-r]="isEstablishmentWorkspaceRoute()"
                  [class.from-indigo-500/25]="isEstablishmentWorkspaceRoute()"
                  [class.to-violet-500/15]="isEstablishmentWorkspaceRoute()"
                  [class.ring-1]="isEstablishmentWorkspaceRoute()"
                  [class.ring-indigo-400/35]="isEstablishmentWorkspaceRoute()"
                  [class.font-semibold]="isEstablishmentWorkspaceRoute()"
                  [class.text-white]="isEstablishmentWorkspaceRoute()"
                  [class.shadow-xs]="isEstablishmentWorkspaceRoute()"
                  [class.text-slate-300]="!isEstablishmentWorkspaceRoute()"
                  [class.hover:bg-white/5]="!isEstablishmentWorkspaceRoute()"
                  [class.hover:text-white]="!isEstablishmentWorkspaceRoute()"
                >
                  <span class="text-base leading-none">📊</span>
                  <span>Tableau de Bord</span>
                </a>

                <a
                  routerLink="/admin/stocks"
                  routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white shadow-xs"
                  class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                >
                  <span class="text-base leading-none">📦</span>
                  <span>Stock</span>
                </a>

                <a
                  routerLink="/admin/clients"
                  routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white shadow-xs"
                  class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                >
                  <span class="text-base leading-none">🏫</span>
                  <span>Établissements</span>
                </a>

                <a
                  routerLink="/admin/suppliers"
                  routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white shadow-xs"
                  class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                >
                  <span class="text-base leading-none">🏭</span>
                  <span>Fournisseurs</span>
                </a>

                <a
                  routerLink="/admin/users"
                  routerLinkActive="bg-gradient-to-r from-indigo-500/25 to-violet-500/15 ring-1 ring-indigo-400/35 font-semibold text-white shadow-xs"
                  class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/5 hover:text-white"
                >
                  <span class="text-base leading-none">👥</span>
                  <span>Utilisateurs</span>
                </a>
              } @else {
                <!-- Menu Opérateur Comptoir -->
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all cursor-pointer"
                  [class.bg-gradient-to-r]="isB2cRoute()"
                  [class.from-indigo-500/25]="isB2cRoute()"
                  [class.to-violet-500/15]="isB2cRoute()"
                  [class.ring-1]="isB2cRoute()"
                  [class.ring-indigo-400/35]="isB2cRoute()"
                  [class.font-semibold]="isB2cRoute()"
                  [class.text-white]="isB2cRoute()"
                  [class.text-slate-300]="!isB2cRoute()"
                  [class.hover:bg-white/5]="!isB2cRoute()"
                  (click)="workflowStore.navigateToB2cSubView('DASHBOARD')"
                >
                  <span class="text-base leading-none">🛍️</span>
                  <span>Commande Globale</span>
                </button>

                @if (!workflowStore.activeB2cOrder() || workflowStore.activeB2cOrder()?.status === 'IN_PROGRESS') {
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/15 ring-1 ring-emerald-400/30 px-4 py-3 text-left text-sm font-semibold text-emerald-200 transition hover:bg-emerald-600/30 hover:text-white cursor-pointer"
                    (click)="workflowStore.openNewOrderModalFromNav()"
                  >
                    <span class="text-base font-bold leading-none">+</span>
                    <span>{{ 'nav.newOrder' | t }}</span>
                  </button>
                }
              }
            </nav>
          </div>

          <!-- Pied de barre latérale (Déconnexion) -->
          <div class="border-t border-white/10 p-4 bg-white/[0.02]">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-500/20 hover:ring-rose-400/30 hover:text-white cursor-pointer"
              (click)="workflowStore.logout()"
            >
              <span>{{ 'nav.logout' | t }}</span>
              <span>↪</span>
            </button>
          </div>
        </aside>

        <!-- =============================================================== -->
        <!-- ZONE PRINCIPALE DROITE                                          -->
        <!-- =============================================================== -->
        <div class="flex min-w-0 flex-1 flex-col">
          <!-- En-tête supérieur sticky avec effet Glassmorphism 2026 -->
          <header
            class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/75 bg-white/80 px-4 py-3 sm:px-6 lg:px-8 lg:py-4 backdrop-blur-xl"
          >
            <div class="flex items-center gap-3 min-w-0">
              <!-- Bouton Hamburger Mobile/Tablette -->
              <button
                type="button"
                (click)="toggleMobileMenu()"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:text-indigo-600 lg:hidden cursor-pointer"
                aria-label="Ouvrir le menu de navigation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="h-5 w-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h1 class="truncate text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-slate-900">
                    {{ pageHeaderTitle() }}
                  </h1>
                </div>
                <p class="mt-0.5 flex items-center gap-1.5 truncate text-[11px] sm:text-xs font-medium text-slate-500">
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span class="truncate">
                    {{ isGlobalAdminRoute() ? 'Administration Globale BidLab' : (workflowStore.selectedClient()?.name || 'BidLab') }}
                  </span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              <div class="hidden sm:block text-right">
                <div class="text-sm font-bold text-slate-900">
                  {{ authStore.currentFullName() }}
                </div>
                <div class="text-[11px] font-semibold text-indigo-600">
                  {{ authStore.isAdmin() ? 'Admin' : 'Opérateur Comptoir' }}
                </div>
              </div>
              <div
                class="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-extrabold text-white shadow-[0_2px_10px_-2px_rgba(79,70,229,0.5)] ring-2 ring-indigo-500/20"
              >
                {{ userInitials() }}
              </div>
            </div>
          </header>

          <!-- Contenu de la page -->
          <main class="mx-auto w-full max-w-[1400px] flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 lg:pb-10">
            <!-- ESPACE DE PILOTAGE PAR ÉTABLISSEMENT (affiché uniquement si un établissement est disponible et sélectionné) -->
            @if (authStore.isAdmin() && isEstablishmentWorkspaceRoute() && workflowStore.selectedClient(); as activeClient) {
              <div class="rounded-2xl border border-indigo-100/90 bg-white p-4 sm:p-5 shadow-[0_4px_24px_-4px_rgba(79,70,229,0.08)] space-y-3.5 sm:space-y-4">
                <div class="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
                  <!-- Sélecteur de l'établissement à piloter -->
                  <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                    <label class="text-xs font-extrabold uppercase tracking-wider text-indigo-700 shrink-0">
                      🏫 Établissement :
                    </label>
                    <select
                      class="w-full sm:w-80 rounded-xl border border-indigo-200/90 bg-indigo-50/40 px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-2xs focus:border-indigo-600 focus:bg-white focus:outline-none"
                      [value]="workflowStore.selectedClientId() ?? ''"
                      (change)="workflowStore.selectClient($any($event.target).value)"
                    >
                      @for (client of workflowStore.clients(); track client.id) {
                        <option [value]="client.id">
                          {{ client.name }} ({{ ('clientType.short.' + (client.clientType || 'SECONDARY_SCHOOL')) | t }})
                        </option>
                      }
                    </select>
                  </div>

                  <!-- Informations de l'établissement + Bouton Imprimer Flyer juste à côté -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-violet-50/30 to-white px-3.5 py-2.5 sm:px-4">
                    <div class="flex items-center gap-3 min-w-0">
                      @if (isImageUrl(activeClient.logoStorageKey)) {
                        <img
                          [src]="activeClient.logoStorageKey"
                          [alt]="activeClient.name"
                          class="h-10 w-10 rounded-xl border border-indigo-200 bg-white object-contain p-1 shadow-2xs shrink-0"
                        />
                      }
                      <div class="text-xs min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-extrabold text-slate-900 truncate">{{ activeClient.name }}</span>
                          <span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700">
                            {{ ('clientType.short.' + (activeClient.clientType || 'SECONDARY_SCHOOL')) | t }}
                          </span>
                        </div>
                        <div class="mt-0.5 text-slate-500 truncate">
                          📍 {{ activeClient.address }} ·
                          <span class="font-semibold text-indigo-700">{{ activeClient.sections?.length || 0 }} section(s)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      (click)="workflowStore.downloadCatalogFlyerPdf()"
                      class="ui-btn-primary w-full sm:w-auto shrink-0 !py-2 !text-xs"
                    >
                      🖨️ Imprimer Flyer Catalogue
                    </button>
                  </div>
                </div>

                <!-- Navigation segmentée 2026 entre les rubriques de l'établissement sélectionné -->
                <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100/80 p-1.5">
                  <a
                    routerLink="/admin/dashboard"
                    class="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
                    [class.bg-gradient-to-r]="isDashboardRoute()"
                    [class.from-indigo-600]="isDashboardRoute()"
                    [class.to-violet-600]="isDashboardRoute()"
                    [class.text-white]="isDashboardRoute()"
                    [class.shadow-sm]="isDashboardRoute()"
                    [class.text-slate-600]="!isDashboardRoute()"
                    [class.hover:bg-white/80]="!isDashboardRoute()"
                    [class.hover:text-slate-900]="!isDashboardRoute()"
                  >
                    <span>📊</span>
                    <span>Vue d'ensemble</span>
                  </a>

                  <button
                    type="button"
                    (click)="workflowStore.navigateToB2cSubView('DASHBOARD')"
                    class="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
                    [class.bg-gradient-to-r]="isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK'"
                    [class.from-indigo-600]="isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK'"
                    [class.to-violet-600]="isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK'"
                    [class.text-white]="isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK'"
                    [class.shadow-sm]="isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK'"
                    [class.text-slate-600]="!(isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK')"
                    [class.hover:bg-white/80]="!(isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK')"
                    [class.hover:text-slate-900]="!(isB2cRoute() && workflowStore.activeB2cSubView() !== 'STOCK')"
                  >
                    <span>🛍️</span>
                    <span>Voir les commandes</span>
                  </button>

                  <a
                    routerLink="/admin/catalog"
                    class="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
                    [class.bg-gradient-to-r]="isCatalogRoute()"
                    [class.from-indigo-600]="isCatalogRoute()"
                    [class.to-violet-600]="isCatalogRoute()"
                    [class.text-white]="isCatalogRoute()"
                    [class.shadow-sm]="isCatalogRoute()"
                    [class.text-slate-600]="!isCatalogRoute()"
                    [class.hover:bg-white/80]="!isCatalogRoute()"
                    [class.hover:text-slate-900]="!isCatalogRoute()"
                  >
                    <span>👕</span>
                    <span>Catalogue produits</span>
                  </a>

                  <a
                    routerLink="/b2b"
                    class="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
                    [class.bg-gradient-to-r]="isB2bRoute()"
                    [class.from-indigo-600]="isB2bRoute()"
                    [class.to-violet-600]="isB2bRoute()"
                    [class.text-white]="isB2bRoute()"
                    [class.shadow-sm]="isB2bRoute()"
                    [class.text-slate-600]="!isB2bRoute()"
                    [class.hover:bg-white/80]="!isB2bRoute()"
                    [class.hover:text-slate-900]="!isB2bRoute()"
                  >
                    <span>📋</span>
                    <span>Bons de commande</span>
                  </a>

                  <button
                    type="button"
                    (click)="workflowStore.navigateToB2cSubView('STOCK')"
                    class="inline-flex shrink-0 whitespace-nowrap items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
                    [class.bg-gradient-to-r]="isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK'"
                    [class.from-indigo-600]="isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK'"
                    [class.to-violet-600]="isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK'"
                    [class.text-white]="isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK'"
                    [class.shadow-sm]="isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK'"
                    [class.text-slate-600]="!(isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK')"
                    [class.hover:bg-white/80]="!(isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK')"
                    [class.hover:text-slate-900]="!(isB2cRoute() && workflowStore.activeB2cSubView() === 'STOCK')"
                  >
                    <span>📦</span>
                    <span>Stock de l'établissement ({{ workflowStore.totalAvailableStock() }})</span>
                  </button>
                </div>
              </div>
            }

            @if (authStore.isAdmin() && workflowStore.lastStockNotice(); as stockNotice) {
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-300 bg-emerald-50/90 px-4 py-3 sm:px-5 sm:py-3.5 text-emerald-800 shadow-xs">
                <div class="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
                  <span class="text-base">✓</span>
                  <span>{{ stockNotice }}</span>
                </div>
                <button
                  type="button"
                  class="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                  (click)="workflowStore.clearStockNotice()"
                >
                  {{ 'common.close' | t }}
                </button>
              </div>
            }

            @if (workflowStore.lastProblem(); as problem) {
              <div class="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs">
                <div class="min-w-0">
                  <div class="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Erreur Métier ({{ problem.status }} — {{ ('errorCode.' + problem.errorCode) | t }})
                  </div>
                  <div class="mt-0.5 text-sm font-semibold">{{ problem.title }}</div>
                  <div class="mt-1 text-xs text-rose-800 break-words">{{ problem.detail }}</div>
                </div>
                <button
                  type="button"
                  class="shrink-0 text-xs font-semibold text-rose-700 hover:underline"
                  (click)="workflowStore.clearProblem()"
                >
                  {{ 'common.close' | t }}
                </button>
              </div>
            }

            <router-outlet />
          </main>
        </div>
      </div>
    } @else {
      <!-- Écrans publics (/login, /accept-invitation) -->
      <div class="min-h-screen">
        <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          @if (workflowStore.lastProblem(); as problem) {
            <div class="mx-auto mb-6 max-w-md flex items-start justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs">
              <div>
                <div class="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Erreur ({{ problem.status }})
                </div>
                <div class="mt-0.5 text-sm font-semibold">{{ problem.title }}</div>
                <div class="mt-1 text-xs text-rose-800">{{ problem.detail }}</div>
              </div>
              <button
                type="button"
                class="text-xs font-semibold text-rose-700 hover:underline"
                (click)="workflowStore.clearProblem()"
              >
                {{ 'common.close' | t }}
              </button>
            </div>
          }
          <router-outlet />
        </main>
      </div>
    }
  `,
})
export class AppComponent {
  readonly authStore = inject(AuthStore);
  readonly workflowStore = inject(UniformWorkflowStore);
  readonly isImageUrl = isImageUrl;
  private readonly router = inject(Router);

  readonly mobileMenuOpen = signal<boolean>(false);

  readonly userInitials = computed<string>(() => {
    const fullName = this.authStore.currentFullName().trim();
    if (!fullName) {
      return 'US';
    }
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  });

  constructor() {
    this.workflowStore.initializeSession();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.mobileMenuOpen.set(false);
      });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  isDashboardRoute(): boolean {
    return this.router.url.startsWith('/admin/dashboard');
  }

  isB2cRoute(): boolean {
    return this.router.url.startsWith('/b2c');
  }

  isCatalogRoute(): boolean {
    return this.router.url.startsWith('/admin/catalog');
  }

  isB2bRoute(): boolean {
    return this.router.url.startsWith('/b2b');
  }

  isEstablishmentWorkspaceRoute(): boolean {
    return (
      this.isDashboardRoute() ||
      this.isB2cRoute() ||
      this.isCatalogRoute() ||
      this.isB2bRoute()
    );
  }

  isGlobalAdminRoute(): boolean {
    const url = this.router.url;
    return (
      url.startsWith('/admin/stocks') ||
      url.startsWith('/admin/suppliers') ||
      url.startsWith('/admin/clients') ||
      url.startsWith('/admin/users')
    );
  }

  pageHeaderTitle(): string {
    const url = this.router.url;
    if (url.startsWith('/admin/dashboard')) {
      return 'Tableau de Bord — Pilotage par Établissement';
    }
    if (url.startsWith('/admin/stocks')) {
      return 'Stock Global (Tous Établissements)';
    }
    if (url.startsWith('/admin/suppliers')) {
      return 'Fournisseurs';
    }
    if (url.startsWith('/admin/clients')) {
      return 'Établissements';
    }
    if (url.startsWith('/admin/catalog')) {
      return 'Catalogue Produits';
    }
    if (url.startsWith('/b2b')) {
      return 'Bons de Commande Fournisseurs & Arrivages';
    }
    if (url.startsWith('/admin/users')) {
      return 'Utilisateurs';
    }
    const subView = this.workflowStore.activeB2cSubView();
    if (subView === 'STOCK' && this.authStore.isAdmin()) {
      return "Stock de l'établissement";
    }
    return 'Commande Globale & Distribution';
  }
}
