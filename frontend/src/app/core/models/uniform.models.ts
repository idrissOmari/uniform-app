export type Gender = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';

export type AdultSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type KidsSize = 'AGE_2' | 'AGE_4' | 'AGE_6' | 'AGE_8' | 'AGE_10' | 'AGE_12' | 'AGE_14';
export type Size = AdultSize | KidsSize;

export type ClientType = 'PRIMARY_SCHOOL' | 'SECONDARY_SCHOOL' | 'ORGANIZATION';

export type ProductType =
  | 'POLO'
  | 'SHIRT'
  | 'TRACKSUIT'
  | 'SWEATSHIRT'
  | 'CARDIGAN'
  | 'TROUSERS_SKIRT'
  | 'BLOUSE'
  | 'JACKET';

export const ALL_PRODUCT_TYPES: readonly { readonly code: ProductType; readonly label: string }[] = [
  { code: 'POLO', label: 'Polo' },
  { code: 'SHIRT', label: 'Chemise' },
  { code: 'TRACKSUIT', label: 'Combinaison sport' },
  { code: 'SWEATSHIRT', label: 'Sweat à capuche' },
  { code: 'CARDIGAN', label: 'Pull / Cardigan' },
  { code: 'TROUSERS_SKIRT', label: 'Pantalon / Jupe' },
  { code: 'BLOUSE', label: 'Blouse / Tablier' },
  { code: 'JACKET', label: 'Veste / Blazer' },
];

