import { Injectable } from '@angular/core';
import {
  ALL_PRODUCT_TYPES,
  AdminCatalogItemResponse,
  B2cCatalogItemResponse,
  ClientResponse,
  formatSizeLabelFr,
} from '../models/uniform.models';
import {
  getGarmentSvgDataUrl,
  isImageUrl,
  resolveGarmentPalette,
} from '../utils/image-upload.util';

type CatalogFlyerItem = AdminCatalogItemResponse | B2cCatalogItemResponse;

@Injectable({ providedIn: 'root' })
export class CatalogFlyerPdfGeneratorService {
  private static readonly PAGE_PT_W = 595.28;
  private static readonly PAGE_PT_H = 841.89;
  private static readonly CANVAS_W = 1240;
  private static readonly CANVAS_H = 1754;

  async generateCatalogFlyerPdfBlob(
    client: ClientResponse,
    items: readonly CatalogFlyerItem[]
  ): Promise<Blob> {
    const logoImg = isImageUrl(client.logoStorageKey)
      ? await this.loadImageSafe(client.logoStorageKey!)
      : null;

    const itemImages = await Promise.all(
      items.map(async (item) => {
        const frontUrl = isImageUrl(item.frontVisualStorageKey)
          ? item.frontVisualStorageKey!
          : getGarmentSvgDataUrl(item.productType, item.colorReference);
        const backUrl = isImageUrl(item.backVisualStorageKey)
          ? item.backVisualStorageKey!
          : null;
        const [frontImg, backImg] = await Promise.all([
          this.loadImageSafe(frontUrl),
          backUrl ? this.loadImageSafe(backUrl) : Promise.resolve(null),
        ]);
        return { frontImg, backImg, hasCustomFront: isImageUrl(item.frontVisualStorageKey) };
      })
    );

    const itemsPerPage = 4;
    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
    const jpegPages: Uint8Array[] = [];

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const startIdx = pageIndex * itemsPerPage;
      const pageItems = items.slice(startIdx, startIdx + itemsPerPage);
      const pageImgs = itemImages.slice(startIdx, startIdx + itemsPerPage);
      const jpegBytes = await this.renderCatalogPageToJpeg(
        client,
        logoImg,
        pageItems,
        pageImgs,
        pageIndex + 1,
        totalPages,
        items.length
      );
      jpegPages.push(jpegBytes);
    }

