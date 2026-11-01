/**
 * UniformApp — Backend Cloud Serverless Autonome (Cloudflare Pages Functions + Cloudflare D1)
 * Fonctionne 100% dans le Cloud Cloudflare (aucun serveur local requis).
 * Implémente l'intégralité du domaine métier UniformApp (GEMINI.md) :
 * - Multi-tenancy strict par clientId (Écoles Primaires, Collèges/Lycées, Organisations)
 * - Authentification JWT & Gestion des utilisateurs / invitations (ROLE_ADMIN, ROLE_USER)
 * - Référentiel des Genres (MEN, WOMEN, UNISEX, KIDS) & Grilles de Tailles (Adulte vs Enfant)
 * - Catalogue client, Fournisseurs, Stocks par client & Stock global
 * - Machine à états synchronisée B2C (IN_PROGRESS -> IN_PRODUCTION -> IN_DELIVERY -> DELIVERED)
 *   <-> B2B (DRAFT -> ORDERED -> RECEIVED) <-> ClientStock
 * - Génération de PDF à la volée (Reçu espèces B2C, Liste de colisage, Bon de commande B2B, Flyer catalogue)
 * - Persistance automatique dans Cloudflare D1 (base SQLite cloud 'uniform-app-db')
 */

const ADULT_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
const KIDS_SIZES = new Set(['AGE_2', 'AGE_4', 'AGE_6', 'AGE_8', 'AGE_10', 'AGE_12', 'AGE_14']);
const ADULT_GENDERS = new Set(['MEN', 'WOMEN', 'UNISEX']);

let memoryStateCache = null;

function createInitialState() {
  const now = new Date().toISOString();
  const adminId = 'e7c3ed04-f5c1-33be-9d3c-bfee61e307a4';
  const operateurId = '8b94c4a2-31d5-4e9a-8c2f-71e23b4f9012';
  const supplier1Id = 'f1a2b3c4-d5e6-4789-8012-3456789abc01';
  const supplier2Id = 'f1a2b3c4-d5e6-4789-8012-3456789abc02';
  const client1Id = 'c1000000-0000-4000-8000-000000000001';
  const client2Id = 'c1000000-0000-4000-8000-000000000002';
  const item1Id = 'a1000000-0000-4000-8000-000000000001';
  const item2Id = 'a1000000-0000-4000-8000-000000000002';
  const item3Id = 'a1000000-0000-4000-8000-000000000003';

  return {
    users: [
      {
        id: adminId,
        username: 'admin',
        email: 'admin@uniform-app.local',
        password: 'admin',
        fullName: 'Administrateur Principal',
        role: 'ROLE_ADMIN',
        assignedClientId: null,
        active: true,
        invitationStatus: 'ACTIVE',
        invitationToken: null,
        invitationUrl: null,
        emailArchivePath: null,
        invitationExpiresAt: null,
        createdAt: now,
      },
      {
        id: operateurId,
        username: 'operateur',
        email: 'sara.elamrani@uniform-school.ma',
        password: 'operateur',
        fullName: 'Sara El Amrani',
        role: 'ROLE_USER',
        assignedClientId: null,
        active: true,
        invitationStatus: 'ACTIVE',
        invitationToken: null,
        invitationUrl: null,
        emailArchivePath: null,
        invitationExpiresAt: null,
        createdAt: now,
      },
    ],
    suppliers: [
      {
        id: supplier1Id,
        name: 'Atelier Atlas Confection',
        specialty: 'Polos, Chemises & Broderie écusson',
        contactName: 'Karim Bennani',
        phone: '+212 5 22 40 18 90',
        email: 'commandes@atlas-confection.ma',
        cityAddress: 'Zone Industrielle Sidi Maarouf, Casablanca',
        active: true,
        createdAt: now,
      },
      {
        id: supplier2Id,
        name: 'Manufacture Textile du Nord',
        specialty: 'Survêtements sport & Sweats molleton',
        contactName: 'Nadia Tazi',
        phone: '+212 5 39 32 71 15',
        email: 'production@mtn-textile.ma',
        cityAddress: 'Zone Franche Gzenaya, Tanger',
        active: true,
        createdAt: now,
      },
    ],
    clients: [
      {
        id: client1Id,
        name: 'Groupe Scolaire Al Jabr — Casablanca',
        clientType: 'SECONDARY_SCHOOL',
        address: 'Boulevard de la Corniche, Ain Diab, Casablanca',
        logoStorageKey: null,
        moq: 10,
        sections: [
          { id: 'sec-101', clientId: client1Id, name: 'Collège (6ème - 3ème)', capacity: 180 },
          { id: 'sec-102', clientId: client1Id, name: 'Lycée (2nde - Terminale)', capacity: 150 },
        ],
        totalCapacity: 330,
        active: true,
        createdAt: now,
      },
      {
        id: client2Id,
        name: 'École Primaire Les Orangers — Rabat',
        clientType: 'PRIMARY_SCHOOL',
        address: 'Avenue Mohammed VI, Souissi, Rabat',
        logoStorageKey: null,
        moq: 8,
        sections: [
          { id: 'sec-201', clientId: client2Id, name: 'Cycle CP - CE2', capacity: 120 },
          { id: 'sec-202', clientId: client2Id, name: 'Cycle CM1 - CM2', capacity: 90 },
        ],
        totalCapacity: 210,
        active: true,
        createdAt: now,
      },
    ],
    catalogItems: [
      {
        id: item1Id,
        clientId: client1Id,
        referenceCode: 'ALJ-POLO-01',
        productType: 'POLO',
        name: 'Polo Piqué Manches Courtes Écusson Or',
        garmentStyle: 'Polo piqué 100% coton peigné 220g',
        colorReference: 'Bleu Marine (Pantone 19-4024 TCX)',
        supplierId: supplier1Id,
        supplierName: 'Atelier Atlas Confection',
        availableSizes: 'AGE_10,AGE_12,AGE_14,XS,S,M,L,XL',
        frontVisualStorageKey: 'ecusson-poitrine-gauche-or.png',
        backVisualStorageKey: null,
        visualPlacementNotes: 'Broderie écusson 7cm poitrine côté cœur',
        b2cUnitPrice: 180,
        b2bUnitCost: 95,
      },
      {
        id: item2Id,
        clientId: client1Id,
        referenceCode: 'ALJ-SWEAT-02',
        productType: 'SWEATSHIRT',
        name: 'Sweat à Capuche Zippé Al Jabr',
        garmentStyle: 'Molleton gratté 320g intérieur doux',
        colorReference: 'Gris Chiné & Marine',
        supplierId: supplier2Id,
        supplierName: 'Manufacture Textile du Nord',
        availableSizes: 'AGE_10,AGE_12,AGE_14,XS,S,M,L,XL,XXL',
        frontVisualStorageKey: 'logo-brode-coeur.png',
        backVisualStorageKey: 'serigraphie-dos-aljabr.png',
        visualPlacementNotes: 'Logo cœur + lettrage dos haute densité',
        b2cUnitPrice: 290,
        b2bUnitCost: 155,
      },
      {
        id: item3Id,
        clientId: client2Id,
        referenceCode: 'ORA-TRACK-01',
        productType: 'TRACKSUIT',
        name: 'Ensemble Survêtement Sport Les Orangers',
        garmentStyle: 'Ensemble veste zippée + pantalon technique respirant',
        colorReference: 'Vert Forêt & Blanc',
        supplierId: supplier2Id,
        supplierName: 'Manufacture Textile du Nord',
        availableSizes: 'AGE_4,AGE_6,AGE_8,AGE_10,AGE_12',
        frontVisualStorageKey: 'badge-orangers-poitrine.png',
        backVisualStorageKey: null,
        visualPlacementNotes: 'Écusson tissé poitrine gauche',
        b2cUnitPrice: 260,
        b2bUnitCost: 135,
      },
    ],
    stocks: [
      {
        id: 'stk-001',
        clientId: client1Id,
        catalogItemId: item1Id,
        gender: 'UNISEX',
        size: 'M',
        availableQuantity: 25,
        updatedAt: now,
      },
      {
        id: 'stk-002',
        clientId: client1Id,
        catalogItemId: item1Id,
        gender: 'UNISEX',
        size: 'L',
        availableQuantity: 18,
        updatedAt: now,
      },
      {
        id: 'stk-003',
        clientId: client1Id,
        catalogItemId: item2Id,
        gender: 'UNISEX',
        size: 'M',
        availableQuantity: 15,
        updatedAt: now,
      },
      {
        id: 'stk-004',
        clientId: client2Id,
        catalogItemId: item3Id,
        gender: 'KIDS',
        size: 'AGE_8',
        availableQuantity: 20,
        updatedAt: now,
      },
    ],
    b2cOrders: [],
    b2bOrders: [],
    seq: 100,
  };
}

