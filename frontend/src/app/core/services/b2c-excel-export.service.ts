import { Injectable } from '@angular/core';
import {
  ALL_PRODUCT_TYPES,
  AdminCatalogItemResponse,
  B2cCatalogItemResponse,
  B2cOrderDetailResponse,
  B2cOrderLineResponse,
  ClientResponse,
  ClientStockResponse,
  formatSizeLabelFr,
} from '../models/uniform.models';

type CatalogItemAny = AdminCatalogItemResponse | B2cCatalogItemResponse;

export interface ExcelCell {
  readonly value: string | number;
  readonly type?: 'string' | 'number' | 'currency';
  readonly styleId?: number;
}

export interface ExcelWorksheetSpec {
  readonly name: string;
  readonly columnWidths: readonly number[];
  readonly rows: readonly (readonly ExcelCell[])[];
}

/**
 * Générateur natif de fichiers Microsoft Excel (.xlsx — OpenXML SpreadsheetML).
 * Produit un classeur multi-onglets exploitable directement dans Excel, Numbers, LibreOffice et Google Sheets
 * (en-têtes stylisés, largeurs de colonnes ajustées, cellules numériques typées pour formules et tableaux croisés dynamiques).
 */
@Injectable({ providedIn: 'root' })
export class B2cExcelExportService {
  generateEstablishmentOrdersExcelBlob(
    client: ClientResponse,
    orders: readonly B2cOrderDetailResponse[],
    catalogItems: readonly CatalogItemAny[],
    stocks: readonly ClientStockResponse[]
  ): Blob {
    const itemMap = new Map<string, CatalogItemAny>();
    for (const item of catalogItems) {
      itemMap.set(item.id, item);
    }

    const sheet1 = this.buildClientPackagesSheet(client, orders, itemMap);
    const sheet2 = this.buildDetailedLinesSheet(client, orders, itemMap);
    const sheet3 = this.buildProductSizeSummarySheet(orders, itemMap, stocks);
    const sheet4 = this.buildSectionsSummarySheet(client, orders);

    const xlsxBytes = this.buildXlsxArchive([sheet1, sheet2, sheet3, sheet4]);
    return new Blob([xlsxBytes.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  private buildClientPackagesSheet(
    client: ClientResponse,
    orders: readonly B2cOrderDetailResponse[],
    itemMap: ReadonlyMap<string, CatalogItemAny>
  ): ExcelWorksheetSpec {
    // Style IDs: 1 = Header Navy, 2 = Text normal, 3 = Number integer, 4 = Currency 0.00, 5 = Bold Total row, 6 = Bold Total Currency
    const headerRow: ExcelCell[] = [
      { value: 'Établissement', styleId: 1 },
      { value: 'N° Commande Globale', styleId: 1 },
      { value: 'Statut Commande', styleId: 1 },
      { value: 'Date Commande', styleId: 1 },
      { value: 'Section / Classe', styleId: 1 },
      { value: 'Client / Parent', styleId: 1 },
      { value: 'Téléphone', styleId: 1 },
      { value: 'Email', styleId: 1 },
      { value: 'N° Justificatif(s)', styleId: 1 },
      { value: 'Articles Commandés (Détail du Colis Client)', styleId: 1 },
      { value: 'Nombre d’Articles', styleId: 1 },
      { value: 'Total Payé Espèces TTC (DH)', styleId: 1 },
      { value: 'Statut Distribution', styleId: 1 },
    ];

    const rows: ExcelCell[][] = [headerRow];
    let grandTotalUnits = 0;
    let grandTotalCash = 0;

    for (const order of orders) {
      const buyerGroups = new Map<string, B2cOrderLineResponse[]>();
      for (const line of order.lines) {
        const secKey = (line.sectionName ?? '').trim().toLowerCase();
        const key = `${line.buyerFullName.trim().toLowerCase()}|${line.buyerPhone.trim()}|${secKey}`;
        const list = buyerGroups.get(key) ?? [];
        list.push(line);
        buyerGroups.set(key, list);
      }

      for (const buyerLines of buyerGroups.values()) {
        const first = buyerLines[0];
        const receipts = buyerLines.map((l) => l.receiptNumber).join(', ');
        const itemsSummary = buyerLines
          .map((l) => {
            const item = itemMap.get(l.catalogItemId);
            const itemName = item?.name ?? 'Tenue scolaire';
            const sizeFr = formatSizeLabelFr(l.size);
            const genderFr = this.translateGenderFr(l.gender);
            return `${l.quantity}x ${itemName} (${genderFr} - ${sizeFr})`;
          })
          .join(' | ');

        const pkgQty = buyerLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
        const pkgCash = buyerLines.reduce((sum, l) => sum + Number(l.lineCashAmount || 0), 0);
        const allDelivered = buyerLines.every((l) => l.lineStatus === 'DELIVERED');
        const someDelivered = buyerLines.some((l) => l.lineStatus === 'DELIVERED');
        const deliveryStatus = allDelivered
          ? 'Remis au client'
          : someDelivered
            ? 'Partiellement remis'
            : 'En attente de remise';

        grandTotalUnits += pkgQty;
        grandTotalCash += pkgCash;

        rows.push([
          { value: client.name, styleId: 2 },
          { value: order.orderNumber, styleId: 2 },
          { value: this.translateOrderStatusFr(order.status), styleId: 2 },
          { value: this.formatDateFr(first.createdAt || order.createdAt), styleId: 2 },
          { value: first.sectionName || 'Non spécifiée', styleId: 2 },
          { value: first.buyerFullName, styleId: 2 },
          { value: first.buyerPhone || '—', styleId: 2 },
          { value: first.buyerEmail || '—', styleId: 2 },
          { value: receipts, styleId: 2 },
          { value: itemsSummary, styleId: 2 },
          { value: pkgQty, type: 'number', styleId: 3 },
          { value: Math.round(pkgCash * 100) / 100, type: 'currency', styleId: 4 },
          { value: deliveryStatus, styleId: 2 },
        ]);
      }
    }

    rows.push([
      { value: 'TOTAL GÉNÉRAL ÉTABLISSEMENT', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: `${rows.length - 1} client(s)`, styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: grandTotalUnits, type: 'number', styleId: 5 },
      { value: Math.round(grandTotalCash * 100) / 100, type: 'currency', styleId: 6 },
      { value: '', styleId: 5 },
    ]);

    return {
      name: '1_Commandes_Par_Client',
      columnWidths: [26, 20, 18, 18, 22, 26, 18, 24, 24, 52, 18, 24, 22],
      rows,
    };
  }

  private buildDetailedLinesSheet(
    client: ClientResponse,
    orders: readonly B2cOrderDetailResponse[],
    itemMap: ReadonlyMap<string, CatalogItemAny>
  ): ExcelWorksheetSpec {
    const headerRow: ExcelCell[] = [
      { value: 'Établissement', styleId: 1 },
      { value: 'N° Commande Globale', styleId: 1 },
      { value: 'Statut Commande', styleId: 1 },
      { value: 'N° Justificatif', styleId: 1 },
      { value: 'Date & Heure Achat', styleId: 1 },
      { value: 'Section / Classe', styleId: 1 },
      { value: 'Client / Parent', styleId: 1 },
      { value: 'Téléphone', styleId: 1 },
      { value: 'Email', styleId: 1 },
      { value: 'Référence Article', styleId: 1 },
      { value: 'Catégorie Produit', styleId: 1 },
      { value: 'Désignation Article', styleId: 1 },
      { value: 'Coloris', styleId: 1 },
      { value: 'Coupe / Genre', styleId: 1 },
      { value: 'Taille', styleId: 1 },
      { value: 'Quantité', styleId: 1 },
      { value: 'Prix Unitaire TTC (DH)', styleId: 1 },
      { value: 'Montant Total TTC (DH)', styleId: 1 },
      { value: 'Statut Distribution', styleId: 1 },
    ];

    const rows: ExcelCell[][] = [headerRow];
    let totalUnits = 0;
    let totalCash = 0;

    for (const order of orders) {
      for (const line of order.lines) {
        const item = itemMap.get(line.catalogItemId);
        const typeLabel =
          ALL_PRODUCT_TYPES.find((p) => p.code === item?.productType)?.label ??
          item?.productType ??
          'Tenue';
        const qty = Number(line.quantity || 0);
        const unitPrice = Number(line.b2cUnitPrice || 0);
        const lineAmount = Number(line.lineCashAmount || 0);

        totalUnits += qty;
        totalCash += lineAmount;

        rows.push([
          { value: client.name, styleId: 2 },
          { value: order.orderNumber, styleId: 2 },
          { value: this.translateOrderStatusFr(order.status), styleId: 2 },
          { value: line.receiptNumber, styleId: 2 },
          { value: this.formatDateFr(line.createdAt || order.createdAt), styleId: 2 },
          { value: line.sectionName || 'Non spécifiée', styleId: 2 },
          { value: line.buyerFullName, styleId: 2 },
          { value: line.buyerPhone || '—', styleId: 2 },
          { value: line.buyerEmail || '—', styleId: 2 },
          { value: item?.referenceCode ?? '—', styleId: 2 },
          { value: typeLabel, styleId: 2 },
          { value: item?.name ?? 'Tenue scolaire', styleId: 2 },
          { value: item?.colorReference ?? '—', styleId: 2 },
          { value: this.translateGenderFr(line.gender), styleId: 2 },
          { value: formatSizeLabelFr(line.size), styleId: 2 },
          { value: qty, type: 'number', styleId: 3 },
          { value: Math.round(unitPrice * 100) / 100, type: 'currency', styleId: 4 },
          { value: Math.round(lineAmount * 100) / 100, type: 'currency', styleId: 4 },
          {
            value: line.lineStatus === 'DELIVERED' ? 'Distribuée' : 'En attente de remise',
            styleId: 2,
          },
        ]);
      }
    }

    rows.push([
      { value: 'TOTAL GÉNÉRAL', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: `${rows.length - 1} ligne(s)`, styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: totalUnits, type: 'number', styleId: 5 },
      { value: '', styleId: 5 },
      { value: Math.round(totalCash * 100) / 100, type: 'currency', styleId: 6 },
      { value: '', styleId: 5 },
    ]);

    return {
      name: '2_Detail_Articles_Commandes',
      columnWidths: [24, 18, 16, 18, 18, 20, 24, 16, 22, 16, 18, 28, 18, 15, 14, 12, 18, 20, 20],
      rows,
    };
  }

  private buildProductSizeSummarySheet(
    orders: readonly B2cOrderDetailResponse[],
    itemMap: ReadonlyMap<string, CatalogItemAny>,
    stocks: readonly ClientStockResponse[]
  ): ExcelWorksheetSpec {
    const headerRow: ExcelCell[] = [
      { value: 'Référence Article', styleId: 1 },
      { value: 'Catégorie Produit', styleId: 1 },
      { value: 'Désignation Article', styleId: 1 },
      { value: 'Coloris', styleId: 1 },
      { value: 'Coupe / Genre', styleId: 1 },
      { value: 'Taille', styleId: 1 },
      { value: 'Quantité Totale Commandée', styleId: 1 },
      { value: 'Quantité Distribuée', styleId: 1 },
      { value: 'Reste à Distribuer', styleId: 1 },
      { value: 'Stock Disponible Actuel', styleId: 1 },
      { value: 'Chiffre d’Affaires TTC (DH)', styleId: 1 },
    ];

    const variantAgg = new Map<
      string,
      {
        catalogItemId: string;
        gender: string;
        size: string;
        orderedQty: number;
        deliveredQty: number;
        pendingQty: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      for (const line of order.lines) {
        const key = `${line.catalogItemId}::${line.gender}::${line.size}`;
        const cur = variantAgg.get(key) ?? {
          catalogItemId: line.catalogItemId,
          gender: line.gender,
          size: line.size,
          orderedQty: 0,
          deliveredQty: 0,
          pendingQty: 0,
          revenue: 0,
        };
        const qty = Number(line.quantity || 0);
        cur.orderedQty += qty;
        if (line.lineStatus === 'DELIVERED') {
          cur.deliveredQty += qty;
        } else {
          cur.pendingQty += qty;
        }
        cur.revenue += Number(line.lineCashAmount || 0);
        variantAgg.set(key, cur);
      }
    }

    const rows: ExcelCell[][] = [headerRow];
    let sumOrdered = 0;
    let sumDelivered = 0;
    let sumPending = 0;
    let sumRevenue = 0;

    for (const agg of variantAgg.values()) {
      const item = itemMap.get(agg.catalogItemId);
      const typeLabel =
        ALL_PRODUCT_TYPES.find((p) => p.code === item?.productType)?.label ??
        item?.productType ??
        'Tenue';
      const stockMatch = stocks.find(
        (s) =>
          s.catalogItemId === agg.catalogItemId &&
          s.gender === agg.gender &&
          s.size === agg.size
      );
      const stockQty = stockMatch ? stockMatch.availableQuantity : 0;

      sumOrdered += agg.orderedQty;
      sumDelivered += agg.deliveredQty;
      sumPending += agg.pendingQty;
      sumRevenue += agg.revenue;

      rows.push([
        { value: item?.referenceCode ?? '—', styleId: 2 },
        { value: typeLabel, styleId: 2 },
        { value: item?.name ?? 'Tenue scolaire', styleId: 2 },
        { value: item?.colorReference ?? '—', styleId: 2 },
        { value: this.translateGenderFr(agg.gender), styleId: 2 },
        { value: formatSizeLabelFr(agg.size), styleId: 2 },
        { value: agg.orderedQty, type: 'number', styleId: 3 },
        { value: agg.deliveredQty, type: 'number', styleId: 3 },
        { value: agg.pendingQty, type: 'number', styleId: 3 },
        { value: stockQty, type: 'number', styleId: 3 },
        { value: Math.round(agg.revenue * 100) / 100, type: 'currency', styleId: 4 },
      ]);
    }

    rows.push([
      { value: 'TOTAL VARIANTES', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: '', styleId: 5 },
      { value: sumOrdered, type: 'number', styleId: 5 },
      { value: sumDelivered, type: 'number', styleId: 5 },
      { value: sumPending, type: 'number', styleId: 5 },
      { value: '', styleId: 5 },
      { value: Math.round(sumRevenue * 100) / 100, type: 'currency', styleId: 6 },
    ]);

    return {
      name: '3_Synthese_Produits_Tailles',
      columnWidths: [18, 20, 30, 18, 16, 16, 24, 20, 20, 22, 24],
      rows,
    };
  }

  private buildSectionsSummarySheet(
    client: ClientResponse,
    orders: readonly B2cOrderDetailResponse[]
  ): ExcelWorksheetSpec {
    const headerRow: ExcelCell[] = [
      { value: 'Section / Classe', styleId: 1 },
      { value: 'Capacité Configurée', styleId: 1 },
      { value: 'Nombre de Clients (Parents)', styleId: 1 },
      { value: 'Total Articles Commandés', styleId: 1 },
      { value: 'Total Encaissé TTC (DH)', styleId: 1 },
    ];

    const secStats = new Map<
      string,
      {
        name: string;
        capacity: number;
        buyersSet: Set<string>;
        totalUnits: number;
        totalCash: number;
      }
    >();

    for (const sec of client.sections ?? []) {
      secStats.set(sec.name.trim().toLowerCase(), {
        name: sec.name,
        capacity: sec.capacity,
        buyersSet: new Set<string>(),
        totalUnits: 0,
        totalCash: 0,
      });
    }

    for (const order of orders) {
      for (const line of order.lines) {
        const secName = (line.sectionName ?? 'Non spécifiée').trim() || 'Non spécifiée';
        const secKey = secName.toLowerCase();
        let entry = secStats.get(secKey);
        if (!entry) {
          entry = {
            name: secName,
            capacity: 0,
            buyersSet: new Set<string>(),
            totalUnits: 0,
            totalCash: 0,
          };
          secStats.set(secKey, entry);
        }
        entry.buyersSet.add(`${line.buyerFullName.trim().toLowerCase()}|${line.buyerPhone.trim()}`);
        entry.totalUnits += Number(line.quantity || 0);
        entry.totalCash += Number(line.lineCashAmount || 0);
      }
    }

    const rows: ExcelCell[][] = [headerRow];
    let sumCap = 0;
    let sumBuyers = 0;
    let sumUnits = 0;
    let sumCash = 0;

    for (const st of secStats.values()) {
      sumCap += st.capacity;
      sumBuyers += st.buyersSet.size;
      sumUnits += st.totalUnits;
      sumCash += st.totalCash;

      rows.push([
        { value: st.name, styleId: 2 },
        { value: st.capacity, type: 'number', styleId: 3 },
        { value: st.buyersSet.size, type: 'number', styleId: 3 },
        { value: st.totalUnits, type: 'number', styleId: 3 },
        { value: Math.round(st.totalCash * 100) / 100, type: 'currency', styleId: 4 },
      ]);
    }

    rows.push([
      { value: 'TOTAL SECTIONS', styleId: 5 },
      { value: sumCap, type: 'number', styleId: 5 },
      { value: sumBuyers, type: 'number', styleId: 5 },
      { value: sumUnits, type: 'number', styleId: 5 },
      { value: Math.round(sumCash * 100) / 100, type: 'currency', styleId: 6 },
    ]);

    return {
      name: '4_Synthese_Par_Section',
      columnWidths: [28, 22, 26, 24, 24],
      rows,
    };
  }

  private buildXlsxArchive(sheets: readonly ExcelWorksheetSpec[]): Uint8Array {
    const encoder = new TextEncoder();
    const files: { path: string; data: Uint8Array }[] = [];

    const sheetOverrides = sheets
      .map(
        (_, idx) =>
          `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('');

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const workbookSheetsXml = sheets
      .map(
        (s, idx) =>
          `<sheet name="${this.escapeXml(s.name.slice(0, 31))}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
      )
      .join('');

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheetsXml}</sheets>
</workbook>`;

    const workbookRelsEntries = sheets
      .map(
        (_, idx) =>
          `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
      )
      .join('');

    const stylesRelId = sheets.length + 1;
    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRelsEntries}
  <Relationship Id="rId${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0.00&quot; DH&quot;"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF047857"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;

    files.push({ path: '[Content_Types].xml', data: encoder.encode(contentTypesXml) });
    files.push({ path: '_rels/.rels', data: encoder.encode(rootRelsXml) });
    files.push({ path: 'xl/workbook.xml', data: encoder.encode(workbookXml) });
    files.push({ path: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRelsXml) });
    files.push({ path: 'xl/styles.xml', data: encoder.encode(stylesXml) });

