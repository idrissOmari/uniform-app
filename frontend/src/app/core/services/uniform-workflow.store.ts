import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { concatMap, from } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import {
  AddB2cOrderLineRequest,
  AdminCatalogItemResponse,
  AuthSessionResponse,
  B2bPurchaseOrderResponse,
  B2cCatalogItemResponse,
  B2cOrderDetailResponse,
  B2cOrderSummaryResponse,
  ClientResponse,
  ClientSectionInput,
  ClientStockResponse,
  ClientType,
  CreateOrUpdateSupplierRequest,
  Gender,
  GlobalStockItemResponse,
  InviteUserRequest,
  ProblemDetails,
  Size,
  SupplierResponse,
  UpdateUserRequest,
  UpsertClientStockRequest,
  UserAccountResponse,
} from '../models/uniform.models';
import { UniformApiService } from './uniform-api.service';

@Injectable({ providedIn: 'root' })
export class UniformWorkflowStore {
  private readonly api = inject(UniformApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

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
  private readonly _loading = signal<boolean>(false);
  private readonly _cashSaleModalOpen = signal<boolean>(false);
  private readonly _newClientModalOpen = signal<boolean>(false);
  private readonly _activeB2cSubView = signal<'DASHBOARD' | 'ORDERS' | 'CAISSE' | 'STOCK'>('DASHBOARD');

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
  readonly loading = this._loading.asReadonly();
  readonly cashSaleModalOpen = this._cashSaleModalOpen.asReadonly();
  readonly newClientModalOpen = this._newClientModalOpen.asReadonly();
  readonly activeB2cSubView = this._activeB2cSubView.asReadonly();

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
      frontVisualStorageKey: string;
      backVisualStorageKey?: string | null;
      visualPlacementNotes?: string | null;
      b2cUnitPrice: number;
      b2bUnitCost: number;
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
      frontVisualStorageKey: string;
      backVisualStorageKey?: string | null;
      visualPlacementNotes?: string | null;
      b2cUnitPrice: number;
      b2bUnitCost: number;
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
    from(payloads)
      .pipe(concatMap((payload) => this.api.addB2cOrderLine(clientId, order.id, payload)))
      .subscribe({
        next: () => {
          // Sequential line added
        },
        complete: () => {
          this._loading.set(false);
          this.loadB2cOrderDetail(clientId, order.id);
          this.api.listB2cOrders(clientId).subscribe({
            next: (orders) => this._b2cOrders.set(orders),
          });
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

  downloadLineReceiptPdf(lineId: string): void {
    const clientId = this._selectedClientId();
    const order = this._activeB2cOrder();
    if (!clientId || !order) {
      return;
    }
    this.api.downloadB2cLineReceiptPdf(clientId, order.id, lineId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: unknown) => this.handleHttpError(err),
    });
  }

  downloadCatalogFlyerPdf(): void {
    const clientId = this._selectedClientId();
    if (!clientId) {
      return;
    }
    this.clearProblem();
    this.api.downloadClientCatalogFlyerPdf(clientId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err: unknown) => this.handleHttpError(err),
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
      type: 'https://uniform-app.local/problems/network-error',
      title: 'Erreur de communication API',
      status: err instanceof HttpErrorResponse ? err.status : 500,
      detail: err instanceof Error ? err.message : 'Erreur inattendue',
      instance: '/api/v1',
      errorCode: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}