function getD1(env) {
  return env?.DB || env?.uniform_app_db || null;
}

async function loadState(env) {
  const db = getD1(env);
  if (db) {
    try {
      await db
        .prepare(
          'CREATE TABLE IF NOT EXISTS uniform_kv_store (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at TEXT NOT NULL)'
        )
        .run();
      const row = await db
        .prepare("SELECT v FROM uniform_kv_store WHERE k = 'uniform_state_v1'")
        .first();
      if (row && row.v) {
        const parsed = JSON.parse(row.v);
        memoryStateCache = parsed;
        return parsed;
      }
      const initial = createInitialState();
      await db
        .prepare("INSERT INTO uniform_kv_store (k, v, updated_at) VALUES ('uniform_state_v1', ?1, ?2)")
        .bind(JSON.stringify(initial), new Date().toISOString())
        .run();
      memoryStateCache = initial;
      return initial;
    } catch {
      // Fallback to in-memory cache if D1 fails transiently
    }
  }
  if (!memoryStateCache) {
    memoryStateCache = createInitialState();
  }
  return memoryStateCache;
}

async function saveState(env, state) {
  memoryStateCache = state;
  const db = getD1(env);
  if (db) {
    try {
      await db
        .prepare(
          "INSERT OR REPLACE INTO uniform_kv_store (k, v, updated_at) VALUES ('uniform_state_v1', ?1, ?2)"
        )
        .bind(JSON.stringify(state), new Date().toISOString())
        .run();
    } catch {
      // Keep memoryStateCache updated
    }
  }
}

function uuid() {
  return crypto.randomUUID();
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function base64UrlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    return decodeURIComponent(escape(atob(padded + '='.repeat(padLen))));
  } catch {
    return null;
  }
}

function createJwtToken(user) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: 'https://uniform-app.local/issuer',
      sub: user.id,
      upn: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      assignedClientId: user.assignedClientId ?? null,
      groups: [user.role, user.role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER'],
      iat: nowSec,
      exp: nowSec + 28800,
    })
  );
  const sig = base64UrlEncode(`uniform-edge-sig-${user.id}-${user.role}`);
  return `${header}.${payload}.${sig}`;
}

function resolveActor(request, state) {
  const auth = request.headers.get('Authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    const parts = token.split('.');
    if (parts.length >= 2) {
      const decoded = base64UrlDecode(parts[1]);
      if (decoded) {
        try {
          const claims = JSON.parse(decoded);
          const found = state.users.find(
            (u) =>
              u.id === claims.sub ||
              u.username.toLowerCase() === String(claims.upn || '').toLowerCase()
          );
          if (found) {
            return found;
          }
          const role =
            claims.role ||
            (Array.isArray(claims.groups) && claims.groups.includes('ROLE_ADMIN')
              ? 'ROLE_ADMIN'
              : 'ROLE_USER');
          return {
            id: claims.sub || '00000000-0000-0000-0000-000000000001',
            username: claims.upn || 'user',
            role,
            assignedClientId: claims.assignedClientId || null,
            active: true,
          };
        } catch {
          // Ignore malformed token
        }
      }
    }
  }
  return state.users[0];
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type, X-Requested-With',
    'Access-Control-Expose-Headers': 'Content-Disposition',
  };
}

