export type Gender = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';

export type AdultSize = 'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'XXXXL';
export type KidsSize =
  | 'AGE_2'
  | 'AGE_4'
  | 'AGE_6'
  | 'AGE_8'
  | 'AGE_10'
  | 'AGE_12'
  | 'AGE_14'
  | 'AGE_16';
export type NumericSize =
  | '28'
  | '30'
  | '32'
  | '34'
  | '35'
  | '36'
  | '37'
  | '38'
  | '39'
  | '40'
  | '41'
  | '42'
  | '43'
  | '44'
  | '45'
  | '46'
  | '48'
  | '50'
  | '52';
export type Size = AdultSize | KidsSize | NumericSize | 'TU' | string;

export type ClientType = 'PRIMARY_SCHOOL' | 'SECONDARY_SCHOOL' | 'ORGANIZATION';

export type ProductType =
  | 'POLO'
  | 'SHIRT'
  | 'TRACKSUIT'
  | 'SWEATSHIRT'
  | 'CARDIGAN'
  | 'TROUSERS_SKIRT'
  | 'BLOUSE'
  | 'JACKET'
  | 'SHOES'
  | 'ACCESSORY'
  | string;

export type SizeSystemFormat = 'ALPHA' | 'NUMERIC' | 'AGE' | 'ONE_SIZE' | 'CUSTOM';
export type SizeTargetAudience = 'ADULT' | 'KIDS' | 'UNIVERSAL';
export type ProductSilhouette = 'TOP_SHORT' | 'TOP_LONG' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';

export interface SizeGridConfig {
  readonly id: string;
  readonly name: string;
  readonly format: SizeSystemFormat;
  readonly audience: SizeTargetAudience;
  readonly description: string;
  readonly sizes: readonly string[];
  readonly isSystem?: boolean;
}

export interface ProductTypeConfig {
  readonly code: string;
  readonly label: string;
  readonly silhouette: ProductSilhouette;
  readonly sizeGridIds: readonly string[];
  readonly defaultSizes: readonly string[];
  readonly isSystem?: boolean;
}

export interface CatalogConfiguration {
  readonly sizeGrids: readonly SizeGridConfig[];
  readonly productTypes: readonly ProductTypeConfig[];
}

export const DEFAULT_SIZE_GRIDS: readonly SizeGridConfig[] = [
  {
    id: 'ALPHA_ADULT',
    name: 'Tailles Lettres Standard (XS à 3XL)',
    format: 'ALPHA',
    audience: 'ADULT',
    description: 'Grille internationale en lettres pour hauts, polos, sweats, pulls et vestes adultes/lycée.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    isSystem: true,
  },
  {
    id: 'KIDS_AGE',
    name: 'Tailles Enfant par Âge (2 à 14 ans)',
    format: 'AGE',
    audience: 'KIDS',
    description: 'Grille scolaire enfance & primaire exprimée par tranche d’âge (2 ans à 14 ans).',
    sizes: ['AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'],
    isSystem: true,
  },
  {
    id: 'NUMERIC_CONTINUOUS',
    name: 'Tailles en Nombres Continus (36, 37, 38, 39, 40...)',
    format: 'NUMERIC',
    audience: 'UNIVERSAL',
    description: 'Pointures chaussures/baskets, tours de cou chemises ou tailles numériques continues.',
    sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    isSystem: true,
  },
  {
    id: 'NUMERIC_TAILOR',
    name: 'Tailles Numériques Confection / Pantalons (34, 36, 38, 40...)',
    format: 'NUMERIC',
    audience: 'UNIVERSAL',
    description: 'Tailles françaises par pas de 2 (34 à 48) pour pantalons, jupes, bermudas et tailleurs.',
    sizes: ['34', '36', '38', '40', '42', '44', '46', '48'],
    isSystem: true,
  },
  {
    id: 'ONE_SIZE',
    name: 'Taille Unique (TU)',
    format: 'ONE_SIZE',
    audience: 'UNIVERSAL',
    description: 'Pour les accessoires sans déclinaison de pointure (cravate, foulard, casquette, sac).',
    sizes: ['TU'],
    isSystem: true,
  },
];