    sheets.forEach((sheet, idx) => {
      const xml = this.buildWorksheetXml(sheet);
      files.push({ path: `xl/worksheets/sheet${idx + 1}.xml`, data: encoder.encode(xml) });
    });

    return this.packZipStore(files);
  }

  private buildWorksheetXml(sheet: ExcelWorksheetSpec): string {
    const colsXml = sheet.columnWidths
      .map(
        (w, idx) =>
          `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
      )
      .join('');

    const rowsXml = sheet.rows
      .map((row, rIdx) => {
        const rowNum = rIdx + 1;
        const rowHeight = rIdx === 0 ? '26' : '20';
        const cellsXml = row
          .map((cell, cIdx) => {
            const cellRef = `${this.colIndexToLetter(cIdx)}${rowNum}`;
            const styleAttr = cell.styleId !== undefined ? ` s="${cell.styleId}"` : '';
            if (
              (cell.type === 'number' || cell.type === 'currency') &&
              typeof cell.value === 'number' &&
              Number.isFinite(cell.value)
            ) {
              return `<c r="${cellRef}"${styleAttr}><v>${cell.value}</v></c>`;
            }
            return `<c r="${cellRef}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${this.escapeXml(
              String(cell.value ?? '')
            )}</t></is></c>`;
          })
          .join('');
        return `<row r="${rowNum}" ht="${rowHeight}" customHeight="1">${cellsXml}</row>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
  }

  private colIndexToLetter(index: number): string {
    let n = index;
    let letter = '';
    while (n >= 0) {
      letter = String.fromCharCode((n % 26) + 65) + letter;
      n = Math.floor(n / 26) - 1;
    }
    return letter;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private packZipStore(files: readonly { path: string; data: Uint8Array }[]): Uint8Array {
    const encoder = new TextEncoder();
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.path);
      const crc = this.crc32(file.data);
      const size = file.data.byteLength;

      const localHeader = new Uint8Array(30 + nameBytes.byteLength);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); // UTF-8
      lv.setUint16(8, 0, true); // Store (0 = no compression)
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.byteLength, true);
      lv.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      const centralHeader = new Uint8Array(46 + nameBytes.byteLength);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.byteLength, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      localParts.push(localHeader, file.data);
      centralParts.push(centralHeader);
      offset += localHeader.byteLength + size;
    }

    const centralOffset = offset;
    const centralSize = centralParts.reduce((acc, p) => acc + p.byteLength, 0);

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralOffset, true);
    ev.setUint16(20, 0, true);

    const totalLen = centralOffset + centralSize + 22;
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const p of localParts) {
      out.set(p, pos);
      pos += p.byteLength;
    }
    for (const p of centralParts) {
      out.set(p, pos);
      pos += p.byteLength;
    }
    out.set(eocd, pos);
    return out;
  }

  private crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.byteLength; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private formatDateFr(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso.slice(0, 10);
    }
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private translateOrderStatusFr(status: string): string {
    switch (status) {
      case 'IN_PROGRESS':
        return 'En cours';
      case 'IN_PRODUCTION':
        return 'En fabrication';
      case 'IN_DELIVERY':
        return 'En livraison';
      case 'DELIVERED':
        return 'Livrée';
      default:
        return status;
    }
  }

  private translateGenderFr(gender: string): string {
    switch (gender) {
      case 'MEN':
        return 'Homme';
      case 'WOMEN':
        return 'Femme';
      case 'UNISEX':
        return 'Unisexe';
      case 'KIDS':
        return 'Enfant';
      default:
        return gender;
    }
  }
}
