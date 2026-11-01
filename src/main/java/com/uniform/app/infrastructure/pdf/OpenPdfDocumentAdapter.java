package com.uniform.app.infrastructure.pdf;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrderLine;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.port.out.PdfDocumentPort;
import com.uniform.app.infrastructure.storage.LocalDocumentStorageService;
import jakarta.enterprise.context.ApplicationScoped;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.FontMetrics;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.GeneralPath;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.imageio.ImageIO;

@ApplicationScoped
public class OpenPdfDocumentAdapter implements PdfDocumentPort {

    private static final DateTimeFormatter FRENCH_DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font BOLD_FONT = new Font(Font.HELVETICA, 10, Font.BOLD);

    // Luxury Catalog Flyer Palette & Typography
    private static final Color NAVY_DARK = new Color(15, 23, 42);
    private static final Color NAVY_ACCENT = new Color(30, 58, 138);
    private static final Color GOLD_ACCENT = new Color(217, 119, 6);
    private static final Color GOLD_SOFT = new Color(254, 243, 199);
    private static final Color SLATE_BG = new Color(248, 250, 252);
    private static final Color CARD_BORDER = new Color(226, 232, 240);
    private static final Color TEXT_MUTED = new Color(100, 116, 139);
    private static final Color EMERALD_DARK = new Color(6, 95, 70);
    private static final Color EMERALD_BG = new Color(209, 250, 229);

