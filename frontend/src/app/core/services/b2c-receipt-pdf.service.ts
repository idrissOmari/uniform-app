import { Injectable } from '@angular/core';
import {
  ALL_PRODUCT_TYPES,
  AdminCatalogItemResponse,
  B2cCatalogItemResponse,
  B2cOrderDetailResponse,
  B2cOrderLineResponse,
  ClientResponse,
  formatSizeLabelFr,
} from '../models/uniform.models';
import {
  getGarmentSvgDataUrl,
  isImageUrl,
  resolveGarmentPalette,
} from '../utils/image-upload.util';

type ReceiptCatalogItem = AdminCatalogItemResponse | B2cCatalogItemResponse;

@Injectable({ providedIn: 'root' })
export class B2cReceiptPdfGeneratorService {
  private static readonly PAGE_PT_W = 595.28;
  private static readonly PAGE_PT_H = 841.89;
  private static readonly CANVAS_W = 1240;
  private static readonly CANVAS_H = 1754;

  async generateReceiptPdfBlob(
    client: ClientResponse,
    order: B2cOrderDetailResponse,
    lines: readonly B2cOrderLineResponse[],
    catalogItems: readonly ReceiptCatalogItem[]
  ): Promise<Blob> {
    const safeLines = lines.length > 0 ? lines : [];
    const logoImg = isImageUrl(client.logoStorageKey)
      ? await this.loadImageSafe(client.logoStorageKey!)
      : null;

    const itemMap = new Map<string, ReceiptCatalogItem>();
    for (const item of catalogItems) {
      itemMap.set(item.id, item);
    }

    const lineThumbs = await Promise.all(
      safeLines.map(async (line) => {
        const item = itemMap.get(line.catalogItemId);
        if (item && isImageUrl(item.frontVisualStorageKey)) {
          const loaded = await this.loadImageSafe(item.frontVisualStorageKey!);
          if (loaded) {
            return loaded;
          }
        }
        const fallbackSvg = getGarmentSvgDataUrl(
          item?.productType ?? 'POLO',
          item?.colorReference ?? 'Bleu Marine',
          item?.referenceCode ?? 'TENUE'
        );
        return await this.loadImageSafe(fallbackSvg);
      })
    );

    const rowsPerPage = 6;
    const totalPages = Math.max(1, Math.ceil(safeLines.length / rowsPerPage));
    const pageJpegs: Uint8Array[] = [];

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const start = pageIdx * rowsPerPage;
      const pageLines = safeLines.slice(start, start + rowsPerPage);
      const pageThumbs = lineThumbs.slice(start, start + rowsPerPage);
      const jpegBytes = await this.renderReceiptPage(
        client,
        order,
        safeLines,
        pageLines,
        pageThumbs,
        itemMap,
        logoImg,
        pageIdx + 1,
        totalPages
      );
      pageJpegs.push(jpegBytes);
    }

    const pdfBytes = this.assemblePdfFromJpegPages(
      pageJpegs,
      B2cReceiptPdfGeneratorService.CANVAS_W,
      B2cReceiptPdfGeneratorService.CANVAS_H
    );
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  private async renderReceiptPage(
    client: ClientResponse,
    order: B2cOrderDetailResponse,
    allBuyerLines: readonly B2cOrderLineResponse[],
    pageLines: readonly B2cOrderLineResponse[],
    pageThumbs: readonly (HTMLImageElement | null)[],
    itemMap: ReadonlyMap<string, ReceiptCatalogItem>,
    logoImg: HTMLImageElement | null,
    pageNumber: number,
    totalPages: number
  ): Promise<Uint8Array> {
    const W = B2cReceiptPdfGeneratorService.CANVAS_W;
    const H = B2cReceiptPdfGeneratorService.CANVAS_H;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1. Page Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, W, H);