export const ADULT_SIZES: readonly AdultSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const KIDS_SIZES: readonly KidsSize[] = ['AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'];
export const ALL_GENDERS: readonly Gender[] = ['MEN', 'WOMEN', 'UNISEX', 'KIDS'];
export const ALL_CLIENT_TYPES: readonly ClientType[] = ['PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'ORGANIZATION'];

export function getAllowedGendersForClientType(clientType?: ClientType | null): readonly Gender[] {
  if (clientType === 'PRIMARY_SCHOOL') {
    return ['KIDS'];
  }
  return ALL_GENDERS;
}

export function getAllowedSizesForGender(gender: Gender, clientType?: ClientType | null): readonly Size[] {
  if (clientType === 'PRIMARY_SCHOOL') {
    return KIDS_SIZES;
  }
  return gender === 'KIDS' ? KIDS_SIZES : ADULT_SIZES;
}

export function getAllowedSizesForCatalogItem(
  item: { readonly availableSizes?: string | null } | null | undefined,
  gender: Gender,
  clientType?: ClientType | null
): readonly Size[] {
  const baseSizes = getAllowedSizesForGender(gender, clientType);
  if (!item?.availableSizes || !item.availableSizes.trim()) {
    return baseSizes;
  }
  const configured = new Set(
    item.availableSizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const filtered = baseSizes.filter((s) => configured.has(s));
  return filtered.length > 0 ? filtered : baseSizes;
}

export type UserRole = 'ROLE_USER' | 'ROLE_ADMIN';
export type InvitationStatus = 'PENDING_INVITATION' | 'ACTIVE' | 'DISABLED';

export interface AuthSessionResponse {
  readonly accessToken: string;
  readonly userId: string;
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly assignedClientId?: string | null;
}

export interface InvitationDetailsResponse {
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly assignedClientId?: string | null;
  readonly expiresAt: string;
}

export interface InviteUserRequest {
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly assignedClientId?: string | null;
}

export interface UpdateUserRequest {
  readonly fullName: string;
  readonly role: UserRole;
  readonly assignedClientId?: string | null;
}

export interface UserAccountResponse {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: UserRole;
  readonly assignedClientId: string | null;
  readonly assignedClientName: string | null;
  readonly active: boolean;
  readonly invitationStatus: InvitationStatus;
  readonly invitationUrl: string | null;
  readonly emailArchivePath: string | null;
  readonly invitationExpiresAt: string | null;
  readonly createdAt: string;
}

export type B2cOrderStatus = 'IN_PROGRESS' | 'IN_PRODUCTION' | 'IN_DELIVERY' | 'DELIVERED';
export type B2cOrderLineStatus = 'PENDING_PICKUP' | 'DELIVERED';
export type B2bOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED';

export type ErrorCode =
  | 'CASH_CONFIRMATION_REQUIRED'
  | 'INVALID_GENDER_SIZE'
  | 'ORDER_IMMUTABLE'
  | 'INSUFFICIENT_CLIENT_STOCK'
  | 'B2B_STOCK_NOT_RECEIVED'
  | 'MOQ_NOT_REACHED'
  | 'INSUFFICIENT_PRIVILEGES'
  | 'VALIDATION_ERROR'
  | 'RESOURCE_NOT_FOUND';

export interface ClientSectionInput {
  readonly id?: string | null;
  readonly name: string;
  readonly capacity: number;
}

export interface ClientSectionResponse {
  readonly id: string;
  readonly clientId: string;
  readonly name: string;
  readonly capacity: number;
}

export interface ClientResponse {
  readonly id: string;
  readonly name: string;
  readonly clientType: ClientType;
  readonly address: string;
  readonly logoStorageKey: string | null;
  readonly moq: number;
  readonly sections?: readonly ClientSectionResponse[];
  readonly totalCapacity?: number;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface B2cCatalogItemResponse {
  readonly id: string;
  readonly clientId: string;
  readonly referenceCode: string;
  readonly productType?: string;
  readonly name: string;
  readonly garmentStyle: string;
  readonly colorReference: string;
  readonly availableSizes?: string | null;
  readonly frontVisualStorageKey: string | null;
  readonly backVisualStorageKey: string | null;
  readonly visualPlacementNotes: string | null;
  readonly b2cUnitPrice: number;
}

export interface CreateOrUpdateSupplierRequest {
  readonly name: string;
  readonly specialty?: string | null;
  readonly contactName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly cityAddress?: string | null;
}

export interface SupplierResponse {
  readonly id: string;
  readonly name: string;
  readonly specialty: string | null;
  readonly contactName: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly cityAddress: string | null;
  readonly active: boolean;
  readonly attachedCatalogItemsCount: number;
  readonly createdAt: string;
}

export interface AdminCatalogItemResponse extends B2cCatalogItemResponse {
  readonly supplierId?: string | null;
  readonly supplierName?: string;
  readonly b2bUnitCost: number;
}

export interface ClientStockResponse {
  readonly id: string;
  readonly clientId: string;
  readonly catalogItemId: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly availableQuantity: number;
  readonly updatedAt?: string;
}

export interface GlobalStockItemResponse {
  readonly stockId: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly clientType: ClientType;
  readonly catalogItemId: string;
  readonly referenceCode: string;
  readonly productType: string;
  readonly itemName: string;
  readonly colorReference: string;
  readonly supplierId: string | null;
  readonly supplierName: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly availableQuantity: number;
  readonly updatedAt?: string;
}

export interface UpsertClientStockRequest {
  readonly catalogItemId: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly availableQuantity: number;
}

export interface AddB2cOrderLineRequest {
  readonly catalogItemId: string;
  readonly sectionId?: string | null;
  readonly sectionName?: string | null;
  readonly buyerFullName: string;
  readonly buyerPhone?: string | null;
  readonly buyerEmail?: string | null;
  readonly gender: Gender;
  readonly size: Size;
  readonly quantity: number;
  readonly cashPaymentConfirmed: boolean;
  readonly irreversibilityAcknowledged: boolean;
}

export interface B2cOrderLineResponse {
  readonly id: string;
  readonly b2cOrderId: string;
  readonly catalogItemId: string;
  readonly sectionId?: string | null;
  readonly sectionName?: string | null;
  readonly receiptNumber: string;
  readonly buyerFullName: string;
  readonly buyerPhone: string;
  readonly buyerEmail: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly quantity: number;
  readonly b2cUnitPrice: number;
  readonly lineCashAmount: number;
  readonly lineStatus: B2cOrderLineStatus;
  readonly createdAt: string;
}

export interface B2cOrderSummaryResponse {
  readonly id: string;
  readonly clientId: string;
  readonly orderNumber: string;
  readonly status: B2cOrderStatus;
  readonly clientMoqSnapshot: number;
  readonly totalQuantity: number;
  readonly moqReached: boolean;
  readonly totalCashAmount: number;
  readonly createdAt: string;
}

export interface B2cOrderDetailResponse extends B2cOrderSummaryResponse {
  readonly lines: readonly B2cOrderLineResponse[];
}

export interface B2bPurchaseOrderLineResponse {
  readonly id: string;
  readonly catalogItemId: string;
  readonly gender: Gender;
  readonly size: Size;
  readonly b2cDemandedQuantity: number;
  readonly finalQuantity: number;
  readonly b2bUnitCost: number;
  readonly lineTotalCost: number;
  readonly itemNameSnapshot?: string;
  readonly garmentStyleSnapshot: string;
  readonly colorReferenceSnapshot: string;
  readonly frontVisualStorageSnapshot: string | null;
  readonly backVisualStorageSnapshot: string | null;
}

export interface B2bPurchaseOrderResponse {
  readonly id: string;
  readonly clientId: string;
  readonly b2cOrderId: string;
  readonly poNumber: string;
  readonly supplierName?: string;
  readonly status: B2bOrderStatus;
  readonly totalB2bCost: number;
  readonly poPdfStorageKey?: string | null;
  readonly lines: readonly B2bPurchaseOrderLineResponse[];
  readonly createdAt: string;
}

export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly instance: string;
  readonly errorCode: ErrorCode;
  readonly timestamp: string;
}