    return this.buildMultiPagePdfFromJpegs(
      jpegPages,
      CatalogFlyerPdfGeneratorService.CANVAS_W,
      CatalogFlyerPdfGeneratorService.CANVAS_H
    );
  }

  private async renderCatalogPageToJpeg(
    client: ClientResponse,
    logoImg: HTMLImageElement | null,
    pageItems: readonly CatalogFlyerItem[],
    pageImgs: readonly {
      frontImg: HTMLImageElement | null;
      backImg: HTMLImageElement | null;
      hasCustomFront: boolean;
    }[],
    pageNumber: number,
    totalPages: number,
    totalItemsCount: number
  ): Promise<Uint8Array> {
    const W = CatalogFlyerPdfGeneratorService.CANVAS_W;
    const H = CatalogFlyerPdfGeneratorService.CANVAS_H;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // 1. Page Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, W, H);

    // Subtle top gold accent bar
    const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
    topBarGrad.addColorStop(0, '#D97706');
    topBarGrad.addColorStop(0.5, '#F59E0B');
    topBarGrad.addColorStop(1, '#B45309');
    ctx.fillStyle = topBarGrad;
    ctx.fillRect(0, 0, W, 12);

    // 2. Luxury Editorial Hero Banner
    const marginX = 56;
    const headerY = 40;
    const headerW = W - marginX * 2;
    const headerH = 220;

    const heroGrad = ctx.createLinearGradient(marginX, headerY, marginX + headerW, headerY + headerH);
    heroGrad.addColorStop(0, '#0F172A');
    heroGrad.addColorStop(0.65, '#1E293B');
    heroGrad.addColorStop(1, '#1E3A8A');
    this.fillRoundedRect(ctx, marginX, headerY, headerW, headerH, 24, heroGrad);

    // Decorative subtle gold circle in banner corner
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, marginX, headerY, headerW, headerH, 24);
    ctx.clip();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.beginPath();
    ctx.arc(marginX + headerW - 60, headerY + 30, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // School Logo Box (Left side of Hero Banner)
    const logoBoxSize = 156;
    const logoBoxX = marginX + 34;
    const logoBoxY = headerY + (headerH - logoBoxSize) / 2;
    this.fillRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 20, '#FFFFFF');
    this.strokeRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 20, '#F59E0B', 3);

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
      // School Crest Fallback with Initials
      const cx = logoBoxX + logoBoxSize / 2;
      const cy = logoBoxY + logoBoxSize / 2;
      ctx.fillStyle = '#1E3A8A';
      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.extractInitials(client.name), cx, cy + 2);
    }

    // Hero Text (Right of Logo)
    const textX = logoBoxX + logoBoxSize + 34;
    const maxTextW = headerW - (logoBoxSize + 100);

    // Super-title pill
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('COLLECTION OFFICIELLE DES TENUES SCOLAIRES', textX, headerY + 34);

    // Establishment Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const schoolTitle = this.truncateText(ctx, client.name.toUpperCase(), maxTextW);
    ctx.fillText(schoolTitle, textX, headerY + 66);

    // Address & Establishment Type
    const schoolTypeLabel =
      client.clientType === 'PRIMARY_SCHOOL'
        ? 'École Primaire (Tailles Enfant 2 à 14 ans)'
        : 'Collège / Lycée (Tailles Enfant & Adulte)';
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const addressLine = this.truncateText(
      ctx,
      `${schoolTypeLabel}  •  ${client.address}`,
      maxTextW
    );
    ctx.fillText(addressLine, textX, headerY + 122);

    // Collection Badge Pill (No MOQ!)
    const badgeText = `Catalogue Officiel  •  ${totalItemsCount} ${
      totalItemsCount > 1 ? 'modèles sélectionnés' : 'modèle sélectionné'
    }`;
    ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const badgeW = ctx.measureText(badgeText).width + 32;
    this.fillRoundedRect(
      ctx,
      textX,
      headerY + 160,
      badgeW,
      34,
      17,
      'rgba(255, 255, 255, 0.14)'
    );
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(badgeText, textX + 16, headerY + 168);

    // 3. Product Lookbook Grid (2 columns x 2 rows)
    const gridTop = headerY + headerH + 30;
    const gridGapX = 28;
    const gridGapY = 28;
    const cardW = (headerW - gridGapX) / 2;
    const cardH = 540;

    if (pageItems.length === 0) {
      this.fillRoundedRect(ctx, marginX, gridTop, headerW, 240, 20, '#FFFFFF');
      this.strokeRoundedRect(ctx, marginX, gridTop, headerW, 240, 20, '#E2E8F0', 2);
      ctx.fillStyle = '#64748B';
      ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Aucun produit configuré dans le catalogue de cet établissement.',
        W / 2,
        gridTop + 110
      );
    } else {
      for (let i = 0; i < pageItems.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = marginX + col * (cardW + gridGapX);
        const cardY = gridTop + row * (cardH + gridGapY);
        this.drawProductLookbookCard(
          ctx,
          cardX,
          cardY,
          cardW,
          cardH,
          pageItems[i],
          pageImgs[i],
          client
        );
      }
    }

    // 4. Sections & Ordering Guide Footer
    const footerAreaY = H - 290;

    // Sections Strip (if sections exist)
    if (client.sections && client.sections.length > 0) {
      const secBoxY = footerAreaY;
      const secBoxH = 68;
      this.fillRoundedRect(ctx, marginX, secBoxY, headerW, secBoxH, 16, '#FFFBEB');
      this.strokeRoundedRect(ctx, marginX, secBoxY, headerW, secBoxH, 16, '#FDE68A', 2);

      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = 'SECTIONS & CLASSES : ';
      ctx.fillText(label, marginX + 24, secBoxY + secBoxH / 2);
      const labelW = ctx.measureText(label).width;

      ctx.fillStyle = '#78350F';
      ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const secText = this.truncateText(
        ctx,
        client.sections.map((s) => s.name).join('   •   '),
        headerW - labelW - 48
      );
      ctx.fillText(secText, marginX + 24 + labelW, secBoxY + secBoxH / 2);
    }

    // Ordering Guide Box
    const guideY = H - 204;
    const guideH = 148;
    this.fillRoundedRect(ctx, marginX, guideY, headerW, guideH, 18, '#FFFFFF');
    this.strokeRoundedRect(ctx, marginX, guideY, headerW, guideH, 18, '#E2E8F0', 2);

    // Left accent stripe
    this.fillRoundedRect(ctx, marginX, guideY, 10, guideH, 5, '#1E3A8A');

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MODALITÉS DE COMMANDE AU COMPTOIR DE L’ÉTABLISSEMENT', marginX + 32, guideY + 20);

    const steps = [
      '1. Choisissez vos articles et tailles à partir de ce catalogue officiel.',
      '2. Présentez-vous au comptoir dédié de l’établissement en indiquant le nom et la classe de l’élève.',
      '3. Réglez votre commande au comptant en espèces et récupérez immédiatement votre reçu officiel numéroté.',
    ];
    ctx.fillStyle = '#475569';
    ctx.font = '400 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    steps.forEach((step, idx) => {
      ctx.fillText(step, marginX + 32, guideY + 56 + idx * 28);
    });

    // Bottom Page Number & Brand Footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${client.name} — Catalogue Officiel des Tenues Scolaires`, marginX, H - 36);
    ctx.textAlign = 'right';
    ctx.fillText(`Page ${pageNumber} / ${totalPages}`, W - marginX, H - 36);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return this.dataUrlToUint8Array(dataUrl);
  }

  private drawProductLookbookCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    item: CatalogFlyerItem,
    imgs: {
      frontImg: HTMLImageElement | null;
      backImg: HTMLImageElement | null;
      hasCustomFront: boolean;
    },
    client: ClientResponse
  ): void {
    // Card Shadow & Background
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.06)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    this.fillRoundedRect(ctx, x, y, w, h, 22, '#FFFFFF');
    ctx.restore();
    this.strokeRoundedRect(ctx, x, y, w, h, 22, '#E2E8F0', 2);

    // Top Studio Image Area
    const imgAreaH = 265;
    ctx.save();
    ctx.beginPath();
    this.traceRoundedRect(ctx, x + 2, y + 2, w - 4, imgAreaH, 20);
    ctx.clip();
    const studioGrad = ctx.createLinearGradient(x, y, x, y + imgAreaH);
    studioGrad.addColorStop(0, '#F8FAFC');
    studioGrad.addColorStop(1, '#EFF6FF');
    ctx.fillStyle = studioGrad;
    ctx.fillRect(x, y, w, imgAreaH);

    // Render Product Image(s)
    if (imgs.frontImg && imgs.backImg) {
      // Side-by-side Face & Dos preview
      const slotW = (w - 48) / 2;
      this.drawImageContained(ctx, imgs.frontImg, x + 16, y + 44, slotW, imgAreaH - 58);
      this.drawImageContained(ctx, imgs.backImg, x + 32 + slotW, y + 44, slotW, imgAreaH - 58);

      // Tiny Face / Dos labels
      this.fillRoundedRect(ctx, x + 20, y + imgAreaH - 34, 62, 24, 8, 'rgba(15, 23, 42, 0.65)');
      this.fillRoundedRect(
        ctx,
        x + 36 + slotW,
        y + imgAreaH - 34,
        56,
        24,
        8,
        'rgba(15, 23, 42, 0.65)'
      );
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FACE', x + 51, y + imgAreaH - 22);
      ctx.fillText('DOS', x + 64 + slotW, y + imgAreaH - 22);
    } else if (imgs.frontImg) {
      this.drawImageContained(ctx, imgs.frontImg, x + 32, y + 36, w - 64, imgAreaH - 48);
    }
    ctx.restore();

    // Divider line under image area
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + imgAreaH);
    ctx.lineTo(x + w, y + imgAreaH);
    ctx.stroke();

    // Category Badge (Top-Left of Image Area)
    const productTypeLabel =
      ALL_PRODUCT_TYPES.find((p) => p.code === item.productType)?.label ||
      item.productType ||
      'Tenue';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const catPillW = ctx.measureText(productTypeLabel.toUpperCase()).width + 28;
    this.fillRoundedRect(ctx, x + 16, y + 14, catPillW, 30, 10, '#1E3A8A');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(productTypeLabel.toUpperCase(), x + 30, y + 29);

    // Reference Code Badge (Top-Right of Image Area)
    const refText = `Réf. ${item.referenceCode}`;
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const refPillW = ctx.measureText(refText).width + 24;
    this.fillRoundedRect(
      ctx,
      x + w - refPillW - 16,
      y + 14,
      refPillW,
      28,
      9,
      'rgba(255, 255, 255, 0.92)'
    );
    this.strokeRoundedRect(
      ctx,
      x + w - refPillW - 16,
      y + 14,
      refPillW,
      28,
      9,
      '#CBD5E1',
      1.2
    );
    ctx.fillStyle = '#475569';
    ctx.fillText(refText, x + w - refPillW - 4, y + 28);

    // Card Content Body
    const padX = 24;
    let curY = y + imgAreaH + 20;

    // Product Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.truncateText(ctx, item.name, w - padX * 2), x + padX, curY);
    curY += 34;

    // Cut / Style & Color Swatch Row
    const palette = resolveGarmentPalette(item.colorReference);
    ctx.fillStyle = palette.fill;
    ctx.beginPath();
    ctx.arc(x + padX + 10, curY + 11, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const colorAndStyle = `${item.colorReference}${
      item.garmentStyle && item.garmentStyle !== item.name ? '  •  ' + item.garmentStyle : ''
    }`;
    ctx.fillText(this.truncateText(ctx, colorAndStyle, w - padX * 2 - 28), x + padX + 28, curY);
    curY += 34;

    // Sizes Pills Section
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TAILLES DISPONIBLES :', x + padX, curY);
    curY += 22;

    const sizesList = this.extractTranslatedSizeList(item.availableSizes, client);
    let pillX = x + padX;
    let pillY = curY;
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (const sizeLabel of sizesList.slice(0, 8)) {
      const pw = ctx.measureText(sizeLabel).width + 20;
      if (pillX + pw > x + w - padX) {
        break;
      }
      this.fillRoundedRect(ctx, pillX, pillY, pw, 28, 8, '#F1F5F9');
      this.strokeRoundedRect(ctx, pillX, pillY, pw, 28, 8, '#CBD5E1', 1);
      ctx.fillStyle = '#1E293B';
      ctx.textBaseline = 'middle';
      ctx.fillText(sizeLabel, pillX + 10, pillY + 14);
      pillX += pw + 8;
    }

    // Bottom Price Banner inside Card
    const priceBarH = 62;
    const priceBarY = y + h - priceBarH - 16;
    this.fillRoundedRect(ctx, x + 16, priceBarY, w - 32, priceBarH, 14, '#ECFDF5');
    this.strokeRoundedRect(ctx, x + 16, priceBarY, w - 32, priceBarH, 14, '#A7F3D0', 1.5);

    ctx.fillStyle = '#065F46';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRIX OFFICIEL TTC', x + 34, priceBarY + priceBarH / 2);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${Number(item.b2cUnitPrice).toFixed(2)} DH`,
      x + w - 34,
      priceBarY + priceBarH / 2 + 1
    );
  }

  private extractTranslatedSizeList(
    availableSizes: string | null | undefined,
    client: ClientResponse
  ): string[] {
    if (availableSizes && availableSizes.trim().length > 0) {
      return availableSizes
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((code) => formatSizeLabelFr(code, false));
    }
    if (client.clientType === 'PRIMARY_SCHOOL') {
      return ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans'];
    }
    return ['6 ans', '8 ans', '10 ans', '12 ans', '14 ans', 'XS', 'S', 'M', 'L', 'XL'];
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
    const base64 = dataUrl.slice(commaIdx + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private buildMultiPagePdfFromJpegs(
    jpegPages: readonly Uint8Array[],
    pixelW: number,
    pixelH: number
  ): Blob {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [0]; // index 0 is free object
    let byteOffset = 0;

    const pushBytes = (bytes: Uint8Array) => {
      chunks.push(bytes);
      byteOffset += bytes.byteLength;
    };
    const pushStr = (str: string) => {
      pushBytes(encoder.encode(str));
    };

    pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    // Object 1: Catalog
    offsets[1] = byteOffset;
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Object 2: Pages (kids are objects 3, 6, 9, ...)
    const pageCount = jpegPages.length;
    const kidsRefs = jpegPages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    offsets[2] = byteOffset;
    pushStr(`2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [ ${kidsRefs} ] >>\nendobj\n`);

    const ptW = CatalogFlyerPdfGeneratorService.PAGE_PT_W.toFixed(2);
    const ptH = CatalogFlyerPdfGeneratorService.PAGE_PT_H.toFixed(2);

    for (let i = 0; i < pageCount; i++) {
      const pageObjId = 3 + i * 3;
      const contentObjId = pageObjId + 1;
      const imgObjId = pageObjId + 2;
      const imgName = `/Im${i + 1}`;
      const jpeg = jpegPages[i];

      // Page object
      offsets[pageObjId] = byteOffset;
      pushStr(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << ${imgName} ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
      );

      // Content stream drawing the full-page XObject
      const contentStream = `q\n${ptW} 0 0 ${ptH} 0 0 cm\n${imgName} Do\nQ\n`;
      const contentBytes = encoder.encode(contentStream);
      offsets[contentObjId] = byteOffset;
      pushStr(`${contentObjId} 0 obj\n<< /Length ${contentBytes.byteLength} >>\nstream\n`);
      pushBytes(contentBytes);
      pushStr('\nendstream\nendobj\n');

      // Image XObject stream (DCTDecode JPEG)
      offsets[imgObjId] = byteOffset;
      pushStr(
        `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.byteLength} >>\nstream\n`
      );
      pushBytes(jpeg);
      pushStr('\nendstream\nendobj\n');
    }

    const totalObjects = 2 + pageCount * 3;
    const xrefOffset = byteOffset;
    pushStr(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
    for (let objId = 1; objId <= totalObjects; objId++) {
      const padded = String(offsets[objId]).padStart(10, '0');
      pushStr(`${padded} 00000 n \n`);
    }
    pushStr(
      `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    );

    return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  }
}
