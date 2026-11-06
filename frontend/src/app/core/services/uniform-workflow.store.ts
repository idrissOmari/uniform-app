import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { concatMap, forkJoin, from, of } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import {
  AddB2cOrderLineRequest,
  AdminCatalogItemResponse,
  AuthSessionResponse,
  B2bPurchaseOrderResponse,
  B2cCatalogItemResponse,
  B2cOrderDetailResponse,
  B2cOrderLineResponse,
  B2cOrderSummaryResponse,
  CashCounterResponse,
  CatalogConfiguration,
  ClientResponse,
  ClientSectionInput,
  ClientStockResponse,
  ClientType,
  CreateOrUpdateSupplierRequest,
  DEFAULT_CATALOG_CONFIGURATION,
  Gender,
  GlobalStockItemResponse,
  InviteUserRequest,
  isStrictAdultAlphaSize,
  ProblemDetails,
  ProductTypeConfig,
  Size,
  SizeGridConfig,
  SupplierResponse,
  UpdateUserRequest,
  UpsertClientStockRequest,
  UserAccountResponse,
} from '../models/uniform.models';
import { B2cExcelExportService } from './b2c-excel-export.service';
import { B2cReceiptPdfGeneratorService } from './b2c-receipt-pdf.service';
import { CatalogFlyerPdfGeneratorService } from './catalog-flyer-pdf.service';
import { UniformApiService } from './uniform-api.service';

const CATALOG_CONFIG_STORAGE_KEY = 'uniform_app_catalog_config_v1';
const CASH_COUNTERS_STORAGE_KEY = 'uniform_app_cash_counters_v1';

@Injectable({ providedIn: 'root' })
export class UniformWorkflowStore {
  private readonly api = inject(UniformApiService);
  private readonly catalogFlyerPdfGenerator = inject(CatalogFlyerPdfGeneratorService);
  private readonly b2cReceiptPdfGenerator = inject(B2cReceiptPdfGeneratorService);
  private readonly b2cExcelExport = inject(B2cExcelExportService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  private readonly _catalogConfig = signal<CatalogConfiguration>(this.loadCachedCatalogConfig());
  private readonly _cashCountersByClient = signal<Readonly<Record<string, CashCounterResponse>>>(
    this.loadCachedCashCounters()
  );
  private readonly _clients = signal<readonly ClientResponse[]>([]);
  private readonly _selectedClientId = signal<string | null>(null);
  private readonly _catalogItems = signal<readonly B2cCatalogItemResponse[]>([]);
  private readonly _adminCatalogItems = signal<readonly AdminCatalogItemResponse[]>([]);
  private readonly _stocks = signal<readonly ClientStockResponse[]>([]);
  private readonly _b2cOrders = signal<readonly B2cOrderSummaryResponse[]>([]);
  private readonly _activeB2cOrder = signal<B2cOrderDetailResponse | null>(null);
  private readonly _b2bPurchaseOrders = signal<readonly B2bPurchaseOrderResponse[]>([]);
  private readonly _suppliers = signal<readonly SupplierResponse[]>([]);
  private readonly _globalStocks = signal<readonly GlobalStockItemResponse[]>([]);
  private readonly _users = signal<readonly UserAccountResponse[]>([]);
  private readonly _lastInvitedUser = signal<UserAccountResponse | null>(null);
  private readonly _lastProblem = signal<ProblemDetails | null>(null);
  private readonly _lastStockNotice = signal<string | null>(null);
  private readonly _lastCreatedReceiptLines = signal<readonly B2cOrderLineResponse[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _cashSaleModalOpen = signal<boolean>(false);
  private readonly _newClientModalOpen = signal<boolean>(false);
  private readonly _activeB2cSubView = signal<'DASHBOARD' | 'ORDERS' | 'CAISSE' | 'STOCK'>('DASHBOARD');

  readonly catalogConfig = this._catalogConfig.asReadonly();
  readonly sizeGrids = computed<readonly SizeGridConfig[]>(() => this._catalogConfig().sizeGrids);
  readonly productTypes = computed<readonly ProductTypeConfig[]>(() => this._catalogConfig().productTypes);
  readonly allConfiguredSizes = computed<readonly string[]>(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const grid of this._catalogConfig().sizeGrids) {
      for (const sz of grid.sizes) {
        const clean = sz.trim();
        if (clean && !seen.has(clean)) {
          seen.add(clean);
          list.push(clean);
        }
      }
    }
    return list;
  });

  readonly clients = this._clients.asReadonly();
  readonly selectedClientId = this._selectedClientId.asReadonly();
  readonly catalogItems = this._catalogItems.asReadonly();
  readonly adminCatalogItems = this._adminCatalogItems.asReadonly();
  readonly stocks = this._stocks.asReadonly();
  readonly b2cOrders = this._b2cOrders.asReadonly();
  readonly activeB2cOrder = this._activeB2cOrder.asReadonly();
  readonly b2bPurchaseOrders = this._b2bPurchaseOrders.asReadonly();
  readonly suppliers = this._suppliers.asReadonly();
  readonly globalStocks = this._globalStocks.asReadonly();
  readonly users = this._users.asReadonly();
  readonly lastInvitedUser = this._lastInvitedUser.asReadonly();
  readonly lastProblem = this._lastProblem.asReadonly();
  readonly lastStockNotice = this._lastStockNotice.asReadonly();
  readonly lastCreatedReceiptLines = this._lastCreatedReceiptLines.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly cashSaleModalOpen = this._cashSaleModalOpen.asReadonly();
  readonly newClientModalOpen = this._newClientModalOpen.asReadonly();
  readonly activeB2cSubView = this._activeB2cSubView.asReadonly();
  readonly cashCountersByClient = this._cashCountersByClient.asReadonly();