export const DEFAULT_PRODUCT_TYPE_CONFIGS: readonly ProductTypeConfig[] = [
  {
    code: 'POLO',
    label: 'Polo',
    silhouette: 'TOP_SHORT',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_2',
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
      'XXXL',
    ],
    isSystem: true,
  },
  {
    code: 'SHIRT',
    label: 'Chemise',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT', 'NUMERIC_CONTINUOUS'],
    defaultSizes: [
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
    ],
    isSystem: true,
  },
  {
    code: 'TROUSERS_SKIRT',
    label: 'Pantalon / Jupe',
    silhouette: 'BOTTOM',
    sizeGridIds: ['KIDS_AGE', 'NUMERIC_TAILOR', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      '34',
      '36',
      '38',
      '40',
      '42',
      '44',
      '46',
      '48',
    ],
    isSystem: true,
  },
  {
    code: 'TRACKSUIT',
    label: 'Combinaison sport',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_2',
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
    ],
    isSystem: true,
  },
  {
    code: 'SWEATSHIRT',
    label: 'Sweat à capuche',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
      'XXXL',
    ],
    isSystem: true,
  },
  {
    code: 'CARDIGAN',
    label: 'Pull / Cardigan',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_2',
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
    ],
    isSystem: true,
  },
  {
    code: 'BLOUSE',
    label: 'Blouse / Tablier',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT'],
    defaultSizes: [
      'AGE_2',
      'AGE_4',
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
    ],
    isSystem: true,
  },
  {
    code: 'JACKET',
    label: 'Veste / Blazer',
    silhouette: 'TOP_LONG',
    sizeGridIds: ['KIDS_AGE', 'ALPHA_ADULT', 'NUMERIC_TAILOR'],
    defaultSizes: [
      'AGE_6',
      'AGE_8',
      'AGE_10',
      'AGE_12',
      'AGE_14',
      'XS',
      'S',
      'M',
      'L',
      'XL',
      'XXL',
    ],
    isSystem: true,
  },
  {
    code: 'SHOES',
    label: 'Chaussures / Baskets',
    silhouette: 'SHOES',
    sizeGridIds: ['NUMERIC_CONTINUOUS'],
    defaultSizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
    isSystem: true,
  },
  {
    code: 'ACCESSORY',
    label: 'Accessoire / Cravate / Casquette',
    silhouette: 'ACCESSORY',
    sizeGridIds: ['ONE_SIZE'],
    defaultSizes: ['TU'],
    isSystem: true,
  },
];

export const DEFAULT_CATALOG_CONFIGURATION: CatalogConfiguration = {
  sizeGrids: DEFAULT_SIZE_GRIDS,
  productTypes: DEFAULT_PRODUCT_TYPE_CONFIGS,
};

export const ALL_PRODUCT_TYPES: readonly { readonly code: ProductType; readonly label: string }[] =
  DEFAULT_PRODUCT_TYPE_CONFIGS.map((pt) => ({ code: pt.code, label: pt.label }));

export const ADULT_SIZES: readonly AdultSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const KIDS_SIZES: readonly KidsSize[] = ['AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14'];
export const NUMERIC_CONTINUOUS_SIZES: readonly string[] = [
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
];
export const NUMERIC_TAILOR_SIZES: readonly string[] = ['34', '36', '38', '40', '42', '44', '46', '48'];
export const ALL_GENDERS: readonly Gender[] = ['MEN', 'WOMEN', 'UNISEX', 'KIDS'];
export const ALL_CLIENT_TYPES: readonly ClientType[] = ['PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'ORGANIZATION'];

export function isStrictAdultAlphaSize(size: string): boolean {
  return ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', '2XL', '3XL', '4XL', '5XL'].includes(
    size.trim().toUpperCase()
  );
}

export function isStrictKidsAgeSize(size: string): boolean {
  const normalized = size.trim().toUpperCase();
  return normalized.startsWith('AGE_') || /^\d+\s*ANS$/i.test(normalized);
}

export function formatSizeLabelFr(size: string | null | undefined, verbose = false): string {
  if (!size) {
    return '';
  }
  const raw = size.trim();
  const upper = raw.toUpperCase();
  if (upper.startsWith('AGE_')) {
    const years = upper.replace('AGE_', '');
    return `${years} ans`;
  }
  if (upper.startsWith('SIZE_')) {
    return upper.replace('SIZE_', '');
  }
  if (upper === 'TU' || upper === 'ONE_SIZE') {
    return verbose ? 'TU (Taille Unique)' : 'TU';
  }
  if (verbose) {
    const verboseMap: Record<string, string> = {
      XXS: 'XXS (Très Très Petit)',
      XS: 'XS (Très Petit)',
      S: 'S (Petit)',
      M: 'M (Moyen)',
      L: 'L (Grand)',
      XL: 'XL (Très Grand)',
      XXL: 'XXL (Double XL)',
      XXXL: 'XXXL (Triple XL)',
      XXXXL: '4XL (Quadruple XL)',
    };
    if (verboseMap[upper]) {
      return verboseMap[upper];
    }
    if (/^\d+$/.test(raw)) {
      return `Taille ${raw}`;
    }
  }
  return raw;
}

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
  const configuredList = item.availableSizes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (configuredList.length === 0) {
    return baseSizes;
  }
  const isKidsContext = clientType === 'PRIMARY_SCHOOL' || gender === 'KIDS';
  const filtered = configuredList.filter((sz) =>
    isKidsContext ? !isStrictAdultAlphaSize(sz) : !isStrictKidsAgeSize(sz)
  );
  return filtered.length > 0 ? filtered : configuredList;
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