    private static final Font HERO_SUPERTITLE_FONT = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(251, 191, 36));
    private static final Font HERO_TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD, Color.WHITE);
    private static final Font HERO_SUBTITLE_FONT = new Font(Font.HELVETICA, 9.5f, Font.NORMAL, new Color(203, 213, 225));
    private static final Font HERO_BADGE_FONT = new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE);

    private static final Font CARD_CATEGORY_FONT = new Font(Font.HELVETICA, 7.5f, Font.BOLD, NAVY_ACCENT);
    private static final Font CARD_REF_FONT = new Font(Font.HELVETICA, 7.5f, Font.NORMAL, TEXT_MUTED);
    private static final Font CARD_TITLE_FONT = new Font(Font.HELVETICA, 11.5f, Font.BOLD, NAVY_DARK);
    private static final Font CARD_STYLE_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, TEXT_MUTED);
    private static final Font CARD_LABEL_FONT = new Font(Font.HELVETICA, 8f, Font.BOLD, new Color(51, 65, 85));
    private static final Font CARD_VALUE_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, NAVY_DARK);
    private static final Font CARD_PRICE_FONT = new Font(Font.HELVETICA, 12f, Font.BOLD, EMERALD_DARK);
    private static final Font FOOTER_TITLE_FONT = new Font(Font.HELVETICA, 9.5f, Font.BOLD, NAVY_DARK);
    private static final Font FOOTER_TEXT_FONT = new Font(Font.HELVETICA, 8.5f, Font.NORMAL, new Color(71, 85, 105));

    private final LocalDocumentStorageService storageService;

    public OpenPdfDocumentAdapter(LocalDocumentStorageService storageService) {
        this.storageService = storageService;
    }

    @Override
    public String generateAndStoreB2cCashReceiptPdf(
            UUID clientId,
            Client client,
            B2cOrder b2cOrder,
            B2cOrderLine line,
            CatalogItem catalogItem
    ) {
        client.id();
        b2cOrder.assertBelongsToClient(clientId);
        catalogItem.assertBelongsToClient(clientId);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Document document = new Document(PageSize.A4, 40, 40, 40, 40)) {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("REÇU D'ENCAISSEMENT ESPÈCES — B2C", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(16f);
            document.add(title);

            document.add(new Paragraph("N° de Reçu : " + line.receiptNumber(), BOLD_FONT));
            document.add(new Paragraph("N° de Commande B2C : " + b2cOrder.orderNumber(), BODY_FONT));
            document.add(new Paragraph("Date d'encaissement : " + FRENCH_DATE_FORMAT.format(line.createdAt()), BODY_FONT));
            document.add(new Paragraph("Établissement / Client : " + client.name() + " — " + client.address(), BODY_FONT));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Coordonnées de l'Acheteur", SUBTITLE_FONT));
            document.add(new Paragraph("Nom complet : " + line.buyerFullName(), BODY_FONT));
            if (line.sectionName() != null && !line.sectionName().isBlank()) {
                document.add(new Paragraph("Section / Classe : " + line.sectionName(), BOLD_FONT));
            }
            document.add(new Paragraph("Téléphone : " + line.buyerPhone(), BODY_FONT));
            document.add(new Paragraph("Email : " + line.buyerEmail(), BODY_FONT));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[]{3f, 1.5f, 1.2f, 1.2f, 1.8f, 1.8f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(8f);
            table.setSpacingAfter(12f);

            addHeaderCell(table, "Article");
            addHeaderCell(table, "Genre");
            addHeaderCell(table, "Taille");
            addHeaderCell(table, "Quantité");
            addHeaderCell(table, "Prix Unitaire TTC");
            addHeaderCell(table, "Montant Espèces");

            addBodyCell(table, catalogItem.name() + " (" + catalogItem.referenceCode() + ")");
            addBodyCell(table, translateGenderFr(line.gender().name()));
            addBodyCell(table, translateSizeFr(line.size().name()));
            addBodyCell(table, String.valueOf(line.quantity()));
            addBodyCell(table, line.b2cUnitPrice().toPlainString() + " MAD");
            addBodyCell(table, line.lineCashAmount().toPlainString() + " MAD");

            document.add(table);

            Paragraph totalParagraph = new Paragraph(
                    "MONTANT TOTAL ACQUITTÉ EN ESPÈCES AU COMPTANT : " + line.lineCashAmount().toPlainString() + " MAD",
                    SUBTITLE_FONT
            );
            totalParagraph.setSpacingAfter(10f);
            document.add(totalParagraph);

            document.add(new Paragraph(
                    "Mention légale : Paiement intégral en espèces confirmé au comptant.",
                    BODY_FONT
            ));
        }

        storageService.storeDocument(clientId, line.receiptPdfStorageKey(), out.toByteArray());
        return line.receiptPdfStorageKey();
    }

    @Override
    public byte[] loadB2cCashReceiptPdf(UUID clientId, String receiptPdfStorageKey) {
        return storageService.loadDocument(clientId, receiptPdfStorageKey);
    }

    @Override
    public String generateAndStoreB2bPurchaseOrderPdf(
            UUID clientId,
            Client client,
            B2bPurchaseOrder b2bPurchaseOrder
    ) {
        b2bPurchaseOrder.assertBelongsToClient(clientId);
        String storageKey = "b2b-po/%s/%s.pdf".formatted(clientId, b2bPurchaseOrder.poNumber());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Document document = new Document(PageSize.A4.rotate(), 36, 36, 36, 36)) {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("BON DE COMMANDE FOURNISSEUR — B2B", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(14f);
            document.add(title);

            document.add(new Paragraph("N° Bon de Commande Fournisseur : " + b2bPurchaseOrder.poNumber(), BOLD_FONT));
            document.add(new Paragraph("Fournisseur destinataire : " + b2bPurchaseOrder.supplierName(), SUBTITLE_FONT));
            document.add(new Paragraph("Établissement / Client rattaché : " + client.name() + " (" + client.address() + ")", BODY_FONT));
            document.add(new Paragraph("Date d'émission : " + FRENCH_DATE_FORMAT.format(b2bPurchaseOrder.createdAt()), BODY_FONT));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[]{3.2f, 2.0f, 1.6f, 2.6f, 1.6f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(8f);
            table.setSpacingAfter(12f);

            addHeaderCell(table, "Intitulé du Produit & Coupe");
            addHeaderCell(table, "Coloris");
            addHeaderCell(table, "Taille");
            addHeaderCell(table, "Visuel / Modèle");
            addHeaderCell(table, "Quantité à fabriquer");

            int totalUnits = 0;
            for (B2bPurchaseOrderLine line : b2bPurchaseOrder.lines()) {
                String productLabel = line.itemNameSnapshot() != null && !line.itemNameSnapshot().equals(line.garmentStyleSnapshot())
                        ? line.itemNameSnapshot() + " (" + line.garmentStyleSnapshot() + ")"
                        : line.garmentStyleSnapshot();
                addBodyCell(table, productLabel);
                addBodyCell(table, line.colorReferenceSnapshot());
                addBodyCell(table, translateSizeFr(line.size().name()) + " (" + translateGenderFr(line.gender().name()) + ")");
                addBodyCell(table, describeVisualSnapshot(line.frontVisualStorageSnapshot(), line.backVisualStorageSnapshot()));
                addBodyCell(table, String.valueOf(line.finalQuantity()));
                totalUnits += line.finalQuantity();
            }

            document.add(table);

            Paragraph totalUnitsParagraph = new Paragraph(
                    "TOTAL UNITÉS À FABRIQUER (" + b2bPurchaseOrder.supplierName() + ") : " + totalUnits + " pièces",
                    SUBTITLE_FONT
            );
            document.add(totalUnitsParagraph);
        }

        storageService.storeDocument(clientId, storageKey, out.toByteArray());
        return storageKey;
    }

    @Override
    public byte[] loadB2bPurchaseOrderPdf(UUID clientId, String poPdfStorageKey) {
        return storageService.loadDocument(clientId, poPdfStorageKey);
    }

    @Override
    public byte[] generateClientCatalogFlyerPdf(UUID clientId, Client client, List<CatalogItem> catalogItems) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Document document = new Document(PageSize.A4, 28, 28, 28, 28)) {
            PdfWriter.getInstance(document, out);
            document.open();

            // 1. Luxury Editorial Header Banner with Establishment Logo
            PdfPTable headerBanner = new PdfPTable(new float[]{1.25f, 4.75f});
            headerBanner.setWidthPercentage(100f);
            headerBanner.setSpacingAfter(14f);

            PdfPCell logoCell = new PdfPCell();
            logoCell.setBackgroundColor(NAVY_DARK);
            logoCell.setBorderColor(NAVY_DARK);
            logoCell.setPadding(14f);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            logoCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            Image logoImage = resolveLogoOrEmblemImage(client.logoStorageKey(), client.name());
            if (logoImage != null) {
                logoImage.scaleToFit(72f, 72f);
                logoImage.setAlignment(Element.ALIGN_CENTER);
                logoCell.addElement(logoImage);
            }
            headerBanner.addCell(logoCell);

            PdfPCell titleCell = new PdfPCell();
            titleCell.setBackgroundColor(NAVY_DARK);
            titleCell.setBorderColor(NAVY_DARK);
            titleCell.setPaddingTop(14f);
            titleCell.setPaddingBottom(14f);
            titleCell.setPaddingLeft(8f);
            titleCell.setPaddingRight(16f);
            titleCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            Paragraph superTitle = new Paragraph("COLLECTION OFFICIELLE DES TENUES SCOLAIRES", HERO_SUPERTITLE_FONT);
            superTitle.setSpacingAfter(4f);
            titleCell.addElement(superTitle);

            Paragraph schoolTitle = new Paragraph(client.name().toUpperCase(Locale.ROOT), HERO_TITLE_FONT);
            schoolTitle.setSpacingAfter(5f);
            titleCell.addElement(schoolTitle);

            String schoolTypeLabel = client.isPrimarySchool()
                    ? "Établissement Primaire (Grille Enfant 2 à 14 ans)"
                    : "Collège / Lycée (Grilles Enfant & Adulte)";
            Paragraph metaLine = new Paragraph(schoolTypeLabel + "  •  " + client.address(), HERO_SUBTITLE_FONT);
            metaLine.setSpacingAfter(6f);
            titleCell.addElement(metaLine);

            Paragraph badgeLine = new Paragraph(
                    "Catalogue Lookbook  •  " + catalogItems.size() + (catalogItems.size() > 1 ? " modèles officiels" : " modèle officiel"),
                    HERO_BADGE_FONT
            );
            titleCell.addElement(badgeLine);
            headerBanner.addCell(titleCell);

            document.add(headerBanner);

            // 2. Product Showcase Cards (2-column Lookbook Grid)
            String defaultSizesLabel = client.isPrimarySchool()
                    ? "2 ans, 4 ans, 6 ans, 8 ans, 10 ans, 12 ans, 14 ans"
                    : "Enfant (2-14 ans) & Adulte (XS à 3XL)";

            if (catalogItems.isEmpty()) {
                Paragraph emptyMsg = new Paragraph(
                        "Aucun article n'est actuellement configuré dans le catalogue de cet établissement.",
                        BODY_FONT
                );
                emptyMsg.setSpacingAfter(14f);
                document.add(emptyMsg);
            } else {
                PdfPTable grid = new PdfPTable(new float[]{1f, 1f});
                grid.setWidthPercentage(100f);
                grid.setSpacingAfter(12f);

                for (CatalogItem item : catalogItems) {
                    PdfPCell cardWrapper = new PdfPCell();
                    cardWrapper.setBorder(Rectangle.NO_BORDER);
                    cardWrapper.setPadding(5f);
                    cardWrapper.addElement(buildProductLookbookCard(item, defaultSizesLabel));
                    grid.addCell(cardWrapper);
                }

                if (catalogItems.size() % 2 != 0) {
                    PdfPCell filler = new PdfPCell(new Phrase(" "));
                    filler.setBorder(Rectangle.NO_BORDER);
                    filler.setPadding(5f);
                    grid.addCell(filler);
                }

                document.add(grid);
            }

            // 3. Establishment Sections (without any MOQ)
            if (client.sections() != null && !client.sections().isEmpty()) {
                PdfPTable sectionsBox = new PdfPTable(1);
                sectionsBox.setWidthPercentage(100f);
                sectionsBox.setSpacingAfter(10f);

                PdfPCell secCell = new PdfPCell();
                secCell.setBackgroundColor(GOLD_SOFT);
                secCell.setBorderColor(new Color(253, 230, 138));
                secCell.setBorderWidth(1f);
                secCell.setPadding(10f);

                String sectionsList = client.sections().stream()
                        .map(s -> s.name())
                        .collect(Collectors.joining("  •  "));
                Paragraph secPara = new Paragraph();
                secPara.add(new Chunk("Classes & Sections de l'établissement : ", FOOTER_TITLE_FONT));
                secPara.add(new Chunk(sectionsList, FOOTER_TEXT_FONT));
                secCell.addElement(secPara);
                sectionsBox.addCell(secCell);

                document.add(sectionsBox);
            }

            // 4. Elegant Ordering Guide Footer
            PdfPTable footerBox = new PdfPTable(1);
            footerBox.setWidthPercentage(100f);
            PdfPCell footerCell = new PdfPCell();
            footerCell.setBackgroundColor(SLATE_BG);
            footerCell.setBorderColor(CARD_BORDER);
            footerCell.setBorderWidth(1f);
            footerCell.setPadding(11f);

            Paragraph guideTitle = new Paragraph("GUIDE DE COMMANDE AU COMPTOIR ÉTABLISSEMENT", FOOTER_TITLE_FONT);
            guideTitle.setSpacingAfter(4f);
            footerCell.addElement(guideTitle);

            Paragraph guideSteps = new Paragraph(
                    "1. Sélectionnez vos modèles et tailles à l'aide de ce catalogue officiel.\n"
                            + "2. Présentez-vous au comptoir dédié de l'établissement en indiquant le nom et la classe de l'élève.\n"
                            + "3. Réglez votre commande au comptant en espèces et conservez votre reçu officiel numéroté.",
                    FOOTER_TEXT_FONT
            );
            footerCell.addElement(guideSteps);
            footerBox.addCell(footerCell);
            document.add(footerBox);
        }
        return out.toByteArray();
    }

    private PdfPTable buildProductLookbookCard(CatalogItem item, String defaultSizesLabel) {
        PdfPTable card = new PdfPTable(1);
        card.setWidthPercentage(100f);

        // Top visual preview area
        PdfPCell imageCell = new PdfPCell();
        imageCell.setBackgroundColor(SLATE_BG);
        imageCell.setBorderColor(CARD_BORDER);
        imageCell.setBorderWidthTop(1f);
        imageCell.setBorderWidthLeft(1f);
        imageCell.setBorderWidthRight(1f);
        imageCell.setBorderWidthBottom(0f);
        imageCell.setPadding(10f);
        imageCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        imageCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        imageCell.setFixedHeight(130f);

        Image previewImg = resolveProductPreviewImage(item);
        if (previewImg != null) {
            previewImg.scaleToFit(210f, 110f);
            previewImg.setAlignment(Element.ALIGN_CENTER);
            imageCell.addElement(previewImg);
        }
        card.addCell(imageCell);

        // Product details & price body
        PdfPCell bodyCell = new PdfPCell();
        bodyCell.setBackgroundColor(Color.WHITE);
        bodyCell.setBorderColor(CARD_BORDER);
        bodyCell.setBorderWidthTop(0.5f);
        bodyCell.setBorderWidthLeft(1f);
        bodyCell.setBorderWidthRight(1f);
        bodyCell.setBorderWidthBottom(1f);
        bodyCell.setPadding(10f);

        Paragraph categoryAndRef = new Paragraph();
        categoryAndRef.add(new Chunk(translateProductTypeFr(item.productType()).toUpperCase(Locale.ROOT), CARD_CATEGORY_FONT));
        categoryAndRef.add(new Chunk("   •   Réf. " + item.referenceCode(), CARD_REF_FONT));
        categoryAndRef.setSpacingAfter(3f);
        bodyCell.addElement(categoryAndRef);

        Paragraph itemTitle = new Paragraph(item.name(), CARD_TITLE_FONT);
        itemTitle.setSpacingAfter(2f);
        bodyCell.addElement(itemTitle);

        Paragraph styleLine = new Paragraph("Coupe / Tissu : " + item.garmentStyle(), CARD_STYLE_FONT);
        styleLine.setSpacingAfter(6f);
        bodyCell.addElement(styleLine);

        Paragraph colorLine = new Paragraph();
        colorLine.add(new Chunk("Coloris : ", CARD_LABEL_FONT));
        colorLine.add(new Chunk(item.colorReference(), CARD_VALUE_FONT));
        colorLine.setSpacingAfter(3f);
        bodyCell.addElement(colorLine);

        String sizesLabel = (item.availableSizes() != null && !item.availableSizes().isBlank())
                ? formatAvailableSizesFr(item.availableSizes())
                : defaultSizesLabel;
        Paragraph sizesLine = new Paragraph();
        sizesLine.add(new Chunk("Tailles : ", CARD_LABEL_FONT));
        sizesLine.add(new Chunk(sizesLabel, CARD_VALUE_FONT));
        sizesLine.setSpacingAfter(4f);
        bodyCell.addElement(sizesLine);

        if (item.visualPlacementNotes() != null && !item.visualPlacementNotes().isBlank()) {
            Paragraph notesLine = new Paragraph();
            notesLine.add(new Chunk("Personnalisation : ", CARD_LABEL_FONT));
            notesLine.add(new Chunk(item.visualPlacementNotes(), CARD_STYLE_FONT));
            notesLine.setSpacingAfter(4f);
            bodyCell.addElement(notesLine);
        }

        // Price footer bar inside card
        PdfPTable priceBar = new PdfPTable(new float[]{1.2f, 1.3f});
        priceBar.setWidthPercentage(100f);
        priceBar.setSpacingBefore(4f);

        PdfPCell priceTagLabelCell = new PdfPCell(new Phrase("Prix Officiel TTC", CARD_LABEL_FONT));
        priceTagLabelCell.setBackgroundColor(EMERALD_BG);
        priceTagLabelCell.setBorderColor(EMERALD_BG);
        priceTagLabelCell.setPadding(6f);
        priceTagLabelCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        priceBar.addCell(priceTagLabelCell);

        PdfPCell priceValueCell = new PdfPCell(new Phrase(item.b2cUnitPrice().toPlainString() + " DH", CARD_PRICE_FONT));
        priceValueCell.setBackgroundColor(EMERALD_BG);
        priceValueCell.setBorderColor(EMERALD_BG);
        priceValueCell.setPadding(6f);
        priceValueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        priceValueCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        priceBar.addCell(priceValueCell);

        bodyCell.addElement(priceBar);
        card.addCell(bodyCell);

        return card;
    }

    private Image resolveLogoOrEmblemImage(String logoStorageKey, String schoolName) {
        Image decoded = tryDecodeImageFromStorageKey(logoStorageKey);
        if (decoded != null) {
            return decoded;
        }
        try {
            BufferedImage img = new BufferedImage(160, 160, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2 = img.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // Outer gold crest circle
            g2.setColor(GOLD_ACCENT);
            g2.fillOval(8, 8, 144, 144);

            // Inner navy shield circle
            g2.setColor(NAVY_ACCENT);
            g2.fillOval(16, 16, 128, 128);

            // Subtle inner ring
            g2.setColor(new Color(251, 191, 36, 180));
            g2.setStroke(new BasicStroke(2.5f));
            g2.drawOval(24, 24, 112, 112);

            // Initials
            String initials = extractInitials(schoolName);
            g2.setColor(Color.WHITE);
            java.awt.Font awtFont = new java.awt.Font("SansSerif", java.awt.Font.BOLD, 44);
            g2.setFont(awtFont);
            FontMetrics fm = g2.getFontMetrics();
            int x = (160 - fm.stringWidth(initials)) / 2;
            int y = ((160 - fm.getHeight()) / 2) + fm.getAscent();
            g2.drawString(initials, x, y);
            g2.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return Image.getInstance(baos.toByteArray());
        } catch (Exception _) {
            return null;
        }
    }

    private Image resolveProductPreviewImage(CatalogItem item) {
        Image frontImg = tryDecodeImageFromStorageKey(item.frontVisualStorageKey());
        Image backImg = tryDecodeImageFromStorageKey(item.backVisualStorageKey());
        if (frontImg != null && backImg == null) {
            return frontImg;
        }
        if (frontImg == null && backImg != null) {
            return backImg;
        }
        if (frontImg != null) {
            return frontImg;
        }
        return drawGarmentIllustrationImage(item.productType(), item.colorReference(), item.referenceCode());
    }

    private Image tryDecodeImageFromStorageKey(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return null;
        }
        String trimmed = storageKey.trim();
        try {
            if (trimmed.startsWith("data:image/")) {
                int commaIndex = trimmed.indexOf(',');
                if (commaIndex > 0) {
                    String base64Part = trimmed.substring(commaIndex + 1).replaceAll("\\s+", "");
                    byte[] bytes = Base64.getDecoder().decode(base64Part);
                    return Image.getInstance(bytes);
                }
            }
        } catch (Exception _) {
            return null;
        }
        return null;
    }

    private Image drawGarmentIllustrationImage(String productType, String colorReference, String referenceCode) {
        try {
            int width = 360;
            int height = 200;
            BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g2 = canvas.createGraphics();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // Soft studio backdrop card
            GradientPaint bgPaint = new GradientPaint(0, 0, new Color(248, 250, 252), 0, height, new Color(241, 245, 249));
            g2.setPaint(bgPaint);
            g2.fill(new RoundRectangle2D.Float(4, 4, width - 8, height - 8, 20, 20));

            Color primaryColor = resolveGarmentColor(colorReference);
            Color strokeColor = primaryColor.equals(Color.WHITE)
                    ? new Color(148, 163, 184)
                    : primaryColor.darker();

            // Draw garment silhouette centered
            String normalizedType = productType != null ? productType.trim().toUpperCase(Locale.ROOT) : "POLO";
            GeneralPath silhouette = new GeneralPath();

            if (normalizedType.equals("TROUSERS_SKIRT")) {
                // Trousers silhouette
                silhouette.moveTo(145, 32);
                silhouette.lineTo(215, 32);
                silhouette.lineTo(226, 168);
                silhouette.lineTo(192, 168);
                silhouette.lineTo(180, 88);
                silhouette.lineTo(168, 168);
                silhouette.lineTo(134, 168);
                silhouette.closePath();
            } else {
                // Top / Polo / Sweatshirt / Jacket / Shirt silhouette
                boolean longSleeve = normalizedType.equals("SWEATSHIRT")
                        || normalizedType.equals("CARDIGAN")
                        || normalizedType.equals("JACKET")
                        || normalizedType.equals("TRACKSUIT");
                silhouette.moveTo(148, 34);
                silhouette.lineTo(212, 34);
                if (longSleeve) {
                    silhouette.lineTo(256, 72);
                    silhouette.lineTo(242, 138);
                    silhouette.lineTo(218, 132);
                    silhouette.lineTo(216, 78);
                    silhouette.lineTo(216, 168);
                    silhouette.lineTo(144, 168);
                    silhouette.lineTo(144, 78);
                    silhouette.lineTo(142, 132);
                    silhouette.lineTo(118, 138);
                    silhouette.lineTo(104, 72);
                } else {
                    silhouette.lineTo(248, 66);
                    silhouette.lineTo(232, 96);
                    silhouette.lineTo(214, 84);
                    silhouette.lineTo(214, 168);
                    silhouette.lineTo(146, 168);
                    silhouette.lineTo(146, 84);
                    silhouette.lineTo(128, 96);
                    silhouette.lineTo(112, 66);
                }
                silhouette.closePath();
            }

            g2.setColor(primaryColor);
            g2.fill(silhouette);
            g2.setColor(strokeColor);
            g2.setStroke(new BasicStroke(2.2f));
            g2.draw(silhouette);

            // Collar & crest accent for tops
            if (!normalizedType.equals("TROUSERS_SKIRT")) {
                g2.setColor(primaryColor.equals(Color.WHITE) ? NAVY_DARK : Color.WHITE);
                g2.fillArc(164, 26, 32, 18, 180, 180);
                // Small school crest badge on chest
                g2.setColor(GOLD_ACCENT);
                g2.fillOval(192, 62, 12, 12);
            }

            // Reference tag in bottom-right corner
            if (referenceCode != null && !referenceCode.isBlank()) {
                g2.setColor(new Color(15, 23, 42, 210));
                g2.fillRoundRect(width - 110, height - 32, 96, 20, 8, 8);
                g2.setColor(Color.WHITE);
                g2.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 10));
                g2.drawString(referenceCode.length() > 12 ? referenceCode.substring(0, 12) : referenceCode, width - 102, height - 18);
            }

            g2.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(canvas, "png", baos);
            return Image.getInstance(baos.toByteArray());
        } catch (Exception _) {
            return null;
        }
    }

    private static Color resolveGarmentColor(String colorReference) {
        if (colorReference == null || colorReference.isBlank()) {
            return new Color(30, 58, 138);
        }
        String lower = colorReference.toLowerCase(Locale.ROOT);
        if (lower.contains("blanc") || lower.contains("white")) {
            return Color.WHITE;
        }
        if (lower.contains("marine") || lower.contains("navy")) {
            return new Color(23, 37, 84);
        }
        if (lower.contains("bleu") || lower.contains("blue") || lower.contains("ciel")) {
            return new Color(37, 99, 235);
        }
        if (lower.contains("rouge") || lower.contains("bordeaux") || lower.contains("grenat")) {
            return new Color(153, 27, 27);
        }
        if (lower.contains("vert") || lower.contains("green") || lower.contains("sapin")) {
            return new Color(22, 101, 52);
        }
        if (lower.contains("gris") || lower.contains("chiné") || lower.contains("anthracite")) {
            return new Color(100, 116, 139);
        }
        if (lower.contains("noir") || lower.contains("black")) {
            return new Color(30, 41, 59);
        }
        if (lower.contains("beige") || lower.contains("kaki") || lower.contains("sable")) {
            return new Color(180, 158, 122);
        }
        if (lower.contains("jaune") || lower.contains("or")) {
            return new Color(217, 119, 6);
        }
        return new Color(30, 58, 138);
    }

    private static String extractInitials(String name) {
        if (name == null || name.isBlank()) {
            return "UA";
        }
        String[] tokens = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (!token.isEmpty() && Character.isLetterOrDigit(token.charAt(0))) {
                sb.append(Character.toUpperCase(token.charAt(0)));
                if (sb.length() == 2) {
                    break;
                }
            }
        }
        return sb.isEmpty() ? "UA" : sb.toString();
    }

    private static String describeVisualSnapshot(String front, String back) {
        String frontLabel = formatSingleVisualLabel("Face", front);
        String backLabel = formatSingleVisualLabel("Dos", back);
        if (frontLabel.isEmpty() && backLabel.isEmpty()) {
            return "Standard (sans visuel)";
        }
        if (!frontLabel.isEmpty() && !backLabel.isEmpty()) {
            return frontLabel + " | " + backLabel;
        }
        return !frontLabel.isEmpty() ? frontLabel : backLabel;
    }

    private static String formatSingleVisualLabel(String side, String val) {
        if (val == null || val.isBlank()) {
            return "";
        }
        if (val.trim().startsWith("data:image/")) {
            return side + " : Photo jointe";
        }
        return side + " : " + val.trim();
    }

    @Override
    public byte[] generateB2cOrderPackingListPdf(
            UUID clientId,
            Client client,
            B2cOrder b2cOrder,
            Map<UUID, CatalogItem> catalogItemsById
    ) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (Document document = new Document(PageSize.A4, 36, 36, 36, 36)) {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph(
                    "BORDEREAU DE RECONSTITUTION & COLISAGE PAR CLIENT FINAL",
                    TITLE_FONT
            );
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10f);
            document.add(title);

            document.add(new Paragraph("Établissement : " + client.name() + " (" + client.address() + ")", SUBTITLE_FONT));
            document.add(new Paragraph(
                    "Commande Globale : " + b2cOrder.orderNumber()
                            + "  |  Total articles : " + b2cOrder.totalQuantity()
                            + "  |  Édité le : " + FRENCH_DATE_FORMAT.format(Instant.now()),
                    BODY_FONT
            ));
            document.add(new Paragraph(" "));

            // Regrouper les lignes par client final (Nom + Téléphone + Section)
            Map<String, List<B2cOrderLine>> linesByBuyer = new LinkedHashMap<>();
            for (B2cOrderLine line : b2cOrder.lines()) {
                String sectionKey = line.sectionName() != null ? line.sectionName().trim() : "";
                String buyerKey = line.buyerFullName().trim().toLowerCase()
                        + "|" + line.buyerPhone().trim()
                        + "|" + sectionKey.toLowerCase();
                linesByBuyer.computeIfAbsent(buyerKey, _ -> new ArrayList<>()).add(line);
            }

            PdfPTable table = new PdfPTable(new float[]{2.4f, 1.8f, 4.2f, 1.2f, 1.6f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(8f);
            table.setSpacingAfter(12f);

            addHeaderCell(table, "Client Final (Parent / Élève)");
            addHeaderCell(table, "Section / Classe");
            addHeaderCell(table, "Contenu du colis à reconstituer (Articles & Tailles)");
            addHeaderCell(table, "Total Qté");
            addHeaderCell(table, "Pointage Remise");

            for (List<B2cOrderLine> buyerLines : linesByBuyer.values()) {
                B2cOrderLine first = buyerLines.getFirst();
                String buyerInfo = first.buyerFullName() + "\nTél : " + first.buyerPhone();
                String sectionLabel = (first.sectionName() != null && !first.sectionName().isBlank())
                        ? first.sectionName()
                        : "Non renseignée";

                StringBuilder itemsBuilder = new StringBuilder();
                int buyerTotalQty = 0;
                boolean allDelivered = true;

                for (B2cOrderLine l : buyerLines) {
                    CatalogItem item = catalogItemsById.get(l.catalogItemId());
                    String itemName = item != null ? item.name() : "Article";
                    String colorInfo = item != null ? " (" + item.colorReference() + ")" : "";
                    if (!itemsBuilder.isEmpty()) {
                        itemsBuilder.append("\n");
                    }
                    itemsBuilder.append("• ")
                            .append(l.quantity())
                            .append(" × ")
                            .append(itemName)
                            .append(" — Taille ")
                            .append(translateSizeFr(l.size().name()))
                            .append(colorInfo);
                    buyerTotalQty += l.quantity();
                    if (l.lineStatus().name().equals("PENDING_PICKUP")) {
                        allDelivered = false;
                    }
                }

                addBodyCell(table, buyerInfo);
                addBodyCell(table, sectionLabel);
                addBodyCell(table, itemsBuilder.toString());
                addBodyCell(table, buyerTotalQty + " art.");
                addBodyCell(table, allDelivered ? "[X] Remis" : "[  ] À distribuer");
            }

            document.add(table);

            document.add(new Paragraph(
                    "Total de commandes clients à reconstituer : " + linesByBuyer.size()
                            + " colis (" + b2cOrder.totalQuantity() + " articles au total).",
                    BOLD_FONT
            ));
        }
        return out.toByteArray();
    }

    private static void addHeaderCell(PdfPTable table, String label) {
        PdfPCell cell = new PdfPCell(new Phrase(label, BOLD_FONT));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    private static void addBodyCell(PdfPTable table, String value) {
        PdfPCell cell = new PdfPCell(new Phrase(value != null ? value : "", BODY_FONT));
        cell.setPadding(5f);
        table.addCell(cell);
    }

    private static String translateGenderFr(String gender) {
        return switch (gender) {
            case "MEN" -> "Homme";
            case "WOMEN" -> "Femme";
            case "UNISEX" -> "Unisexe";
            case "KIDS" -> "Enfant";
            default -> gender;
        };
    }

    private static String translateSizeFr(String size) {
        return switch (size) {
            case "AGE_2" -> "2 ans";
            case "AGE_4" -> "4 ans";
            case "AGE_6" -> "6 ans";
            case "AGE_8" -> "8 ans";
            case "AGE_10" -> "10 ans";
            case "AGE_12" -> "12 ans";
            case "AGE_14" -> "14 ans";
            default -> size;
        };
    }

    private static String translateProductTypeFr(String productType) {
        if (productType == null) {
            return "Polo";
        }
        return switch (productType.trim().toUpperCase()) {
            case "POLO" -> "Polo";
            case "SHIRT" -> "Chemise";
            case "TRACKSUIT" -> "Combinaison sport";
            case "SWEATSHIRT" -> "Sweat à capuche";
            case "CARDIGAN" -> "Pull / Cardigan";
            case "TROUSERS_SKIRT" -> "Pantalon / Jupe";
            case "BLOUSE" -> "Blouse / Tablier";
            case "JACKET" -> "Veste / Blazer";
            default -> productType;
        };
    }

    private static String formatAvailableSizesFr(String availableSizes) {
        String[] parts = availableSizes.split(",");
        List<String> translated = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) {
                translated.add(translateSizeFr(trimmed));
            }
        }
        return String.join(", ", translated);
    }
}