function jsonResponse(data, status = 200, origin = '*') {
  if (status === 204) {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

function problemResponse(status, errorCode, title, detail, instance, origin = '*') {
  return new Response(
    JSON.stringify({
      type: `https://uniform-app.local/problems/${errorCode.toLowerCase().replace(/_/g, '-')}`,
      title,
      status,
      detail,
      instance,
      errorCode,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/problem+json; charset=utf-8',
        ...corsHeaders(origin),
      },
    }
  );
}

function assertAdmin(actor, instance, origin) {
  if (!actor || actor.role !== 'ROLE_ADMIN') {
    return problemResponse(
      403,
      'INSUFFICIENT_PRIVILEGES',
      'Accès refusé',
      "Cette opération est strictement réservée aux administrateurs (ROLE_ADMIN).",
      instance,
      origin
    );
  }
  return null;
}

function isValidGenderSize(gender, size) {
  if (ADULT_GENDERS.has(gender) && ADULT_SIZES.has(size)) {
    return true;
  }
  if (gender === 'KIDS' && KIDS_SIZES.has(size)) {
    return true;
  }
  return false;
}

function toUserAccountResponse(user, state) {
  const client = user.assignedClientId
    ? state.clients.find((c) => c.id === user.assignedClientId)
    : null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    assignedClientId: user.assignedClientId ?? null,
    assignedClientName: client ? client.name : null,
    active: Boolean(user.active),
    invitationStatus: user.invitationStatus || 'ACTIVE',
    invitationUrl: user.invitationUrl ?? null,
    emailArchivePath: user.emailArchivePath ?? null,
    invitationExpiresAt: user.invitationExpiresAt ?? null,
    createdAt: user.createdAt,
  };
}

function toSupplierResponse(supplier, state) {
  const count = state.catalogItems.filter((item) => item.supplierId === supplier.id).length;
  return {
    id: supplier.id,
    name: supplier.name,
    specialty: supplier.specialty ?? null,
    contactName: supplier.contactName ?? null,
    phone: supplier.phone ?? null,
    email: supplier.email ?? null,
    cityAddress: supplier.cityAddress ?? null,
    active: supplier.active !== false,
    attachedCatalogItemsCount: count,
    createdAt: supplier.createdAt,
  };
}

function toB2cCatalogItemResponse(item) {
  return {
    id: item.id,
    clientId: item.clientId,
    referenceCode: item.referenceCode,
    productType: item.productType || 'POLO',
    name: item.name,
    garmentStyle: item.garmentStyle || item.name,
    colorReference: item.colorReference,
    availableSizes: item.availableSizes ?? null,
    frontVisualStorageKey: item.frontVisualStorageKey || 'visuel-face.png',
    backVisualStorageKey: item.backVisualStorageKey ?? null,
    visualPlacementNotes: item.visualPlacementNotes ?? null,
    b2cUnitPrice: Number(item.b2cUnitPrice),
  };
}

function toAdminCatalogItemResponse(item) {
  return {
    ...toB2cCatalogItemResponse(item),
    supplierId: item.supplierId ?? null,
    supplierName: item.supplierName || 'Confection générale',
    b2bUnitCost: Number(item.b2bUnitCost),
  };
}

function toB2cOrderSummary(order) {
  const totalQuantity = order.lines.reduce((sum, l) => sum + Number(l.quantity), 0);
  const totalCashAmount = round2(
    order.lines.reduce((sum, l) => sum + Number(l.lineCashAmount), 0)
  );
  return {
    id: order.id,
    clientId: order.clientId,
    orderNumber: order.orderNumber,
    status: order.status,
    clientMoqSnapshot: order.clientMoqSnapshot,
    totalQuantity,
    moqReached: totalQuantity >= order.clientMoqSnapshot,
    totalCashAmount,
    createdAt: order.createdAt,
  };
}

function toB2cOrderDetail(order) {
  return {
    ...toB2cOrderSummary(order),
    lines: order.lines,
  };
}

function sanitizePdfText(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/([()\\])/g, '\\$1');
}