    // Top Gold & Royal Navy Accent Bars
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, W, 12);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, 12, W, 6);

    const marginX = 56;
    const contentW = W - marginX * 2;

    // 2. Luxury Official Header Banner
    const headerY = 42;
    const headerH = 196;
    const headerGrad = ctx.createLinearGradient(marginX, headerY, marginX + contentW, headerY + headerH);
    headerGrad.addColorStop(0, '#0F172A');
    headerGrad.addColorStop(0.65, '#1E293B');
    headerGrad.addColorStop(1, '#1E3A8A');
    this.fillRoundedRect(ctx, marginX, headerY, contentW, headerH, 22, headerGrad);

    // Subtle decorative circles
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, marginX, headerY, contentW, headerH, 22);
    ctx.clip();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.07)';
    ctx.beginPath();
    ctx.arc(marginX + contentW - 70, headerY + 36, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // School Logo or Monogram Emblem
    const logoBoxSize = 136;
    const logoBoxX = marginX + 30;
    const logoBoxY = headerY + (headerH - logoBoxSize) / 2;
    this.fillRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 20, '#FFFFFF');
    this.strokeRoundedRect(
      ctx,
      logoBoxX,
      logoBoxY,
      logoBoxSize,
      logoBoxSize,
      20,
      'rgba(251, 191, 36, 0.55)',
      3
    );

    if (logoImg) {
      this.drawImageContained(
        ctx,
        logoImg,
        logoBoxX + 12,
        logoBoxY + 12,
        logoBoxSize - 24,
        logoBoxSize - 24
      );
    } else {
      const cx = logoBoxX + logoBoxSize / 2;
      const cy = logoBoxY + logoBoxSize / 2;
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.arc(cx, cy, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.extractInitials(client.name), cx, cy + 2);
    }

    // Header Titles
    const textX = logoBoxX + logoBoxSize + 30;
    const maxHeaderTextW = contentW - (logoBoxSize + 90);

    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('DOCUMENT OFFICIEL DE CAISSE & DE RETRAIT SCOLAIRE', textX, headerY + 30);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("JUSTIFICATIF D'ACHAT & REÇU DE PAIEMENT", textX, headerY + 58);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      this.truncateText(ctx, client.name.toUpperCase(), maxHeaderTextW),
      textX,
      headerY + 108
    );

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      this.truncateText(ctx, `Établissement : ${client.address}`, maxHeaderTextW),
      textX,
      headerY + 142
    );

    // 3. Metadata & Paid Stamp Bar
    const firstLine = allBuyerLines[0];
    const totalQuantity = allBuyerLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
    const totalCashAmount = allBuyerLines.reduce((sum, l) => sum + Number(l.lineCashAmount || 0), 0);
    const allDelivered =
      allBuyerLines.length > 0 && allBuyerLines.every((l) => l.lineStatus === 'DELIVERED');
    const someDelivered = allBuyerLines.some((l) => l.lineStatus === 'DELIVERED');

    const metaY = headerY + headerH + 24;
    const metaH = 128;
    const leftMetaW = Math.floor(contentW * 0.62);
    const rightStampW = contentW - leftMetaW - 20;

    // Left Meta Card
    this.fillRoundedRect(ctx, marginX, metaY, leftMetaW, metaH, 18, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, metaY, leftMetaW, metaH, 18, '#E2E8F0', 2);

    const receiptRefLabel =
      allBuyerLines.length <= 1
        ? (firstLine?.receiptNumber ?? 'REC-OFFICIEL')
        : `${firstLine.receiptNumber} (+${allBuyerLines.length - 1} réf.)`;
    const dateStr = this.formatFrenchDateTime(firstLine?.createdAt ?? order.createdAt);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Col 1 inside Left Meta: N° de Justificatif & Date
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('N° DE JUSTIFICATIF OFFICIEL', marginX + 24, metaY + 20);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(receiptRefLabel, marginX + 24, metaY + 42);

    ctx.fillStyle = '#475569';
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Date d'achat : ${dateStr}`, marginX + 24, metaY + 82);

    // Col 2 inside Left Meta: Lot de commande
    const col2X = marginX + Math.floor(leftMetaW * 0.56);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LOT DE COMMANDE', col2X, metaY + 20);
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(order.orderNumber, col2X, metaY + 43);

    const deliveryStatusText = allDelivered
      ? 'Statut : Remis au client'
      : someDelivered
        ? 'Statut : Remise partielle'
        : 'Statut : À retirer';
    ctx.fillStyle = allDelivered ? '#047857' : '#B45309';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(deliveryStatusText, col2X, metaY + 82);

    // Right Emerald Paid Stamp Card
    const stampX = marginX + leftMetaW + 20;
    this.fillRoundedRect(ctx, stampX, metaY, rightStampW, metaH, 18, '#ECFDF5');
    this.strokeRoundedRect(ctx, stampX, metaY, rightStampW, metaH, 18, '#6EE7B7', 2.5);

    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓ PAYÉ COMPTANT EN ESPÈCES', stampX + rightStampW / 2, metaY + 22);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${totalCashAmount.toFixed(2)} DH`, stampX + rightStampW / 2, metaY + 50);

    ctx.fillStyle = '#065F46';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `Acquitté intégralement (${totalQuantity} ${totalQuantity > 1 ? 'articles' : 'article'})`,
      stampX + rightStampW / 2,
      metaY + 94
    );

    // 4. Client / Student Information Card
    const buyerY = metaY + metaH + 22;
    const buyerH = 152;
    this.fillRoundedRect(ctx, marginX, buyerY, contentW, buyerH, 18, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, buyerY, contentW, buyerH, 18, '#E2E8F0', 2);

    // Left accent bar on buyer card
    this.fillRoundedRect(ctx, marginX, buyerY, 8, buyerH, 4, '#1E3A8A');

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('INFORMATIONS DU CLIENT & DE L’ÉLÈVE', marginX + 28, buyerY + 18);

    const buyerName = firstLine?.buyerFullName || 'Parent / Acheteur';
    const buyerPhone = firstLine?.buyerPhone?.trim() ? firstLine.buyerPhone : 'Non renseigné';
    const buyerEmail = firstLine?.buyerEmail?.trim() ? firstLine.buyerEmail : 'Non renseigné';
    const sectionLabel = firstLine?.sectionName?.trim()
      ? firstLine.sectionName
      : 'Non spécifiée';

    // Buyer Name & Phone (Left Column)
    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Parent / Acheteur :', marginX + 28, buyerY + 52);
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      this.truncateText(ctx, buyerName, contentW * 0.48 - 170),
      marginX + 185,
      buyerY + 48
    );

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Téléphone :', marginX + 28, buyerY + 98);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(buyerPhone, marginX + 185, buyerY + 96);

    // Section / Class & Email (Right Column)
    const rightColX = marginX + Math.floor(contentW * 0.54);
    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Section / Classe :', rightColX, buyerY + 52);

    // Section Pill
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const secTrunc = this.truncateText(ctx, sectionLabel, contentW * 0.44 - 160);
    const secPillW = Math.max(90, ctx.measureText(secTrunc).width + 28);
    this.fillRoundedRect(ctx, rightColX + 145, buyerY + 44, secPillW, 34, 10, '#EEF2FF');
    this.strokeRoundedRect(ctx, rightColX + 145, buyerY + 44, secPillW, 34, 10, '#C7D2FE', 1.5);
    ctx.fillStyle = '#3730A3';
    ctx.fillText(secTrunc, rightColX + 159, buyerY + 51);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Email :', rightColX, buyerY + 98);
    ctx.fillStyle = '#334155';
    ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      this.truncateText(ctx, buyerEmail, contentW * 0.44 - 160),
      rightColX + 145,
      buyerY + 96
    );

    // 5. Ordered Items Table Header & Rows
    const tableY = buyerY + buyerH + 24;
    const tableHeaderH = 50;
    const rowH = 104;
    const tableBodyH = Math.max(1, pageLines.length) * rowH;
    const totalTableH = tableHeaderH + tableBodyH;

    // Outer Table Card
    this.fillRoundedRect(ctx, marginX, tableY, contentW, totalTableH, 18, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, tableY, contentW, totalTableH, 18, '#CBD5E1', 2);

    // Table Header Bar
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, marginX, tableY, contentW, tableHeaderH + 12, 18);
    ctx.clip();
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(marginX, tableY, contentW, tableHeaderH);
    ctx.restore();

    // Column X offsets
    const colVisuelX = marginX + 18;
    const colDescX = marginX + 114;
    const colVariantX = marginX + 520;
    const colQtyX = marginX + 725;
    const colUnitX = marginX + 835;
    const colTotalX = marginX + 985;

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const headerMidY = tableY + tableHeaderH / 2;
    ctx.fillText('ARTICLE & DÉSIGNATION', colVisuelX, headerMidY);
    ctx.fillText('COUPE & TAILLE', colVariantX, headerMidY);
    ctx.fillText('QTÉ', colQtyX, headerMidY);
    ctx.fillText('P.U. TTC', colUnitX, headerMidY);
    ctx.fillText('MONTANT TTC', colTotalX, headerMidY);

    // Table Rows
    for (let i = 0; i < pageLines.length; i++) {
      const line = pageLines[i];
      const item = itemMap.get(line.catalogItemId);
      const thumb = pageThumbs[i];
      const rY = tableY + tableHeaderH + i * rowH;

      if (i % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX + 2, rY, contentW - 4, rowH);
      }

      if (i > 0) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginX + 16, rY);
        ctx.lineTo(marginX + contentW - 16, rY);
        ctx.stroke();
      }

      // Thumbnail Studio Box
      const thumbSize = 76;
      const thumbY = rY + (rowH - thumbSize) / 2;
      this.fillRoundedRect(ctx, colVisuelX, thumbY, thumbSize, thumbSize, 12, '#F1F5F9');
      this.strokeRoundedRect(ctx, colVisuelX, thumbY, thumbSize, thumbSize, 12, '#CBD5E1', 1.2);
      if (thumb) {
        this.drawImageContained(
          ctx,
          thumb,
          colVisuelX + 6,
          thumbY + 6,
          thumbSize - 12,
          thumbSize - 12
        );
      }

      // Product Name, Ref, Color & Line Receipt Ref
      const itemName = item?.name || 'Tenue scolaire officielle';
      const itemRef = item?.referenceCode || '—';
      const itemColor = item?.colorReference || 'Standard';
      const typeLabel =
        ALL_PRODUCT_TYPES.find((p) => p.code === item?.productType)?.label ||
        item?.productType ||
        'Tenue';

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(this.truncateText(ctx, itemName, 390), colDescX, rY + 18);

      // Color dot + metadata
      const palette = resolveGarmentPalette(itemColor);
      ctx.fillStyle = palette.fill;
      ctx.beginPath();
      ctx.arc(colDescX + 7, rY + 56, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        this.truncateText(ctx, `${typeLabel} • Réf. ${itemRef} • ${itemColor}`, 370),
        colDescX + 20,
        rY + 47
      );

      ctx.fillStyle = '#64748B';
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Réf. justificatif : ${line.receiptNumber}`, colDescX, rY + 72);

      // Variant: Gender & Size Pill
      const genderFr = this.translateGenderFr(line.gender);
      const sizeFr = formatSizeLabelFr(line.size);

      ctx.fillStyle = '#334155';
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Coupe : ${genderFr}`, colVariantX, rY + 24);

      ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const sizeText = `Taille : ${sizeFr}`;
      const sizePillW = Math.max(96, ctx.measureText(sizeText).width + 24);
      this.fillRoundedRect(ctx, colVariantX, rY + 52, sizePillW, 32, 8, '#F1F5F9');
      this.strokeRoundedRect(ctx, colVariantX, rY + 52, sizePillW, 32, 8, '#CBD5E1', 1.2);
      ctx.fillStyle = '#0F172A';
      ctx.fillText(sizeText, colVariantX + 12, rY + 58);

      // Quantity Badge
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.fillRoundedRect(ctx, colQtyX, rY + 32, 68, 40, 10, '#EFF6FF');
      this.strokeRoundedRect(ctx, colQtyX, rY + 32, 68, 40, 10, '#BFDBFE', 1.2);
      ctx.fillStyle = '#1D4ED8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`×${line.quantity}`, colQtyX + 34, rY + 52);

      // Unit Price
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${Number(line.b2cUnitPrice).toFixed(2)} DH`, colUnitX, rY + 52);

      // Line Total TTC
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${Number(line.lineCashAmount).toFixed(2)} DH`, colTotalX, rY + 52);
    }

    // 6. Financial Summary & Legal Confirmation Block
    const summaryY = tableY + totalTableH + 24;
    const summaryH = 148;
    const legalW = Math.floor(contentW * 0.56);
    const totalBoxW = contentW - legalW - 20;

    // Left Legal & Pickup Instructions Card
    this.fillRoundedRect(ctx, marginX, summaryY, legalW, summaryH, 18, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, summaryY, legalW, summaryH, 18, '#E2E8F0', 2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CONDITIONS DE PAIEMENT & DE RETRAIT', marginX + 24, summaryY + 20);

    const legalLines = [
      '• Paiement intégral en espèces encaissé au comptant (Reste à payer : 0,00 DH).',
      '• Conservez précieusement ce justificatif officiel numéroté.',
      '• Présentez ce document (imprimé ou sur téléphone) lors du retrait des tenues.',
    ];
    ctx.fillStyle = '#475569';
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    legalLines.forEach((txt, idx) => {
      ctx.fillText(txt, marginX + 24, summaryY + 52 + idx * 27);
    });

    // Right Financial Total Box
    const totalBoxX = marginX + legalW + 20;
    this.fillRoundedRect(ctx, totalBoxX, summaryY, totalBoxW, summaryH, 18, '#0F172A');

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nombre total de pièces :', totalBoxX + 24, summaryY + 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      `${totalQuantity} ${totalQuantity > 1 ? 'articles' : 'article'}`,
      totalBoxX + totalBoxW - 24,
      summaryY + 20
    );

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Mode de règlement :', totalBoxX + 24, summaryY + 54);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Espèces (Comptant)', totalBoxX + totalBoxW - 24, summaryY + 54);

    // Divider inside total box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(totalBoxX + 24, summaryY + 86);
    ctx.lineTo(totalBoxX + totalBoxW - 24, summaryY + 86);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TOTAL PAYÉ TTC', totalBoxX + 24, summaryY + 105);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${totalCashAmount.toFixed(2)} DH`, totalBoxX + totalBoxW - 24, summaryY + 98);

    // 7. Bottom Signature & Establishment Stamp Boxes
    const signY = H - 206;
    const signH = 136;
    const signBoxW = Math.floor((contentW - 24) / 2);

    // Box 1: Establishment Stamp
    this.fillRoundedRect(ctx, marginX, signY, signBoxW, signH, 16, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, signY, signBoxW, signH, 16, '#CBD5E1', 1.5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('VISA & CACHET DE L’ÉTABLISSEMENT / CAISSE', marginX + 20, signY + 16);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✓ Encaissement espèces validé et enregistré', marginX + 20, signY + 96);

    // Box 2: Buyer Pickup Signature
    const signBox2X = marginX + signBoxW + 24;
    this.fillRoundedRect(ctx, signBox2X, signY, signBoxW, signH, 16, '#FFFFFF');
    this.strokeRoundedRect(ctx, signBox2X, signY, signBoxW, signH, 16, '#CBD5E1', 1.5);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CADRE RÉSERVÉ À LA REMISE DES ARTICLES (SIGNATURE CLIENT)', signBox2X + 20, signY + 16);
    ctx.fillStyle = allDelivered ? '#059669' : '#94A3B8';
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(
      allDelivered
        ? '✓ Articles remis au client'
        : 'Date de retrait et émargement du parent / élève :',
      signBox2X + 20,
      signY + 96
    );

    // Footer Page Metadata
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${client.name} — Justificatif d'achat officiel (${order.orderNumber})`,
      marginX,
      H - 38
    );
    ctx.textAlign = 'right';
    ctx.fillText(`Page ${pageNumber} / ${totalPages}`, W - marginX, H - 38);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return this.dataUrlToUint8Array(dataUrl);
  }

  private formatFrenchDateTime(iso: string | undefined): string {
    if (!iso) {
      return new Date().toLocaleDateString('fr-FR');
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

  private extractInitials(name: string): string {
    const parts = (name || 'UA').trim().split(/\s+/);
    const chars = parts
      .filter((p) => p.length > 0)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase());
    return chars.join('') || 'UA';
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let truncated = text;
    while (truncated.length > 3 && ctx.measureText(truncated + '…').width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  }

  private drawImageContained(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number
  ): void {
    const iw = img.naturalWidth || img.width || 200;
    const ih = img.naturalHeight || img.height || 200;
    const scale = Math.min(boxW / iw, boxH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = boxX + (boxW - dw) / 2;
    const dy = boxY + (boxH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  private traceRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  private fillRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fillStyle: string | CanvasGradient
  ): void {
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  private strokeRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    strokeStyle: string,
    lineWidth: number
  ): void {
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  private loadImageSafe(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private assemblePdfFromJpegPages(
    pagesJpeg: readonly Uint8Array[],
    pixelW: number,
    pixelH: number
  ): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [0];
    let currentOffset = 0;

    const pushBytes = (bytes: Uint8Array): void => {
      chunks.push(bytes);
      currentOffset += bytes.byteLength;
    };
    const pushStr = (str: string): void => {
      pushBytes(encoder.encode(str));
    };
    const startObj = (id: number): void => {
      offsets[id] = currentOffset;
      pushStr(`${id} 0 obj\n`);
    };
    const endObj = (): void => {
      pushStr('\nendobj\n');
    };

    pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    const numPages = pagesJpeg.length;
    const pageObjIds: number[] = [];
    for (let i = 0; i < numPages; i++) {
      pageObjIds.push(3 + i * 3);
    }

    startObj(1);
    pushStr('<< /Type /Catalog /Pages 2 0 R >>');
    endObj();

    startObj(2);
    const kidsRef = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    pushStr(`<< /Type /Pages /Kids [ ${kidsRef} ] /Count ${numPages} >>`);
    endObj();

    const ptW = B2cReceiptPdfGeneratorService.PAGE_PT_W.toFixed(2);
    const ptH = B2cReceiptPdfGeneratorService.PAGE_PT_H.toFixed(2);

    for (let i = 0; i < numPages; i++) {
      const pageId = 3 + i * 3;
      const contentId = pageId + 1;
      const imageId = pageId + 2;
      const jpegBytes = pagesJpeg[i];
      const imgName = `/Im${i + 1}`;

      startObj(pageId);
      pushStr(
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${ptW} ${ptH} ] /Resources << /XObject << ${imgName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      endObj();

      const contentStream = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n${imgName} Do\nQ\n`;
      const contentBytes = encoder.encode(contentStream);
      startObj(contentId);
      pushStr(`<< /Length ${contentBytes.byteLength} >>\nstream\n`);
      pushBytes(contentBytes);
      pushStr('endstream');
      endObj();

      startObj(imageId);
      pushStr(
        `<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`
      );
      pushBytes(jpegBytes);
      pushStr('\nendstream');
      endObj();
    }

    const totalObjects = 2 + numPages * 3;
    const xrefOffset = currentOffset;
    pushStr(`xref\n0 ${totalObjects + 1}\n`);
    pushStr('0000000000 65535 f \n');
    for (let id = 1; id <= totalObjects; id++) {
      const padded = String(offsets[id] ?? 0).padStart(10, '0');
      pushStr(`${padded} 00000 n \n`);
    }
    pushStr(
      `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    );

    const out = new Uint8Array(currentOffset);
    let pos = 0;
    for (const chunk of chunks) {
      out.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return out;
  }
}