  readonly activeClientCashCounter = computed<CashCounterResponse | null>(() => {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return null;
    }
    return (
      this._cashCountersByClient()[clientId] ?? {
        clientId,
        resetAt: null,
        resetByFullName: null,
        lastResetAmount: 0,
        lastResetOrdersCount: 0,
        lastResetUnitsCount: 0,
        resetCount: 0,
        recentResets: [],
      }
    );
  });

  readonly totalAvailableStock = computed<number>(() =>
    this._stocks().reduce((sum, s) => sum + s.availableQuantity, 0)
  );

  getAvailableStock(catalogItemId: string, gender: Gender, size: Size): number {
    const match = this._stocks().find(
      (s) => s.catalogItemId === catalogItemId && s.gender === gender && s.size === size
    );
    return match ? match.availableQuantity : 0;
  }

  clearStockNotice(): void {
    this._lastStockNotice.set(null);
  }

  clearLastCreatedReceipt(): void {
    this._lastCreatedReceiptLines.set([]);
  }

  setCashSaleModalOpen(open: boolean): void {
    this._cashSaleModalOpen.set(open);
  }

  openNewOrderModalFromNav(): void {
    this._activeB2cSubView.set('DASHBOARD');
    void this.router.navigate(['/b2c']).then(() => {
      this._cashSaleModalOpen.set(true);
    });
  }

  openNewClientModalFromNav(): void {
    this._newClientModalOpen.set(true);
    void this.router.navigate(['/admin/clients']);
  }

  consumeNewClientModalRequest(): boolean {
    const pending = this._newClientModalOpen();
    if (pending) {
      this._newClientModalOpen.set(false);
    }
    return pending;
  }

  navigateToB2cSubView(view: 'DASHBOARD' | 'ORDERS' | 'CAISSE' | 'STOCK'): void {
    this._activeB2cSubView.set(view);
    void this.router.navigate(['/b2c']);
  }

  readonly selectedClient = computed<ClientResponse | null>(() => {
    const id = this._selectedClientId();
    if (!id) {
      return null;
    }
    return this._clients().find((c) => c.id === id) ?? null;
  });

  readonly operatorUsers = computed<readonly UserAccountResponse[]>(() =>
    this._users().filter((u) => u.role === 'ROLE_USER')
  );

  readonly assignedOperatorsForSelectedClient = computed<readonly UserAccountResponse[]>(() => {
    const id = this._selectedClientId();
    if (!id) {
      return [];
    }
    return this._users().filter((u) => u.role === 'ROLE_USER' && u.assignedClientId === id);
  });

  getAssignedOperatorSummary(clientId: string): string {
    const assigned = this._users().filter(
      (u) => u.role === 'ROLE_USER' && u.assignedClientId === clientId
    );
    if (assigned.length === 0) {
      return 'Aucun opérateur affecté';
    }
    return assigned.map((u) => u.fullName).join(', ');
  }

  assignOperatorToSelectedClient(userId: string, onSaved?: () => void): void {
    const clientId = this._selectedClientId();
    const client = this.selectedClient();
    if (!clientId || !userId) {
      return;
    }
    this.clearProblem();
    this.api.updateUserAssignedClient(userId, clientId).subscribe({
      next: (updatedUser) => {
        this.refreshUsers();
        this._lastStockNotice.set(
          `Opérateur « ${updatedUser.fullName} » affecté à l'établissement « ${client?.name ?? ''} ».`
        );
        onSaved?.();
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  readonly moqProgressPercentage = computed<number>(() => {
    const order = this._activeB2cOrder();
    if (!order || order.clientMoqSnapshot <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((order.totalQuantity / order.clientMoqSnapshot) * 100));
  });

  clearProblem(): void {
    this._lastProblem.set(null);
  }

  clearLastInvitedUser(): void {
    this._lastInvitedUser.set(null);
  }

  initializeSession(): void {
    if (this.authStore.isAuthenticated()) {
      this.loadAuthenticatedWorkspace();
    }
  }

  login(identifier: string, password: string): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.login(identifier, password).subscribe({
      next: (session) => {
        this._loading.set(false);
        this.applyAuthenticatedSession(session);
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  applyAuthenticatedSession(session: AuthSessionResponse): void {
    this.authStore.setAuthenticatedSession(session);
    this.loadAuthenticatedWorkspace();
    if (session.role === 'ROLE_ADMIN') {
      void this.router.navigate(['/admin/dashboard']);
    } else {
      void this.router.navigate(['/b2c']);
    }
  }

  logout(): void {
    this.authStore.clearSession();
    this._clients.set([]);
    this._selectedClientId.set(null);
    this._catalogItems.set([]);
    this._adminCatalogItems.set([]);
    this._stocks.set([]);
    this._activeB2cOrder.set(null);
    this._b2bPurchaseOrders.set([]);
    this._suppliers.set([]);
    this._globalStocks.set([]);
    this._users.set([]);
    this._lastInvitedUser.set(null);
    this._lastProblem.set(null);
    void this.router.navigate(['/login']);
  }

  loadAuthenticatedWorkspace(): void {
    this.refreshCatalogConfiguration();
    this.api.listClients().subscribe({
      next: (clients) => {
        this._clients.set(clients);
        const assignedClientId = this.authStore.assignedClientId();
        const existingSelectedId = this._selectedClientId();
        const validSelectedId =
          existingSelectedId && clients.some((c) => c.id === existingSelectedId)
            ? existingSelectedId
            : null;
        const currentClientId =
          (this.authStore.isUser() && assignedClientId
            ? clients.find((c) => c.id === assignedClientId)?.id
            : validSelectedId) ??
          clients[0]?.id ??
          null;
        if (currentClientId) {
          this.selectClient(currentClientId);
        } else {
          this._selectedClientId.set(null);
          this._catalogItems.set([]);
          this._adminCatalogItems.set([]);
          this._stocks.set([]);
          this._b2cOrders.set([]);
          this._activeB2cOrder.set(null);
          this._b2bPurchaseOrders.set([]);
        }
      },
      error: (err: unknown) => this.handleHttpError(err),
    });

    if (this.authStore.isAdmin()) {
      this.refreshUsers();
      this.refreshSuppliers();
      this.refreshGlobalStocks();
    }
  }

  private loadCachedCatalogConfig(): CatalogConfiguration {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CATALOG_CONFIG_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CatalogConfiguration>;
        if (
          Array.isArray(parsed.sizeGrids) &&
          parsed.sizeGrids.length > 0 &&
          Array.isArray(parsed.productTypes) &&
          parsed.productTypes.length > 0
        ) {
          return {
            sizeGrids: parsed.sizeGrids,
            productTypes: parsed.productTypes,
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_CATALOG_CONFIGURATION;
  }

  private persistCachedCatalogConfig(config: CatalogConfiguration): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CATALOG_CONFIG_STORAGE_KEY, JSON.stringify(config));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private loadCachedCashCounters(): Readonly<Record<string, CashCounterResponse>> {
    try {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(CASH_COUNTERS_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, CashCounterResponse>;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  }

  private persistCachedCashCounters(map: Readonly<Record<string, CashCounterResponse>>): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CASH_COUNTERS_STORAGE_KEY, JSON.stringify(map));
      }
    } catch {
      // Ignore storage errors
    }
  }

  refreshClientCashCounter(clientId: string): void {
    this.api.getClientCashCounter(clientId).subscribe({
      next: (counter) => {
        if (counter && counter.clientId) {
          this._cashCountersByClient.update((prev) => {
            const next = { ...prev, [clientId]: counter };
            this.persistCachedCashCounters(next);
            return next;
          });
        }
      },
      error: () => {
        // Fallback to cached localStorage state if endpoint unavailable
      },
    });
  }

  resetActiveClientCashCounter(
    currentAmount: number,
    currentOrdersCount: number,
    currentUnitsCount: number,
    onCompleted?: () => void
  ): void {
    if (!this.authStore.isAdmin()) {
      return;
    }
    const roundedAmount = Math.round(currentAmount * 100) / 100;
    if (roundedAmount <= 0) {
      this._lastProblem.set({
        type: 'https://uniform.app/problems/cash-counter-empty',
        title: 'Remise à zéro impossible',
        status: 422,
        detail:
          'La remise à zéro du compteur de caisse n\'est possible que lorsque le total en caisse est strictement supérieur à 0,00 DH.',
        instance: '/api/v1/clients/cash-counter/reset',
        errorCode: 'CASH_COUNTER_EMPTY',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const clientId = this._selectedClientId();
    const client = this.selectedClient();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    const prevCounter = this.activeClientCashCounter();
    const nowIso = new Date().toISOString();
    const actorName = this.authStore.currentFullName() || 'Administrateur';
    const prevHistory =
      prevCounter?.recentResets && prevCounter.recentResets.length > 0
        ? prevCounter.recentResets
        : prevCounter?.resetAt
          ? [
              {
                resetAt: prevCounter.resetAt,
                resetByFullName: prevCounter.resetByFullName || 'Administrateur',
                amount: prevCounter.lastResetAmount,
                ordersCount: prevCounter.lastResetOrdersCount,
                unitsCount: prevCounter.lastResetUnitsCount,
              },
            ]
          : [];
    const nextHistory = [
      {
        resetAt: nowIso,
        resetByFullName: actorName,
        amount: roundedAmount,
        ordersCount: currentOrdersCount,
        unitsCount: currentUnitsCount,
      },
      ...prevHistory,
    ].slice(0, 3);

    const optimisticCounter: CashCounterResponse = {
      clientId,
      resetAt: nowIso,
      resetByFullName: actorName,
      lastResetAmount: roundedAmount,
      lastResetOrdersCount: currentOrdersCount,
      lastResetUnitsCount: currentUnitsCount,
      resetCount: (prevCounter?.resetCount ?? 0) + 1,
      recentResets: nextHistory,
    };

    this._cashCountersByClient.update((prev) => {
      const next = { ...prev, [clientId]: optimisticCounter };
      this.persistCachedCashCounters(next);
      return next;
    });

    this.api
      .resetClientCashCounter(clientId, {
        lastResetAmount: optimisticCounter.lastResetAmount,
        lastResetOrdersCount: optimisticCounter.lastResetOrdersCount,
        lastResetUnitsCount: optimisticCounter.lastResetUnitsCount,
      })
      .subscribe({
        next: (savedCounter) => {
          if (savedCounter && savedCounter.clientId) {
            this._cashCountersByClient.update((prev) => {
              const next = { ...prev, [clientId]: savedCounter };
              this.persistCachedCashCounters(next);
              return next;
            });
          }
          this._lastStockNotice.set(
            `Compteur de caisse remis à zéro pour « ${client?.name ?? 'cet établissement'} » (Dernier arrêté : ${optimisticCounter.lastResetAmount.toFixed(2)} DH · ${currentOrdersCount} commande(s)).`
          );
          onCompleted?.();
        },
        error: () => {
          // Optimistic state is already persisted locally
          this._lastStockNotice.set(
            `Compteur de caisse remis à zéro pour « ${client?.name ?? 'cet établissement'} » (Dernier arrêté : ${optimisticCounter.lastResetAmount.toFixed(2)} DH · ${currentOrdersCount} commande(s)).`
          );
          onCompleted?.();
        },
      });
  }

  refreshCatalogConfiguration(): void {
    this.api.getCatalogConfiguration().subscribe({
      next: (remoteConfig) => {
        if (
          remoteConfig &&
          Array.isArray(remoteConfig.sizeGrids) &&
          remoteConfig.sizeGrids.length > 0 &&
          Array.isArray(remoteConfig.productTypes) &&
          remoteConfig.productTypes.length > 0
        ) {
          this._catalogConfig.set(remoteConfig);
          this.persistCachedCatalogConfig(remoteConfig);
        }
      },
      error: () => {
        // Keep cached/default configuration if backend endpoint is unavailable
      },
    });
  }

  saveCatalogConfiguration(config: CatalogConfiguration, onSaved?: () => void): void {
    this._catalogConfig.set(config);
    this.persistCachedCatalogConfig(config);
    this.api.updateCatalogConfiguration(config).subscribe({
      next: (saved) => {
        if (saved && Array.isArray(saved.sizeGrids) && Array.isArray(saved.productTypes)) {
          this._catalogConfig.set(saved);
          this.persistCachedCatalogConfig(saved);
        }
        onSaved?.();
      },
      error: () => {
        // Already persisted in reactive signal & localStorage
        onSaved?.();
      },
    });
  }

  upsertSizeGridConfig(grid: SizeGridConfig, onSaved?: () => void): void {
    const current = this._catalogConfig();
    const exists = current.sizeGrids.some((g) => g.id === grid.id);
    const nextGrids = exists
      ? current.sizeGrids.map((g) => (g.id === grid.id ? grid : g))
      : [...current.sizeGrids, grid];
    this.saveCatalogConfiguration(
      {
        sizeGrids: nextGrids,
        productTypes: current.productTypes,
      },
      onSaved
    );
  }

  deleteSizeGridConfig(gridId: string): void {
    const current = this._catalogConfig();
    if (current.sizeGrids.length <= 1) {
      return;
    }
    const nextGrids = current.sizeGrids.filter((g) => g.id !== gridId);
    const fallbackGridId = nextGrids[0]?.id ?? 'ALPHA_ADULT';
    const nextProductTypes = current.productTypes.map((pt) => {
      const filteredGridIds = pt.sizeGridIds.filter((id) => id !== gridId);
      return {
        ...pt,
        sizeGridIds: filteredGridIds.length > 0 ? filteredGridIds : [fallbackGridId],
      };
    });
    this.saveCatalogConfiguration({
      sizeGrids: nextGrids,
      productTypes: nextProductTypes,
    });
  }

  upsertProductTypeConfig(productType: ProductTypeConfig, onSaved?: () => void): void {
    const current = this._catalogConfig();
    const exists = current.productTypes.some((pt) => pt.code === productType.code);
    const nextTypes = exists
      ? current.productTypes.map((pt) => (pt.code === productType.code ? productType : pt))
      : [...current.productTypes, productType];
    this.saveCatalogConfiguration(
      {
        sizeGrids: current.sizeGrids,
        productTypes: nextTypes,
      },
      onSaved
    );
  }

  deleteProductTypeConfig(code: string): void {
    const current = this._catalogConfig();
    if (current.productTypes.length <= 1) {
      return;
    }
    const nextTypes = current.productTypes.filter((pt) => pt.code !== code);
    this.saveCatalogConfiguration({
      sizeGrids: current.sizeGrids,
      productTypes: nextTypes,
    });
  }

  resetCatalogConfigurationToDefaults(onSaved?: () => void): void {
    this.saveCatalogConfiguration(DEFAULT_CATALOG_CONFIGURATION, onSaved);
  }

  resolveProductTypeConfig(code?: string | null): ProductTypeConfig | null {
    if (!code) {
      return this._catalogConfig().productTypes[0] ?? null;
    }
    return (
      this._catalogConfig().productTypes.find((pt) => pt.code === code) ??
      this._catalogConfig().productTypes[0] ??
      null
    );
  }

  resolveProductTypeLabel(code?: string | null): string {
    if (!code) {
      return 'Polo';
    }
    const match = this._catalogConfig().productTypes.find((pt) => pt.code === code);
    return match ? match.label : code;
  }

  getDefaultSizesForProductType(code?: string | null, clientType?: ClientType | null): readonly string[] {
    const config = this.resolveProductTypeConfig(code);
    if (!config) {
      return [];
    }
    let sizes = [...config.defaultSizes];
    if (sizes.length === 0) {
      for (const gridId of config.sizeGridIds) {
        const grid = this._catalogConfig().sizeGrids.find((g) => g.id === gridId);
        if (grid) {
          for (const sz of grid.sizes) {
            if (!sizes.includes(sz)) {
              sizes.push(sz);
            }
          }
        }
      }
    }
    if (clientType === 'PRIMARY_SCHOOL') {
      const filteredKidsOrUniversal = sizes.filter((s) => !isStrictAdultAlphaSize(s));
      if (filteredKidsOrUniversal.length > 0) {
        sizes = filteredKidsOrUniversal;
      }
    }
    return sizes;
  }

  refreshGlobalStocks(): void {
    if (!this.authStore.isAdmin()) {
      return;
    }
    this.api.listGlobalStocks().subscribe({
      next: (stocks) => this._globalStocks.set(stocks),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  upsertGlobalStockItem(
    clientId: string,
    payload: UpsertClientStockRequest,
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.upsertClientStock(clientId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshGlobalStocks();
        if (this._selectedClientId() === clientId) {
          this.refreshClientStocks();
        }
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  refreshSuppliers(): void {
    if (!this.authStore.isAdmin()) {
      return;
    }
    this.api.listSuppliers().subscribe({
      next: (suppliers) => this._suppliers.set(suppliers),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  createSupplier(payload: CreateOrUpdateSupplierRequest, onSaved?: () => void): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.createSupplier(payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshSuppliers();
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  updateSupplier(
    supplierId: string,
    payload: CreateOrUpdateSupplierRequest,
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.updateSupplier(supplierId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshSuppliers();
        const selectedClientId = this._selectedClientId();
        if (selectedClientId) {
          this.refreshClientWorkspace(selectedClientId);
        }
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  deleteSupplier(supplierId: string): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.deleteSupplier(supplierId).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshSuppliers();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  refreshUsers(): void {
    if (!this.authStore.isAdmin()) {
      return;
    }
    this.api.listUsers().subscribe({
      next: (users) => this._users.set(users),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  inviteUser(payload: InviteUserRequest, onCreated?: () => void): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.inviteUser(payload).subscribe({
      next: (createdUser) => {
        this._loading.set(false);
        this._lastInvitedUser.set(createdUser);
        this.refreshUsers();
        onCreated?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  resendUserInvitation(userId: string): void {
    this.clearProblem();
    this.api.resendInvitation(userId).subscribe({
      next: (updatedUser) => {
        this._lastInvitedUser.set(updatedUser);
        this.refreshUsers();
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  toggleUserStatus(userId: string, active: boolean): void {
    this.clearProblem();
    this.api.updateUserStatus(userId, active).subscribe({
      next: () => this.refreshUsers(),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  updateUserAssignedClient(userId: string, assignedClientId: string | null): void {
    this.clearProblem();
    this.api.updateUserAssignedClient(userId, assignedClientId).subscribe({
      next: () => this.refreshUsers(),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  updateUser(userId: string, payload: UpdateUserRequest, onSaved?: () => void): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.updateUser(userId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshUsers();
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  deleteUser(userId: string, onDeleted?: () => void): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.deleteUser(userId).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshUsers();
        onDeleted?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  selectClient(clientId: string): void {
    if (!clientId) {
      this._selectedClientId.set(null);
      this._catalogItems.set([]);
      this._adminCatalogItems.set([]);
      this._stocks.set([]);
      this._b2cOrders.set([]);
      this._activeB2cOrder.set(null);
      this._b2bPurchaseOrders.set([]);
      return;
    }
    this._selectedClientId.set(clientId);
    this.refreshClientWorkspace(clientId);
  }

  createClient(
    payload: {
      name: string;
      clientType: ClientType;
      address: string;
      logoStorageKey?: string | null;
      moq?: number;
      sections?: readonly ClientSectionInput[];
    },
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.createClient(payload).subscribe({
      next: (created) => {
        this._loading.set(false);
        this.api.listClients().subscribe({
          next: (clients) => {
            this._clients.set(clients);
            this.selectClient(created.id);
            onSaved?.();
          },
          error: (err: unknown) => this.handleHttpError(err),
        });
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  updateClient(
    clientId: string,
    payload: {
      name: string;
      clientType: ClientType;
      address: string;
      logoStorageKey?: string | null;
      moq?: number;
      sections?: readonly ClientSectionInput[];
    },
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.updateClient(clientId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.api.listClients().subscribe({
          next: (clients) => {
            this._clients.set(clients);
            this.selectClient(clientId);
            onSaved?.();
          },
          error: (err: unknown) => this.handleHttpError(err),
        });
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  updateClientSections(
    clientId: string,
    sections: readonly ClientSectionInput[],
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.updateClientSections(clientId, sections).subscribe({
      next: () => {
        this._loading.set(false);
        this.api.listClients().subscribe({
          next: (clients) => {
            this._clients.set(clients);
            onSaved?.();
          },
          error: (err: unknown) => this.handleHttpError(err),
        });
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  deleteClient(clientId: string): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.deleteClient(clientId).subscribe({
      next: () => {
        this._loading.set(false);
        this.api.listClients().subscribe({
          next: (clients) => {
            this._clients.set(clients);
            const nextClientId = clients[0]?.id ?? null;
            if (nextClientId) {
              this.selectClient(nextClientId);
            } else {
              this._selectedClientId.set(null);
              this._catalogItems.set([]);
              this._adminCatalogItems.set([]);
              this._stocks.set([]);
              this._activeB2cOrder.set(null);
              this._b2bPurchaseOrders.set([]);
            }
          },
          error: (err: unknown) => this.handleHttpError(err),
        });
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  createCatalogItem(
    clientId: string,
    payload: {
      referenceCode: string;
      productType?: string;
      name: string;
      garmentStyle?: string;
      colorReference: string;
      supplierId?: string | null;
      supplierName?: string;
      availableSizes?: string | null;
      frontVisualStorageKey?: string | null;
      backVisualStorageKey?: string | null;
      visualPlacementNotes?: string | null;
      b2cUnitPrice: number;
      b2bUnitCost?: number | null;
    },
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.createCatalogItem(clientId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshClientWorkspace(clientId);
        this.refreshSuppliers();
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  updateCatalogItem(
    clientId: string,
    catalogItemId: string,
    payload: {
      referenceCode: string;
      productType?: string;
      name: string;
      garmentStyle?: string;
      colorReference: string;
      supplierId?: string | null;
      supplierName?: string;
      availableSizes?: string | null;
      frontVisualStorageKey?: string | null;
      backVisualStorageKey?: string | null;
      visualPlacementNotes?: string | null;
      b2cUnitPrice: number;
      b2bUnitCost?: number | null;
    },
    onSaved?: () => void
  ): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.updateCatalogItem(clientId, catalogItemId, payload).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshClientWorkspace(clientId);
        this.refreshSuppliers();
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  deleteCatalogItem(clientId: string, catalogItemId: string): void {
    this.clearProblem();
    this._loading.set(true);
    this.api.deleteCatalogItem(clientId, catalogItemId).subscribe({
      next: () => {
        this._loading.set(false);
        this.refreshClientWorkspace(clientId);
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  refreshClientWorkspace(clientId: string): void {
    this._loading.set(true);
    this.refreshClientCashCounter(clientId);
    this.api.listClientCatalogItems(clientId).subscribe({
      next: (items) => this._catalogItems.set(items),
      error: (err: unknown) => this.handleHttpError(err),
    });

    if (this.authStore.isAdmin()) {
      this.api.listAdminClientCatalogItems(clientId).subscribe({
        next: (adminItems) => this._adminCatalogItems.set(adminItems),
        error: (err: unknown) => this.handleHttpError(err),
      });
    }

    this.api.listClientStocks(clientId).subscribe({
      next: (stocks) => this._stocks.set(stocks),
      error: (err: unknown) => this.handleHttpError(err),
    });

    this.api.listB2cOrders(clientId).subscribe({
      next: (orders) => {
        this._loading.set(false);
        this._b2cOrders.set(orders);
        const currentOrderId = this._activeB2cOrder()?.id;
        const targetOrder =
          orders.find((o) => o.id === currentOrderId) ?? orders[0] ?? null;
        if (targetOrder) {
          this.loadB2cOrderDetail(clientId, targetOrder.id);
        } else {
          this._activeB2cOrder.set(null);
        }
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });

    if (this.authStore.isAdmin()) {
      this.refreshB2bOrders(clientId);
    }
  }

  refreshClientStocks(): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.api.listClientStocks(clientId).subscribe({
      next: (stocks) => this._stocks.set(stocks),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  upsertClientStock(payload: UpsertClientStockRequest, onSaved?: () => void): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    this._loading.set(true);
    this.api.upsertClientStock(clientId, payload).subscribe({
      next: (updatedStock) => {
        this._loading.set(false);
        this.refreshClientStocks();
        this.refreshGlobalStocks();
        const itemName =
          this._catalogItems().find((i) => i.id === payload.catalogItemId)?.name ?? 'Article';
        this._lastStockNotice.set(
          `Stock disponible actualisé pour « ${itemName} » (${payload.gender} · ${payload.size}) : ${updatedStock.availableQuantity} unité(s).`
        );
        onSaved?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  selectB2cOrder(orderId: string): void {
    const clientId = this._selectedClientId();
    if (!clientId || !orderId) {
      return;
    }
    this.loadB2cOrderDetail(clientId, orderId);
  }

  loadB2cOrderDetail(clientId: string, orderId: string): void {
    this.api.getB2cOrderById(clientId, orderId).subscribe({
      next: (detail) => this._activeB2cOrder.set(detail),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  initializeNewB2cOrder(): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    this.api.createB2cOrder(clientId).subscribe({
      next: (order) => {
        this._activeB2cOrder.set(order);
        this.api.listB2cOrders(clientId).subscribe({
          next: (orders) => this._b2cOrders.set(orders),
        });
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  addCashLine(payload: AddB2cOrderLineRequest): void {
    this.addMultipleCashLines([payload]);
  }

  addMultipleCashLines(
    payloads: readonly AddB2cOrderLineRequest[],
    onCompleted?: () => void
  ): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order || payloads.length === 0) {
      return;
    }
    this.clearProblem();
    this._loading.set(true);
    const createdLines: B2cOrderLineResponse[] = [];
    from(payloads)
      .pipe(concatMap((payload) => this.api.addB2cOrderLine(clientId, order.id, payload)))
      .subscribe({
        next: (createdLine) => {
          createdLines.push(createdLine);
        },
        complete: () => {
          this._loading.set(false);
          if (createdLines.length > 0) {
            this._lastCreatedReceiptLines.set(createdLines);
          }
          this.loadB2cOrderDetail(clientId, order.id);
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          onCompleted?.();
        },
        error: (err: unknown) => {
          this._loading.set(false);
          if (createdLines.length > 0) {
            this._lastCreatedReceiptLines.set(createdLines);
          }
          this.loadB2cOrderDetail(clientId, order.id);
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          this.handleHttpError(err);
        },
      });
  }

  downloadLineReceiptPdf(lineId: string): void {
    const client = this.selectedClient();
    const order = this._activeB2cOrder();
    if (!client || !order) {
      return;
    }
    const targetLine = order.lines.find((l) => l.id === lineId);
    if (!targetLine) {
      this.api.downloadB2cLineReceiptPdf(client.id, order.id, lineId).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: (err: unknown) => this.handleHttpError(err),
      });
      return;
    }
    this.downloadBuyerPackageReceiptPdf([targetLine]);
  }

  downloadBuyerReceiptForLine(lineId: string): void {
    const order = this._activeB2cOrder();
    if (!order) {
      return;
    }
    const targetLine = order.lines.find((l) => l.id === lineId);
    if (!targetLine) {
      return;
    }
    const buyerLines = this.getBuyerLinesFromOrder(order, targetLine);
    this.downloadBuyerPackageReceiptPdf(buyerLines.length > 0 ? buyerLines : [targetLine]);
  }

  getBuyerLinesFromOrder(
    order: B2cOrderDetailResponse,
    referenceLine: B2cOrderLineResponse
  ): readonly B2cOrderLineResponse[] {
    const refName = referenceLine.buyerFullName.trim().toLowerCase();
    const refPhone = referenceLine.buyerPhone.trim();
    const refSec = (referenceLine.sectionName ?? '').trim().toLowerCase();
    return order.lines.filter(
      (l) =>
        l.buyerFullName.trim().toLowerCase() === refName &&
        l.buyerPhone.trim() === refPhone &&
        (l.sectionName ?? '').trim().toLowerCase() === refSec
    );
  }

  downloadBuyerPackageReceiptPdf(lines: readonly B2cOrderLineResponse[]): void {
    const client = this.selectedClient();
    const order = this._activeB2cOrder();
    if (!client || !order || lines.length === 0) {
      return;
    }
    this.clearProblem();
    const items =
      this._adminCatalogItems().length > 0 ? this._adminCatalogItems() : this._catalogItems();
    void this.b2cReceiptPdfGenerator
      .generateReceiptPdfBlob(client, order, lines, items)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch((err: unknown) => this.handleHttpError(err));
  }

  downloadCatalogFlyerPdf(): void {
    const client = this.selectedClient();
    if (!client) {
      return;
    }
    this.clearProblem();
    const items =
      this._adminCatalogItems().length > 0 ? this._adminCatalogItems() : this._catalogItems();
    void this.catalogFlyerPdfGenerator
      .generateCatalogFlyerPdfBlob(client, items)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch((err: unknown) => this.handleHttpError(err));
  }

  downloadClientOrdersExcel(): void {
    const client = this.selectedClient();
    if (!client) {
      return;
    }
    this.clearProblem();
    this._loading.set(true);

    const summaries = this._b2cOrders();
    const detailRequests =
      summaries.length > 0
        ? forkJoin(summaries.map((s) => this.api.getB2cOrderById(client.id, s.id)))
        : of(this._activeB2cOrder() ? [this._activeB2cOrder()!] : []);

    detailRequests.subscribe({
      next: (detailedOrders) => {
        this._loading.set(false);
        const items =
          this._adminCatalogItems().length > 0 ? this._adminCatalogItems() : this._catalogItems();
        const blob = this.b2cExcelExport.generateEstablishmentOrdersExcelBlob(
          client,
          detailedOrders,
          items,
          this._stocks()
        );
        const safeSlug = client.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const dateTag = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recapitulatif-commandes-${safeSlug || 'etablissement'}-${dateTag}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  deliverBuyerPackage(lines: readonly B2cOrderLineResponse[], onCompleted?: () => void): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order) {
      return;
    }
    const pendingLines = lines.filter((l) => l.lineStatus === 'PENDING_PICKUP');
    if (pendingLines.length === 0) {
      onCompleted?.();
      return;
    }
    this.clearProblem();
    this._loading.set(true);
    let lastUpdatedOrder: B2cOrderDetailResponse | null = null;
    from(pendingLines)
      .pipe(concatMap((line) => this.api.markB2cOrderLineDelivered(clientId, order.id, line.id)))
      .subscribe({
        next: (updated) => {
          lastUpdatedOrder = updated;
        },
        complete: () => {
          this._loading.set(false);
          if (lastUpdatedOrder) {
            this._activeB2cOrder.set(lastUpdatedOrder);
          } else {
            this.loadB2cOrderDetail(clientId, order.id);
          }
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          if (this.authStore.isAdmin()) {
            this.refreshClientStocks();
          }
          const buyerName = pendingLines[0]?.buyerFullName ?? 'client';
          const totalUnitsDelivered = pendingLines.reduce(
            (sum, l) => sum + Number(l.quantity || 0),
            0
          );
          this._lastStockNotice.set(
            `Commande distribuée au client ${buyerName} (${totalUnitsDelivered} article(s) déstocké(s) du stock établissement).`
          );
          onCompleted?.();
        },
        error: (err: unknown) => {
          this._loading.set(false);
          this.loadB2cOrderDetail(clientId, order.id);
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          this.handleHttpError(err);
        },
      });
  }

  deleteBuyerPackage(lines: readonly B2cOrderLineResponse[], onCompleted?: () => void): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order || lines.length === 0) {
      return;
    }
    this.clearProblem();
    this._loading.set(true);
    const buyerName = lines[0]?.buyerFullName ?? 'client';
    let lastUpdatedOrder: B2cOrderDetailResponse | null = null;

    from(lines)
      .pipe(concatMap((line) => this.api.deleteB2cOrderLine(clientId, order.id, line.id)))
      .subscribe({
        next: (updated) => {
          lastUpdatedOrder = updated;
        },
        complete: () => {
          this._loading.set(false);
          if (lastUpdatedOrder) {
            this._activeB2cOrder.set(lastUpdatedOrder);
          } else {
            this.loadB2cOrderDetail(clientId, order.id);
          }
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          if (this.authStore.isAdmin()) {
            this.refreshClientStocks();
          }
          this._lastStockNotice.set(
            `La commande du client « ${buyerName} » a été supprimée avec succès.`
          );
          onCompleted?.();
        },
        error: (err: unknown) => {
          this._loading.set(false);
          this.loadB2cOrderDetail(clientId, order.id);
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
          this.handleHttpError(err);
        },
      });
  }

  deleteB2cOrderById(orderId: string, onCompleted?: () => void): void {
    const clientId = this._selectedClientId();
    if (!clientId || !orderId) {
      return;
    }
    const targetSummary = this._b2cOrders().find((o) => o.id === orderId);
    const orderLabel = targetSummary?.orderNumber ?? orderId;
    this.clearProblem();
    this._loading.set(true);

    this.api.deleteB2cOrder(clientId, orderId).subscribe({
      next: () => {
        this._loading.set(false);
        this.api.listB2cOrders(clientId).subscribe({
          next: (orders) => {
            this._b2cOrders.set(orders);
            const nextOrder = orders[0] ?? null;
            if (nextOrder) {
              this.loadB2cOrderDetail(clientId, nextOrder.id);
            } else {
              this._activeB2cOrder.set(null);
            }
          },
        });
        if (this.authStore.isAdmin()) {
          this.refreshClientStocks();
          this.refreshB2bOrders(clientId);
        }
        this._lastStockNotice.set(
          `La commande globale « ${orderLabel} » a été supprimée de l'historique.`
        );
        onCompleted?.();
      },
      error: (err: unknown) => {
        this._loading.set(false);
        this.handleHttpError(err);
      },
    });
  }

  downloadPackingListPdf(orderId?: string): void {
    const clientId = this._selectedClientId();
    const targetOrderId = orderId ?? this._activeB2cOrder()?.id;
    if (!clientId || !targetOrderId) {
      return;
    }
    this.clearProblem();
    this.api.downloadB2cOrderPackingListPdf(clientId, targetOrderId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  downloadB2bPurchaseOrderPdf(b2bOrderId: string): void {
    const clientId = this._selectedClientId();
    if (!clientId || !b2bOrderId) {
      return;
    }
    this.clearProblem();
    this.api.downloadB2bPurchaseOrderPdf(clientId, b2bOrderId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  moveActiveB2cOrderToProduction(): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order) {
      return;
    }
    this.clearProblem();
    this.api.moveB2cOrderToProduction(clientId, order.id).subscribe({
      next: (updated) => {
        this._activeB2cOrder.set(updated);
        this.refreshB2bOrders(clientId);
        this.api.listB2cOrders(clientId).subscribe({
          next: (orders) => this._b2cOrders.set(orders),
        });
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  moveActiveB2cOrderToDelivery(): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order) {
      return;
    }
    this.clearProblem();
    this.api.moveB2cOrderToDelivery(clientId, order.id).subscribe({
      next: (updated) => {
        this._activeB2cOrder.set(updated);
        this.api.listB2cOrders(clientId).subscribe({
          next: (orders) => this._b2cOrders.set(orders),
        });
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  deliverB2cLine(lineId: string): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order) {
      return;
    }
    const targetLine = order.lines.find((l) => l.id === lineId);
    const previousStock = targetLine
      ? this.getAvailableStock(targetLine.catalogItemId, targetLine.gender, targetLine.size)
      : 0;

    this.clearProblem();
    this.api.markB2cOrderLineDelivered(clientId, order.id, lineId).subscribe({
      next: (updated) => {
        this._activeB2cOrder.set(updated);
        this.api.listB2cOrders(clientId).subscribe({
          next: (orders) => this._b2cOrders.set(orders),
        });
        if (this.authStore.isAdmin()) {
          this.api.listClientStocks(clientId).subscribe({
            next: (stocks) => {
              this._stocks.set(stocks);
              if (targetLine) {
                const itemName =
                  this._catalogItems().find((i) => i.id === targetLine.catalogItemId)?.name ??
                  'Tenue scolaire';
                const newStock =
                  stocks.find(
                    (s) =>
                      s.catalogItemId === targetLine.catalogItemId &&
                      s.gender === targetLine.gender &&
                      s.size === targetLine.size
                  )?.availableQuantity ?? Math.max(0, previousStock - targetLine.quantity);
                this._lastStockNotice.set(
                  `Livraison remise à ${targetLine.buyerFullName} : le stock disponible pour « ${itemName} » (${targetLine.size}) a été actualisé (${previousStock} → ${newStock} unité(s) disponible(s)).`
                );
              }
            },
          });
        }
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  refreshB2bOrders(clientId: string): void {
    this.api.listB2bPurchaseOrders(clientId).subscribe({
      next: (pos) => this._b2bPurchaseOrders.set(pos),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  updateB2bLineFinalQuantity(b2bOrderId: string, b2bLineId: string, finalQuantity: number): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    this.api.updateB2bLineFinalQuantity(clientId, b2bOrderId, b2bLineId, finalQuantity).subscribe({
      next: () => this.refreshB2bOrders(clientId),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  confirmB2bOrder(b2bOrderId: string): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    this.api.confirmB2bPurchaseOrder(clientId, b2bOrderId).subscribe({
      next: () => this.refreshB2bOrders(clientId),
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  receiveB2bStock(b2bOrderId: string): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    const targetPo = this._b2bPurchaseOrders().find((p) => p.id === b2bOrderId);
    const receive$ =
      targetPo && targetPo.status === 'DRAFT'
        ? this.api
            .confirmB2bPurchaseOrder(clientId, b2bOrderId)
            .pipe(concatMap(() => this.api.receiveB2bPurchaseOrderStock(clientId, b2bOrderId)))
        : this.api.receiveB2bPurchaseOrderStock(clientId, b2bOrderId);

    receive$.subscribe({
      next: (receivedPo) => {
        this.refreshB2bOrders(clientId);
        this.api.listClientStocks(clientId).subscribe({
          next: (stocks) => {
            this._stocks.set(stocks);
            const totalAdded = receivedPo.lines.reduce((acc, l) => acc + l.finalQuantity, 0);
            const supplierLabel = receivedPo.supplierName
              ? `${receivedPo.supplierName} — ${receivedPo.poNumber}`
              : receivedPo.poNumber;
            this._lastStockNotice.set(
              `Arrivage fournisseur (${supplierLabel}) réceptionné : +${totalAdded} unité(s) créditées au stock du client.`
            );
          },
        });
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  private handleHttpError(err: unknown): void {
    if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'errorCode' in err.error) {
      this._lastProblem.set(err.error as ProblemDetails);
      return;
    }
    this._lastProblem.set({
      type: 'https://bidlab.ma/problems/network-error',
      title: 'Erreur de communication API',
      status: err instanceof HttpErrorResponse ? err.status : 500,
      detail: err instanceof Error ? err.message : 'Erreur inattendue',
      instance: '/api/v1',
      errorCode: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}
