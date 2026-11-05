import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
  GlobalStockItemResponse,
  InvitationDetailsResponse,
  InviteUserRequest,
  SupplierResponse,
  UpdateUserRequest,
  UpsertClientStockRequest,
  UserAccountResponse,
  UserRole,
} from '../models/uniform.models';

export interface AuthTokenResponse {
  readonly accessToken: string;
  readonly username: string;
  readonly role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class UniformApiService {
  private readonly http = inject(HttpClient);

  login(identifier: string, password: string): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>('/api/v1/auth/login', { identifier, password });
  }

  getInvitationByToken(token: string): Observable<InvitationDetailsResponse> {
    return this.http.get<InvitationDetailsResponse>(`/api/v1/auth/invitations/${encodeURIComponent(token)}`);
  }

  acceptInvitation(token: string, password: string): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(
      `/api/v1/auth/invitations/${encodeURIComponent(token)}/accept`,
      { password }
    );
  }

  listUsers(): Observable<UserAccountResponse[]> {
    return this.http.get<UserAccountResponse[]>('/api/v1/admin/users');
  }

  inviteUser(payload: InviteUserRequest): Observable<UserAccountResponse> {
    return this.http.post<UserAccountResponse>('/api/v1/admin/users/invite', payload);
  }

  resendInvitation(userId: string): Observable<UserAccountResponse> {
    return this.http.post<UserAccountResponse>(`/api/v1/admin/users/${userId}/resend-invitation`, {});
  }

  updateUserStatus(userId: string, active: boolean): Observable<UserAccountResponse> {
    return this.http.patch<UserAccountResponse>(`/api/v1/admin/users/${userId}/status`, { active });
  }

  updateUserAssignedClient(
    userId: string,
    assignedClientId: string | null
  ): Observable<UserAccountResponse> {
    return this.http.patch<UserAccountResponse>(
      `/api/v1/admin/users/${userId}/assigned-client`,
      { assignedClientId }
    );
  }

  updateUser(userId: string, payload: UpdateUserRequest): Observable<UserAccountResponse> {
    return this.http.put<UserAccountResponse>(`/api/v1/admin/users/${userId}`, payload);
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/users/${userId}`);
  }

  listGlobalStocks(): Observable<GlobalStockItemResponse[]> {
    return this.http.get<GlobalStockItemResponse[]>('/api/v1/admin/clients/global-stocks');
  }

  issueToken(username: string, role: UserRole): Observable<AuthTokenResponse> {
    return this.http.post<AuthTokenResponse>('/api/v1/auth/token', { username, role });
  }

  listClients(): Observable<ClientResponse[]> {
    return this.http.get<ClientResponse[]>('/api/v1/clients');
  }

  getCatalogConfiguration(): Observable<CatalogConfiguration> {
    return this.http.get<CatalogConfiguration>('/api/v1/catalog-config');
  }

  updateCatalogConfiguration(config: CatalogConfiguration): Observable<CatalogConfiguration> {
    return this.http.put<CatalogConfiguration>('/api/v1/admin/catalog-config', config);
  }

  createClient(payload: {
    name: string;
    clientType: ClientType;
    address: string;
    logoStorageKey?: string | null;
    moq?: number;
    sections?: readonly ClientSectionInput[];
  }): Observable<ClientResponse> {
    return this.http.post<ClientResponse>('/api/v1/admin/clients', payload);
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
    }
  ): Observable<ClientResponse> {
    return this.http.put<ClientResponse>(`/api/v1/admin/clients/${clientId}`, payload);
  }

  updateClientSections(
    clientId: string,
    sections: readonly ClientSectionInput[]
  ): Observable<ClientResponse> {
    return this.http.put<ClientResponse>(`/api/v1/admin/clients/${clientId}/sections`, {
      sections,
    });
  }

  updateClientMoq(clientId: string, moq: number): Observable<ClientResponse> {
    return this.http.patch<ClientResponse>(`/api/v1/admin/clients/${clientId}/moq`, { moq });
  }

  deleteClient(clientId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/clients/${clientId}`);
  }

  listSuppliers(): Observable<SupplierResponse[]> {
    return this.http.get<SupplierResponse[]>('/api/v1/admin/suppliers');
  }

  createSupplier(payload: CreateOrUpdateSupplierRequest): Observable<SupplierResponse> {
    return this.http.post<SupplierResponse>('/api/v1/admin/suppliers', payload);
  }

  updateSupplier(
    supplierId: string,
    payload: CreateOrUpdateSupplierRequest
  ): Observable<SupplierResponse> {
    return this.http.put<SupplierResponse>(`/api/v1/admin/suppliers/${supplierId}`, payload);
  }

  deleteSupplier(supplierId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/suppliers/${supplierId}`);
  }

  listAdminClientCatalogItems(clientId: string): Observable<AdminCatalogItemResponse[]> {
    return this.http.get<AdminCatalogItemResponse[]>(
      `/api/v1/admin/clients/${clientId}/catalog-items`
    );
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
    }
  ): Observable<AdminCatalogItemResponse> {
    return this.http.post<AdminCatalogItemResponse>(
      `/api/v1/admin/clients/${clientId}/catalog-items`,
      payload
    );
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
    }
  ): Observable<AdminCatalogItemResponse> {
    return this.http.put<AdminCatalogItemResponse>(
      `/api/v1/admin/clients/${clientId}/catalog-items/${catalogItemId}`,
      payload
    );
  }

  deleteCatalogItem(clientId: string, catalogItemId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/admin/clients/${clientId}/catalog-items/${catalogItemId}`
    );
  }

  listClientCatalogItems(clientId: string): Observable<B2cCatalogItemResponse[]> {
    return this.http.get<B2cCatalogItemResponse[]>(`/api/v1/clients/${clientId}/catalog-items`);
  }

  downloadClientCatalogFlyerPdf(clientId: string): Observable<Blob> {
    return this.http.get(`/api/v1/clients/${clientId}/catalog-flyer-pdf`, {
      responseType: 'blob',
    });
  }

  listClientStocks(clientId: string): Observable<ClientStockResponse[]> {
    return this.http.get<ClientStockResponse[]>(`/api/v1/clients/${clientId}/stocks`);
  }

  upsertClientStock(
    clientId: string,
    payload: UpsertClientStockRequest
  ): Observable<ClientStockResponse> {
    return this.http.put<ClientStockResponse>(
      `/api/v1/admin/clients/${clientId}/stocks`,
      payload
    );
  }

  listB2cOrders(clientId: string): Observable<B2cOrderSummaryResponse[]> {
    return this.http.get<B2cOrderSummaryResponse[]>(`/api/v1/clients/${clientId}/b2c-orders`);
  }

  createB2cOrder(clientId: string): Observable<B2cOrderDetailResponse> {
    return this.http.post<B2cOrderDetailResponse>(`/api/v1/clients/${clientId}/b2c-orders`, {});
  }

  getB2cOrderById(clientId: string, orderId: string): Observable<B2cOrderDetailResponse> {
    return this.http.get<B2cOrderDetailResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}`
    );
  }

  addB2cOrderLine(
    clientId: string,
    orderId: string,
    payload: AddB2cOrderLineRequest
  ): Observable<B2cOrderLineResponse> {
    return this.http.post<B2cOrderLineResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/lines`,
      payload
    );
  }

  downloadB2cLineReceiptPdf(clientId: string, orderId: string, lineId: string): Observable<Blob> {
    return this.http.get(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/lines/${lineId}/receipt-pdf`,
      { responseType: 'blob' }
    );
  }

  downloadB2cOrderPackingListPdf(clientId: string, orderId: string): Observable<Blob> {
    return this.http.get(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/packing-list-pdf`,
      { responseType: 'blob' }
    );
  }

  moveB2cOrderToProduction(clientId: string, orderId: string): Observable<B2cOrderDetailResponse> {
    return this.http.post<B2cOrderDetailResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/move-to-production`,
      {}
    );
  }

  moveB2cOrderToDelivery(clientId: string, orderId: string): Observable<B2cOrderDetailResponse> {
    return this.http.post<B2cOrderDetailResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/move-to-delivery`,
      {}
    );
  }

  markB2cOrderLineDelivered(
    clientId: string,
    orderId: string,
    lineId: string
  ): Observable<B2cOrderDetailResponse> {
    return this.http.post<B2cOrderDetailResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/lines/${lineId}/deliver`,
      {}
    );
  }

  deleteB2cOrder(clientId: string, orderId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/clients/${clientId}/b2c-orders/${orderId}`);
  }

  deleteB2cOrderLine(
    clientId: string,
    orderId: string,
    lineId: string
  ): Observable<B2cOrderDetailResponse> {
    return this.http.delete<B2cOrderDetailResponse>(
      `/api/v1/clients/${clientId}/b2c-orders/${orderId}/lines/${lineId}`
    );
  }

  getClientCashCounter(clientId: string): Observable<CashCounterResponse> {
    return this.http.get<CashCounterResponse>(`/api/v1/clients/${clientId}/cash-counter`);
  }

  resetClientCashCounter(
    clientId: string,
    payload: {
      lastResetAmount: number;
      lastResetOrdersCount: number;
      lastResetUnitsCount: number;
    }
  ): Observable<CashCounterResponse> {
    return this.http.post<CashCounterResponse>(
      `/api/v1/clients/${clientId}/cash-counter/reset`,
      payload
    );
  }

  listB2bPurchaseOrders(clientId: string): Observable<B2bPurchaseOrderResponse[]> {
    return this.http.get<B2bPurchaseOrderResponse[]>(`/api/v1/clients/${clientId}/b2b-orders`);
  }

  updateB2bLineFinalQuantity(
    clientId: string,
    b2bOrderId: string,
    b2bLineId: string,
    finalQuantity: number
  ): Observable<B2bPurchaseOrderResponse> {
    return this.http.put<B2bPurchaseOrderResponse>(
      `/api/v1/clients/${clientId}/b2b-orders/${b2bOrderId}/lines/${b2bLineId}`,
      { finalQuantity }
    );
  }

  confirmB2bPurchaseOrder(clientId: string, b2bOrderId: string): Observable<B2bPurchaseOrderResponse> {
    return this.http.post<B2bPurchaseOrderResponse>(
      `/api/v1/clients/${clientId}/b2b-orders/${b2bOrderId}/confirm-order`,
      {}
    );
  }

  receiveB2bPurchaseOrderStock(clientId: string, b2bOrderId: string): Observable<B2bPurchaseOrderResponse> {
    return this.http.post<B2bPurchaseOrderResponse>(
      `/api/v1/clients/${clientId}/b2b-orders/${b2bOrderId}/receive-stock`,
      {}
    );
  }

  downloadB2bPurchaseOrderPdf(clientId: string, b2bOrderId: string): Observable<Blob> {
    return this.http.get(`/api/v1/clients/${clientId}/b2b-orders/${b2bOrderId}/po-pdf`, {
      responseType: 'blob',
    });
  }
}