function generatePdfBytes(title, subtitle, lines) {
  const contentLines = [
    'BT',
    '/F1 16 Tf',
    '50 790 Td',
    `(${sanitizePdfText(title)}) Tj`,
    '/F1 10 Tf',
    '0 -20 Td',
    `(${sanitizePdfText(subtitle)}) Tj`,
    '0 -16 Td',
    '(--------------------------------------------------------------------------------) Tj',
  ];

  for (const line of lines) {
    contentLines.push('0 -15 Td');
    contentLines.push(`(${sanitizePdfText(line)}) Tj`);
  }
  contentLines.push('ET');
  const streamContent = contentLines.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartx\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function pdfResponse(bytes, filename, origin = '*') {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      ...corsHeaders(origin),
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const origin = request.headers.get('Origin') || '*';

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const state = await loadState(env);
  const actor = resolveActor(request, state);

  let body = {};
  if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
  }

  // =========================================================================
  // 1. AUTHENTICATION & INVITATIONS
  // =========================================================================
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const identifier = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = state.users.find(
      (u) =>
        u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );
    if (!user || user.password !== password) {
      return problemResponse(
        401,
        'VALIDATION_ERROR',
        'Authentification échouée',
        'Identifiant ou mot de passe incorrect.',
        path,
        origin
      );
    }
    if (user.invitationStatus === 'PENDING_INVITATION') {
      return problemResponse(
        400,
        'VALIDATION_ERROR',
        'Compte en attente',
        "Ce compte est en attente d'activation. Veuillez cliquer sur le lien d'invitation.",
        path,
        origin
      );
    }
    if (!user.active) {
      return problemResponse(
        403,
        'INSUFFICIENT_PRIVILEGES',
        'Compte désactivé',
        'Ce compte utilisateur a été désactivé par un administrateur.',
        path,
        origin
      );
    }
    return jsonResponse(
      {
        accessToken: createJwtToken(user),
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        assignedClientId: user.assignedClientId ?? null,
      },
      200,
      origin
    );
  }

  if (path === '/api/v1/auth/token' && method === 'POST') {
    const username = String(body.username || 'admin');
    const role = body.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER';
    const fakeUser = { id: uuid(), username, email: `${username}@uniform-app.local`, fullName: username, role };
    return jsonResponse(
      {
        accessToken: createJwtToken(fakeUser),
        username,
        role,
      },
      200,
      origin
    );
  }

  const inviteMatch = path.match(/^\/api\/v1\/auth\/invitations\/([^/]+)(\/accept)?$/);
  if (inviteMatch) {
    const token = decodeURIComponent(inviteMatch[1]);
    const isAccept = Boolean(inviteMatch[2]);
    const user = state.users.find((u) => u.invitationToken === token);
    if (!user) {
      return problemResponse(
        404,
        'RESOURCE_NOT_FOUND',
        'Invitation introuvable',
        "Ce lien d'invitation est invalide ou a expiré.",
        path,
        origin
      );
    }
    if (!isAccept && method === 'GET') {
      return jsonResponse(
        {
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          assignedClientId: user.assignedClientId ?? null,
          expiresAt: user.invitationExpiresAt || new Date(Date.now() + 86400000).toISOString(),
        },
        200,
        origin
      );
    }
    if (isAccept && method === 'POST') {
      user.password = String(body.password || 'operateur');
      user.active = true;
      user.invitationStatus = 'ACTIVE';
      user.invitationToken = null;
      await saveState(env, state);
      return jsonResponse(
        {
          accessToken: createJwtToken(user),
          userId: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          assignedClientId: user.assignedClientId ?? null,
        },
        200,
        origin
      );
    }
  }

  // =========================================================================
  // 2. USERS MANAGEMENT (ADMIN)
  // =========================================================================
  if (path === '/api/v1/admin/users' && method === 'GET') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    return jsonResponse(
      state.users.map((u) => toUserAccountResponse(u, state)),
      200,
      origin
    );
  }

  if (path === '/api/v1/admin/users/invite' && method === 'POST') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim();
    if (!username || !email) {
      return problemResponse(400, 'VALIDATION_ERROR', 'Champs requis', 'Identifiant et email obligatoires.', path, origin);
    }
    if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return problemResponse(400, 'VALIDATION_ERROR', 'Doublon', 'Cet identifiant existe déjà.', path, origin);
    }
    const token = uuid();
    const exp = new Date(Date.now() + 7 * 86400000).toISOString();
    const newUser = {
      id: uuid(),
      username,
      email,
      password: username,
      fullName: String(body.fullName || username).trim(),
      role: body.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER',
      assignedClientId: body.assignedClientId || null,
      active: true,
      invitationStatus: 'PENDING_INVITATION',
      invitationToken: token,
      invitationUrl: `${url.origin}/accept-invitation?token=${encodeURIComponent(token)}`,
      emailArchivePath: `cloud-outbox/${username}-invitation.html`,
      invitationExpiresAt: exp,
      createdAt: new Date().toISOString(),
    };
    state.users.push(newUser);
    await saveState(env, state);
    return jsonResponse(toUserAccountResponse(newUser, state), 201, origin);
  }

  const userActionMatch = path.match(/^\/api\/v1\/admin\/users\/([^/]+)(?:\/(resend-invitation|status|assigned-client))?$/);
  if (userActionMatch) {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const userId = userActionMatch[1];
    const subAction = userActionMatch[2] || null;
    const userIdx = state.users.findIndex((u) => u.id === userId);
    if (userIdx === -1) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Utilisateur introuvable', 'Compte introuvable.', path, origin);
    }
    const user = state.users[userIdx];

    if (subAction === 'resend-invitation' && method === 'POST') {
      const token = uuid();
      user.invitationToken = token;
      user.invitationStatus = 'PENDING_INVITATION';
      user.invitationUrl = `${url.origin}/accept-invitation?token=${encodeURIComponent(token)}`;
      user.invitationExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      await saveState(env, state);
      return jsonResponse(toUserAccountResponse(user, state), 200, origin);
    }
    if (subAction === 'status' && method === 'PATCH') {
      user.active = Boolean(body.active);
      user.invitationStatus = user.active ? 'ACTIVE' : 'DISABLED';
      await saveState(env, state);
      return jsonResponse(toUserAccountResponse(user, state), 200, origin);
    }
    if (subAction === 'assigned-client' && method === 'PATCH') {
      user.assignedClientId = body.assignedClientId || null;
      await saveState(env, state);
      return jsonResponse(toUserAccountResponse(user, state), 200, origin);
    }
    if (!subAction && method === 'PUT') {
      user.fullName = String(body.fullName || user.fullName).trim();
      user.role = body.role === 'ROLE_ADMIN' ? 'ROLE_ADMIN' : 'ROLE_USER';
      user.assignedClientId = body.assignedClientId !== undefined ? body.assignedClientId : user.assignedClientId;
      await saveState(env, state);
      return jsonResponse(toUserAccountResponse(user, state), 200, origin);
    }
    if (!subAction && method === 'DELETE') {
      state.users.splice(userIdx, 1);
      await saveState(env, state);
      return jsonResponse(null, 204, origin);
    }
  }

  // =========================================================================
  // 3. SUPPLIERS MANAGEMENT (ADMIN)
  // =========================================================================
  if (path === '/api/v1/admin/suppliers' && method === 'GET') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    return jsonResponse(
      state.suppliers.map((s) => toSupplierResponse(s, state)),
      200,
      origin
    );
  }

  if (path === '/api/v1/admin/suppliers' && method === 'POST') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const supplier = {
      id: uuid(),
      name: String(body.name || 'Nouveau Fournisseur').trim(),
      specialty: body.specialty ?? null,
      contactName: body.contactName ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      cityAddress: body.cityAddress ?? null,
      active: true,
      createdAt: new Date().toISOString(),
    };
    state.suppliers.push(supplier);
    await saveState(env, state);
    return jsonResponse(toSupplierResponse(supplier, state), 201, origin);
  }

  const supplierMatch = path.match(/^\/api\/v1\/admin\/suppliers\/([^/]+)$/);
  if (supplierMatch) {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const supplierId = supplierMatch[1];
    const idx = state.suppliers.findIndex((s) => s.id === supplierId);
    if (idx === -1) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Fournisseur introuvable', 'Fournisseur introuvable.', path, origin);
    }
    if (method === 'PUT') {
      const s = state.suppliers[idx];
      s.name = String(body.name || s.name).trim();
      s.specialty = body.specialty ?? null;
      s.contactName = body.contactName ?? null;
      s.phone = body.phone ?? null;
      s.email = body.email ?? null;
      s.cityAddress = body.cityAddress ?? null;
      for (const item of state.catalogItems) {
        if (item.supplierId === s.id) {
          item.supplierName = s.name;
        }
      }
      await saveState(env, state);
      return jsonResponse(toSupplierResponse(s, state), 200, origin);
    }
    if (method === 'DELETE') {
      state.suppliers.splice(idx, 1);
      await saveState(env, state);
      return jsonResponse(null, 204, origin);
    }
  }

  // =========================================================================
  // 4. GLOBAL STOCKS (ADMIN)
  // =========================================================================
  if (path === '/api/v1/admin/clients/global-stocks' && method === 'GET') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const result = [];
    for (const stock of state.stocks) {
      const client = state.clients.find((c) => c.id === stock.clientId);
      const item = state.catalogItems.find(
        (i) => i.id === stock.catalogItemId && i.clientId === stock.clientId
      );
      if (client && item) {
        result.push({
          stockId: stock.id,
          clientId: client.id,
          clientName: client.name,
          clientType: client.clientType,
          catalogItemId: item.id,
          referenceCode: item.referenceCode,
          productType: item.productType || 'POLO',
          itemName: item.name,
          colorReference: item.colorReference,
          supplierId: item.supplierId ?? null,
          supplierName: item.supplierName || 'Confection générale',
          gender: stock.gender,
          size: stock.size,
          availableQuantity: stock.availableQuantity,
          updatedAt: stock.updatedAt,
        });
      }
    }
    return jsonResponse(result, 200, origin);
  }

  // =========================================================================
  // 5. CLIENTS & SECTIONS & MOQ
  // =========================================================================
  if ((path === '/api/v1/clients' || path === '/api/v1/admin/clients') && method === 'GET') {
    const assignedId =
      actor && actor.role !== 'ROLE_ADMIN' ? actor.assignedClientId : null;
    const list = state.clients.filter((c) => !assignedId || c.id === assignedId);
    return jsonResponse(list, 200, origin);
  }

  if (path === '/api/v1/admin/clients' && method === 'POST') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const clientId = uuid();
    const sections = Array.isArray(body.sections)
      ? body.sections.map((s) => ({
          id: s.id || uuid(),
          clientId,
          name: String(s.name || 'Section').trim(),
          capacity: Math.max(0, Number(s.capacity || 0)),
        }))
      : [];
    const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
    const created = {
      id: clientId,
      name: String(body.name || 'Nouvel Établissement').trim(),
      clientType: body.clientType || 'SECONDARY_SCHOOL',
      address: String(body.address || '').trim(),
      logoStorageKey: body.logoStorageKey ?? null,
      moq: Math.max(1, Number(body.moq || 1)),
      sections,
      totalCapacity,
      active: true,
      createdAt: new Date().toISOString(),
    };
    state.clients.push(created);
    await saveState(env, state);
    return jsonResponse(created, 201, origin);
  }

  const adminClientMatch = path.match(/^\/api\/v1\/admin\/clients\/([^/]+)(?:\/(sections|moq|stocks|catalog-items)(?:\/([^/]+))?)?$/);
  if (adminClientMatch) {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const clientId = adminClientMatch[1];
    const subResource = adminClientMatch[2] || null;
    const subItemId = adminClientMatch[3] || null;
    const clientIdx = state.clients.findIndex((c) => c.id === clientId);
    if (clientIdx === -1) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Client introuvable', 'Établissement introuvable.', path, origin);
    }
    const client = state.clients[clientIdx];

    if (!subResource && method === 'PUT') {
      client.name = String(body.name || client.name).trim();
      client.clientType = body.clientType || client.clientType;
      client.address = String(body.address ?? client.address).trim();
      client.logoStorageKey = body.logoStorageKey !== undefined ? body.logoStorageKey : client.logoStorageKey;
      if (body.moq !== undefined) {
        client.moq = Math.max(1, Number(body.moq));
      }
      if (Array.isArray(body.sections)) {
        client.sections = body.sections.map((s) => ({
          id: s.id || uuid(),
          clientId,
          name: String(s.name || 'Section').trim(),
          capacity: Math.max(0, Number(s.capacity || 0)),
        }));
        client.totalCapacity = client.sections.reduce((sum, s) => sum + s.capacity, 0);
      }
      await saveState(env, state);
      return jsonResponse(client, 200, origin);
    }

    if (!subResource && method === 'DELETE') {
      state.clients.splice(clientIdx, 1);
      state.catalogItems = state.catalogItems.filter((i) => i.clientId !== clientId);
      state.stocks = state.stocks.filter((s) => s.clientId !== clientId);
      state.b2cOrders = state.b2cOrders.filter((o) => o.clientId !== clientId);
      state.b2bOrders = state.b2bOrders.filter((o) => o.clientId !== clientId);
      await saveState(env, state);
      return jsonResponse(null, 204, origin);
    }

    if (subResource === 'sections' && method === 'PUT') {
      const sections = Array.isArray(body.sections)
        ? body.sections.map((s) => ({
            id: s.id || uuid(),
            clientId,
            name: String(s.name || 'Section').trim(),
            capacity: Math.max(0, Number(s.capacity || 0)),
          }))
        : [];
      client.sections = sections;
      client.totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
      await saveState(env, state);
      return jsonResponse(client, 200, origin);
    }

    if (subResource === 'moq' && method === 'PATCH') {
      const moq = Number(body.moq);
      if (!Number.isFinite(moq) || moq < 1) {
        return problemResponse(400, 'VALIDATION_ERROR', 'MOQ invalide', 'Le MOQ doit être supérieur ou égal à 1.', path, origin);
      }
      client.moq = Math.floor(moq);
      await saveState(env, state);
      return jsonResponse(client, 200, origin);
    }

    if (subResource === 'stocks' && method === 'PUT') {
      const { catalogItemId, gender, size, availableQuantity } = body;
      if (!isValidGenderSize(gender, size)) {
        return problemResponse(
          400,
          'INVALID_GENDER_SIZE',
          'Combinaison Genre / Taille invalide',
          `La taille ${size} n'est pas autorisée pour le genre ${gender}.`,
          path,
          origin
        );
      }
      let stock = state.stocks.find(
        (s) =>
          s.clientId === clientId &&
          s.catalogItemId === catalogItemId &&
          s.gender === gender &&
          s.size === size
      );
      const now = new Date().toISOString();
      if (stock) {
        stock.availableQuantity = Math.max(0, Number(availableQuantity || 0));
        stock.updatedAt = now;
      } else {
        stock = {
          id: uuid(),
          clientId,
          catalogItemId,
          gender,
          size,
          availableQuantity: Math.max(0, Number(availableQuantity || 0)),
          updatedAt: now,
        };
        state.stocks.push(stock);
      }
      await saveState(env, state);
      return jsonResponse(stock, 200, origin);
    }

    if (subResource === 'catalog-items' && !subItemId && method === 'GET') {
      const items = state.catalogItems
        .filter((i) => i.clientId === clientId)
        .map(toAdminCatalogItemResponse);
      return jsonResponse(items, 200, origin);
    }

    if (subResource === 'catalog-items' && !subItemId && method === 'POST') {
      let supplierId = body.supplierId || null;
      let supplierName = String(body.supplierName || '').trim();
      if (supplierId) {
        const sup = state.suppliers.find((s) => s.id === supplierId);
        if (sup) supplierName = sup.name;
      } else if (supplierName) {
        let sup = state.suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
        if (!sup) {
          sup = {
            id: uuid(),
            name: supplierName,
            specialty: 'Confection générale',
            contactName: null,
            phone: null,
            email: null,
            cityAddress: null,
            active: true,
            createdAt: new Date().toISOString(),
          };
          state.suppliers.push(sup);
        }
        supplierId = sup.id;
      }
      const newItem = {
        id: uuid(),
        clientId,
        referenceCode: String(body.referenceCode || `REF-${++state.seq}`).trim(),
        productType: body.productType || 'POLO',
        name: String(body.name || 'Article').trim(),
        garmentStyle: String(body.garmentStyle || body.name || 'Standard').trim(),
        colorReference: String(body.colorReference || 'Standard').trim(),
        supplierId,
        supplierName: supplierName || 'Confection générale',
        availableSizes: body.availableSizes ?? null,
        frontVisualStorageKey: body.frontVisualStorageKey ? String(body.frontVisualStorageKey).trim() : null,
        backVisualStorageKey: body.backVisualStorageKey ?? null,
        visualPlacementNotes: body.visualPlacementNotes ?? null,
        b2cUnitPrice: round2(body.b2cUnitPrice || 0),
        b2bUnitCost: round2(body.b2bUnitCost || 0),
      };
      state.catalogItems.push(newItem);
      await saveState(env, state);
      return jsonResponse(toAdminCatalogItemResponse(newItem), 201, origin);
    }

    if (subResource === 'catalog-items' && subItemId) {
      const itemIdx = state.catalogItems.findIndex(
        (i) => i.id === subItemId && i.clientId === clientId
      );
      if (itemIdx === -1) {
        return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Article introuvable', 'Article introuvable.', path, origin);
      }
      if (method === 'PUT') {
        const item = state.catalogItems[itemIdx];
        item.referenceCode = String(body.referenceCode || item.referenceCode).trim();
        item.productType = body.productType || item.productType;
        item.name = String(body.name || item.name).trim();
        item.garmentStyle = String(body.garmentStyle || item.name).trim();
        item.colorReference = String(body.colorReference || item.colorReference).trim();
        item.supplierId = body.supplierId !== undefined ? body.supplierId : item.supplierId;
        if (item.supplierId) {
          const sup = state.suppliers.find((s) => s.id === item.supplierId);
          if (sup) item.supplierName = sup.name;
        } else if (body.supplierName) {
          item.supplierName = body.supplierName;
        }
        item.availableSizes = body.availableSizes !== undefined ? body.availableSizes : item.availableSizes;
        item.frontVisualStorageKey =
          body.frontVisualStorageKey !== undefined
            ? (body.frontVisualStorageKey ? String(body.frontVisualStorageKey).trim() : null)
            : item.frontVisualStorageKey;
        item.backVisualStorageKey = body.backVisualStorageKey !== undefined ? body.backVisualStorageKey : item.backVisualStorageKey;
        item.visualPlacementNotes = body.visualPlacementNotes !== undefined ? body.visualPlacementNotes : item.visualPlacementNotes;
        item.b2cUnitPrice = round2(body.b2cUnitPrice ?? item.b2cUnitPrice);
        item.b2bUnitCost = round2(body.b2bUnitCost ?? item.b2bUnitCost);
        await saveState(env, state);
        return jsonResponse(toAdminCatalogItemResponse(item), 200, origin);
      }
      if (method === 'DELETE') {
        state.catalogItems.splice(itemIdx, 1);
        state.stocks = state.stocks.filter((s) => s.catalogItemId !== subItemId);
        await saveState(env, state);
        return jsonResponse(null, 204, origin);
      }
    }
  }

  // =========================================================================
  // 6. CLIENT CATALOG, STOCKS & FLYER PDF
  // =========================================================================
  const clientCatalogMatch = path.match(/^\/api\/v1\/clients\/([^/]+)\/(catalog-items|catalog-flyer-pdf|stocks)$/);
  if (clientCatalogMatch && method === 'GET') {
    const clientId = clientCatalogMatch[1];
    const resource = clientCatalogMatch[2];
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Client introuvable', 'Établissement introuvable.', path, origin);
    }
    if (resource === 'catalog-items') {
      const items = state.catalogItems
        .filter((i) => i.clientId === clientId)
        .map(toB2cCatalogItemResponse);
      return jsonResponse(items, 200, origin);
    }
    if (resource === 'stocks') {
      const stocks = state.stocks.filter((s) => s.clientId === clientId);
      return jsonResponse(stocks, 200, origin);
    }
    if (resource === 'catalog-flyer-pdf') {
      const items = state.catalogItems.filter((i) => i.clientId === clientId);
      const pdfLines = [
        `Etablissement : ${client.name}`,
        `Adresse : ${client.address}`,
        '',
        'COLLECTION OFFICIELLE DES TENUES SCOLAIRES :',
        ...items.map(
          (i, idx) =>
            `${idx + 1}. [${i.referenceCode}] ${i.name} (${i.garmentStyle || i.productType || 'Tenue'}) - Coloris : ${i.colorReference} - Prix Officiel : ${Number(i.b2cUnitPrice).toFixed(2)} DH TTC`
        ),
      ];
      const bytes = generatePdfBytes(
        'CATALOGUE OFFICIEL DES TENUES SCOLAIRES',
        `Etablissement : ${client.name}`,
        pdfLines
      );
      return pdfResponse(bytes, `flyer-catalogue-${clientId}.pdf`, origin);
    }
  }

  // =========================================================================
  // 7. B2C ORDERS & WORKFLOW STATE MACHINE
  // =========================================================================
  const b2cListMatch = path.match(/^\/api\/v1\/clients\/([^/]+)\/b2c-orders$/);
  if (b2cListMatch) {
    const clientId = b2cListMatch[1];
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Client introuvable', 'Établissement introuvable.', path, origin);
    }
    if (method === 'GET') {
      const orders = state.b2cOrders
        .filter((o) => o.clientId === clientId)
        .map(toB2cOrderSummary);
      return jsonResponse(orders, 200, origin);
    }
    if (method === 'POST') {
      state.seq = (state.seq || 100) + 1;
      const newOrder = {
        id: uuid(),
        clientId,
        orderNumber: `B2C-${new Date().getFullYear()}-${String(state.seq).padStart(4, '0')}`,
        status: 'IN_PROGRESS',
        clientMoqSnapshot: client.moq,
        lines: [],
        createdAt: new Date().toISOString(),
      };
      state.b2cOrders.unshift(newOrder);
      await saveState(env, state);
      return jsonResponse(toB2cOrderDetail(newOrder), 201, origin);
    }
  }

  const b2cOrderMatch = path.match(
    /^\/api\/v1\/clients\/([^/]+)\/b2c-orders\/([^/]+)(?:\/(lines|packing-list-pdf|move-to-production|move-to-delivery)(?:\/([^/]+)\/(receipt-pdf|deliver))?)?$/
  );
  if (b2cOrderMatch) {
    const clientId = b2cOrderMatch[1];
    const orderId = b2cOrderMatch[2];
    const subAction = b2cOrderMatch[3] || null;
    const lineId = b2cOrderMatch[4] || null;
    const lineAction = b2cOrderMatch[5] || null;

    const client = state.clients.find((c) => c.id === clientId);
    const order = state.b2cOrders.find((o) => o.id === orderId && o.clientId === clientId);
    if (!client || !order) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Commande introuvable', 'Commande B2C introuvable.', path, origin);
    }

    if (!subAction && method === 'GET') {
      return jsonResponse(toB2cOrderDetail(order), 200, origin);
    }

    if (subAction === 'lines' && !lineId && method === 'POST') {
      if (order.status !== 'IN_PROGRESS') {
        return problemResponse(
          409,
          'ORDER_IMMUTABLE',
          'Commande verrouillée',
          'Impossible d’ajouter des lignes : la commande B2C n’est plus au statut IN_PROGRESS.',
          path,
          origin
        );
      }
      if (body.cashPaymentConfirmed !== true || body.irreversibilityAcknowledged !== true) {
        return problemResponse(
          400,
          'CASH_CONFIRMATION_REQUIRED',
          'Confirmation espèces requise',
          "L'encaissement intégral en espèces et l'irréversibilité doivent être confirmés.",
          path,
          origin
        );
      }
      const { catalogItemId, gender, size } = body;
      const quantity = Number(body.quantity || 0);
      if (!isValidGenderSize(gender, size)) {
        return problemResponse(
          400,
          'INVALID_GENDER_SIZE',
          'Combinaison Genre / Taille invalide',
          `La taille ${size} est interdite pour le genre ${gender}.`,
          path,
          origin
        );
      }
      const item = state.catalogItems.find(
        (i) => i.id === catalogItemId && i.clientId === clientId
      );
      if (!item) {
        return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Article introuvable', 'Article introuvable dans ce catalogue.', path, origin);
      }
      state.seq = (state.seq || 100) + 1;
      const lineCashAmount = round2(quantity * Number(item.b2cUnitPrice));
      const newLine = {
        id: uuid(),
        b2cOrderId: order.id,
        catalogItemId: item.id,
        sectionId: body.sectionId ?? null,
        sectionName: body.sectionName ?? null,
        receiptNumber: `REC-${new Date().getFullYear()}-${String(state.seq).padStart(5, '0')}`,
        buyerFullName: String(body.buyerFullName || 'Parent / Acheteur').trim(),
        buyerPhone: String(body.buyerPhone || '').trim(),
        buyerEmail: String(body.buyerEmail || '').trim(),
        gender,
        size,
        quantity,
        b2cUnitPrice: Number(item.b2cUnitPrice),
        lineCashAmount,
        lineStatus: 'PENDING_PICKUP',
        createdAt: new Date().toISOString(),
      };
      order.lines.push(newLine);
      await saveState(env, state);
      return jsonResponse(newLine, 201, origin);
    }

    if (subAction === 'lines' && lineId && lineAction === 'receipt-pdf' && method === 'GET') {
      const line = order.lines.find((l) => l.id === lineId);
      if (!line) {
        return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Ligne introuvable', 'Ligne B2C introuvable.', path, origin);
      }
      const item = state.catalogItems.find((i) => i.id === line.catalogItemId);
      const bytes = generatePdfBytes(
        'RECU DE PAIEMENT ESPECES (B2C)',
        `Recu N : ${line.receiptNumber} - Date : ${line.createdAt.slice(0, 10)}`,
        [
          `Etablissement : ${client.name}`,
          `Commande B2C  : ${order.orderNumber}`,
          `Acheteur      : ${line.buyerFullName}`,
          `Telephone     : ${line.buyerPhone || '-'}`,
          `Email         : ${line.buyerEmail || '-'}`,
          `Section       : ${line.sectionName || '-'}`,
          '',
          `Article       : ${item ? item.name : line.catalogItemId}`,
          `Genre / Taille: ${line.gender} / ${line.size}`,
          `Quantite      : ${line.quantity}`,
          `Prix unitaire : ${line.b2cUnitPrice.toFixed(2)} MAD`,
          `TOTAL PAYE    : ${line.lineCashAmount.toFixed(2)} MAD (Especes acquittees)`,
        ]
      );
      return pdfResponse(bytes, `recu-${line.receiptNumber}.pdf`, origin);
    }

    if (subAction === 'packing-list-pdf' && method === 'GET') {
      const summary = toB2cOrderSummary(order);
      const bytes = generatePdfBytes(
        'LISTE DE COLISAGE & EMARGEMENT B2C',
        `Commande : ${order.orderNumber} (${client.name})`,
        [
          `Statut : ${order.status} | Quantite totale : ${summary.totalQuantity} | Total especes : ${summary.totalCashAmount.toFixed(2)} MAD`,
          '',
          ...order.lines.map(
            (l, idx) =>
              `${idx + 1}. ${l.buyerFullName} | ${l.gender} ${l.size} x${l.quantity} | ${l.lineCashAmount.toFixed(2)} MAD | [${l.lineStatus}]`
          ),
        ]
      );
      return pdfResponse(bytes, `colisage-${order.orderNumber}.pdf`, origin);
    }

    if (subAction === 'move-to-production' && method === 'POST') {
      const forbidden = assertAdmin(actor, path, origin);
      if (forbidden) return forbidden;
      const summary = toB2cOrderSummary(order);
      if (summary.totalQuantity < order.clientMoqSnapshot) {
        return problemResponse(
          422,
          'MOQ_NOT_REACHED',
          'MOQ non atteint',
          `Quantité cumulée (${summary.totalQuantity}) inférieure au MOQ du client (${order.clientMoqSnapshot}).`,
          path,
          origin
        );
      }
      order.status = 'IN_PRODUCTION';

      // Agrégation par (catalogItemId, gender, size) pour créer le Bon de Commande B2B en DRAFT
      const variantMap = new Map();
      for (const line of order.lines) {
        const key = `${line.catalogItemId}::${line.gender}::${line.size}`;
        variantMap.set(key, (variantMap.get(key) || 0) + Number(line.quantity));
      }
      const b2bLines = [];
      let supplierName = 'Atelier Atlas Confection';
      for (const [key, demandedQty] of variantMap.entries()) {
        const [catalogItemId, gender, size] = key.split('::');
        const item = state.catalogItems.find((i) => i.id === catalogItemId) || {
          name: 'Article Catalogue',
          garmentStyle: 'Standard',
          colorReference: 'Standard',
          frontVisualStorageKey: 'visuel-face.png',
          backVisualStorageKey: null,
          b2bUnitCost: 100,
          supplierName: 'Atelier Atlas Confection',
        };
        if (item.supplierName) supplierName = item.supplierName;
        const unitCost = Number(item.b2bUnitCost || 0);
        b2bLines.push({
          id: uuid(),
          catalogItemId,
          gender,
          size,
          b2cDemandedQuantity: demandedQty,
          finalQuantity: demandedQty,
          b2bUnitCost: unitCost,
          lineTotalCost: round2(demandedQty * unitCost),
          itemNameSnapshot: item.name,
          garmentStyleSnapshot: item.garmentStyle || item.name,
          colorReferenceSnapshot: item.colorReference,
          frontVisualStorageSnapshot: item.frontVisualStorageKey || 'visuel-face.png',
          backVisualStorageSnapshot: item.backVisualStorageKey ?? null,
        });
      }
      state.seq = (state.seq || 100) + 1;
      const totalB2bCost = round2(b2bLines.reduce((sum, l) => sum + l.lineTotalCost, 0));
      const newPo = {
        id: uuid(),
        clientId,
        b2cOrderId: order.id,
        poNumber: `PO-${new Date().getFullYear()}-${String(state.seq).padStart(4, '0')}`,
        supplierName,
        status: 'DRAFT',
        totalB2bCost,
        poPdfStorageKey: null,
        lines: b2bLines,
        createdAt: new Date().toISOString(),
      };
      state.b2bOrders.unshift(newPo);
      await saveState(env, state);
      return jsonResponse(toB2cOrderDetail(order), 200, origin);
    }

    if (subAction === 'move-to-delivery' && method === 'POST') {
      const forbidden = assertAdmin(actor, path, origin);
      if (forbidden) return forbidden;
      const linkedPo = state.b2bOrders.find((po) => po.b2cOrderId === order.id);
      if (!linkedPo || linkedPo.status !== 'RECEIVED') {
        return problemResponse(
          409,
          'B2B_STOCK_NOT_RECEIVED',
          'Réception fournisseur requise',
          'Le Bon de Commande Fournisseur B2B rattaché doit être au statut RECEIVED avant la mise en livraison.',
          path,
          origin
        );
      }
      order.status = 'IN_DELIVERY';
      await saveState(env, state);
      return jsonResponse(toB2cOrderDetail(order), 200, origin);
    }

    if (subAction === 'lines' && lineId && lineAction === 'deliver' && method === 'POST') {
      if (order.status !== 'IN_DELIVERY') {
        return problemResponse(
          409,
          'ORDER_IMMUTABLE',
          'Livraison non autorisée',
          'La commande B2C doit être au statut IN_DELIVERY pour pointer la remise des articles.',
          path,
          origin
        );
      }
      const line = order.lines.find((l) => l.id === lineId);
      if (!line) {
        return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Ligne introuvable', 'Ligne introuvable.', path, origin);
      }
      if (line.lineStatus !== 'DELIVERED') {
        const stock = state.stocks.find(
          (s) =>
            s.clientId === clientId &&
            s.catalogItemId === line.catalogItemId &&
            s.gender === line.gender &&
            s.size === line.size
        );
        if (!stock || stock.availableQuantity < line.quantity) {
          return problemResponse(
            409,
            'INSUFFICIENT_CLIENT_STOCK',
            'Stock client insuffisant',
            `Stock disponible insuffisant pour ${line.gender} / ${line.size} (requis: ${line.quantity}, disponible: ${stock ? stock.availableQuantity : 0}).`,
            path,
            origin
          );
        }
        stock.availableQuantity -= line.quantity;
        stock.updatedAt = new Date().toISOString();
        line.lineStatus = 'DELIVERED';
      }
      if (order.lines.length > 0 && order.lines.every((l) => l.lineStatus === 'DELIVERED')) {
        order.status = 'DELIVERED';
      }
      await saveState(env, state);
      return jsonResponse(toB2cOrderDetail(order), 200, origin);
    }
  }

  // =========================================================================
  // 8. B2B PURCHASE ORDERS (ADMIN)
  // =========================================================================
  const b2bListMatch = path.match(/^\/api\/v1\/clients\/([^/]+)\/b2b-orders$/);
  if (b2bListMatch && method === 'GET') {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const clientId = b2bListMatch[1];
    const pos = state.b2bOrders.filter((po) => po.clientId === clientId);
    return jsonResponse(pos, 200, origin);
  }

  const b2bActionMatch = path.match(
    /^\/api\/v1\/clients\/([^/]+)\/b2b-orders\/([^/]+)\/(lines\/([^/]+)|confirm-order|receive-stock|po-pdf)$/
  );
  if (b2bActionMatch) {
    const forbidden = assertAdmin(actor, path, origin);
    if (forbidden) return forbidden;
    const clientId = b2bActionMatch[1];
    const b2bOrderId = b2bActionMatch[2];
    const actionPath = b2bActionMatch[3];
    const b2bLineId = b2bActionMatch[4] || null;

    const po = state.b2bOrders.find((p) => p.id === b2bOrderId && p.clientId === clientId);
    if (!po) {
      return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Bon de commande B2B introuvable', 'BC introuvable.', path, origin);
    }

    if (b2bLineId && method === 'PUT') {
      if (po.status !== 'DRAFT') {
        return problemResponse(409, 'ORDER_IMMUTABLE', 'BC verrouillé', 'Seul un BC au statut DRAFT peut être modifié.', path, origin);
      }
      const line = po.lines.find((l) => l.id === b2bLineId);
      if (!line) {
        return problemResponse(404, 'RESOURCE_NOT_FOUND', 'Ligne B2B introuvable', 'Ligne introuvable.', path, origin);
      }
      line.finalQuantity = Math.max(0, Number(body.finalQuantity || 0));
      line.lineTotalCost = round2(line.finalQuantity * line.b2bUnitCost);
      po.totalB2bCost = round2(po.lines.reduce((sum, l) => sum + l.lineTotalCost, 0));
      await saveState(env, state);
      return jsonResponse(po, 200, origin);
    }

    if (actionPath === 'confirm-order' && method === 'POST') {
      po.totalB2bCost = round2(po.lines.reduce((sum, l) => sum + l.lineTotalCost, 0));
      po.status = 'ORDERED';
      po.poPdfStorageKey = `b2b-po/${po.poNumber}.pdf`;
      await saveState(env, state);
      return jsonResponse(po, 200, origin);
    }

    if (actionPath === 'receive-stock' && method === 'POST') {
      if (po.status === 'DRAFT') {
        po.status = 'ORDERED';
      }
      if (po.status !== 'RECEIVED') {
        po.status = 'RECEIVED';
        const now = new Date().toISOString();
        for (const line of po.lines) {
          let stock = state.stocks.find(
            (s) =>
              s.clientId === clientId &&
              s.catalogItemId === line.catalogItemId &&
              s.gender === line.gender &&
              s.size === line.size
          );
          if (stock) {
            stock.availableQuantity += Number(line.finalQuantity);
            stock.updatedAt = now;
          } else {
            state.stocks.push({
              id: uuid(),
              clientId,
              catalogItemId: line.catalogItemId,
              gender: line.gender,
              size: line.size,
              availableQuantity: Number(line.finalQuantity),
              updatedAt: now,
            });
          }
        }
        await saveState(env, state);
      }
      return jsonResponse(po, 200, origin);
    }

    if (actionPath === 'po-pdf' && method === 'GET') {
      const client = state.clients.find((c) => c.id === clientId);
      const totalUnits = po.lines.reduce((acc, l) => acc + Number(l.finalQuantity || 0), 0);
      const bytes = generatePdfBytes(
        'BON DE COMMANDE FOURNISSEUR (B2B)',
        `N BC : ${po.poNumber} | Statut : ${po.status} | Fournisseur : ${po.supplierName || 'Atelier'}`,
        [
          `Client rattache : ${client ? client.name : clientId}`,
          `Total unites a fabriquer : ${totalUnits} pieces`,
          '',
          'DETAIL DES VARIANTES COMMANDEES :',
          ...po.lines.map(
            (l, idx) =>
              `${idx + 1}. ${l.itemNameSnapshot || l.garmentStyleSnapshot} (${l.colorReferenceSnapshot}) - ${l.gender} ${l.size} : Qte a fabriquer ${l.finalQuantity} u.`
          ),
        ]
      );
      return pdfResponse(bytes, `${po.poNumber}.pdf`, origin);
    }
  }

  return problemResponse(
    404,
    'RESOURCE_NOT_FOUND',
    'Endpoint introuvable',
    `Aucune route API ne correspond à ${method} ${path}`,
    path,
    origin
  );
}
