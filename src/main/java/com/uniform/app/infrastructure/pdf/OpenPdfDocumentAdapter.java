package com.uniform.app.infrastructure.pdf;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
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
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
public class OpenPdfDocumentAdapter implements PdfDocumentPort {

    private static final DateTimeFormatter FRENCH_DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font BOLD_FONT = new Font(Font.HELVETICA, 10, Font.BOLD);

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

            PdfPTable table = new PdfPTable(new float[]{2.8f, 1.8f, 1.3f, 2.4f, 1.3f, 1.6f, 1.8f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(8f);
            table.setSpacingAfter(12f);

            addHeaderCell(table, "Intitulé du Produit & Coupe");
            addHeaderCell(table, "Coloris");
            addHeaderCell(table, "Taille");
            addHeaderCell(table, "Photo / Réf. Visuel");
            addHeaderCell(table, "Quantité à fabriquer");
            addHeaderCell(table, "Prix d'achat fournisseur HT");
            addHeaderCell(table, "Total Ligne HT");

            for (B2bPurchaseOrderLine line : b2bPurchaseOrder.lines()) {
                String visuals = "Face: " + line.frontVisualStorageSnapshot()
                        + (line.backVisualStorageSnapshot() != null ? " | Dos: " + line.backVisualStorageSnapshot() : "");
                String productLabel = line.itemNameSnapshot() != null && !line.itemNameSnapshot().equals(line.garmentStyleSnapshot())
                        ? line.itemNameSnapshot() + " (" + line.garmentStyleSnapshot() + ")"
                        : line.garmentStyleSnapshot();
                addBodyCell(table, productLabel);
                addBodyCell(table, line.colorReferenceSnapshot());
                addBodyCell(table, translateSizeFr(line.size().name()) + " (" + translateGenderFr(line.gender().name()) + ")");
                addBodyCell(table, visuals);
                addBodyCell(table, String.valueOf(line.finalQuantity()));
                addBodyCell(table, line.b2bUnitCost().toPlainString() + " DH");
                addBodyCell(table, line.lineTotalCost().toPlainString() + " DH");
            }

            document.add(table);

            Paragraph totalCost = new Paragraph(
                    "TOTAL BON DE COMMANDE FOURNISSEUR (" + b2bPurchaseOrder.supplierName() + ") : "
                            + b2bPurchaseOrder.totalB2bCost().toPlainString() + " DH HT",
                    SUBTITLE_FONT
            );
            document.add(totalCost);
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
        try (Document document = new Document(PageSize.A4, 36, 36, 36, 36)) {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("CATALOGUE DES TENUES SCOLAIRES — " + client.name().toUpperCase(), TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(8f);
            document.add(title);

            Paragraph subtitle = new Paragraph(
                    "Établissement : " + client.name() + "  |  Adresse : " + client.address(),
                    SUBTITLE_FONT
            );
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(14f);
            document.add(subtitle);

            document.add(new Paragraph(
                    "Bienvenue ! Ce flyer présente l'ensemble des produits officiels disponibles à la commande pour votre établissement.",
                    BODY_FONT
            ));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[]{1.6f, 2.6f, 1.8f, 2.2f, 2.0f, 1.5f});
            table.setWidthPercentage(100f);
            table.setSpacingBefore(6f);
            table.setSpacingAfter(14f);

            addHeaderCell(table, "Type Produit");
            addHeaderCell(table, "Intitulé & Style");
            addHeaderCell(table, "Coloris");
            addHeaderCell(table, "Tailles disponibles");
            addHeaderCell(table, "Photos / Visuels");
            addHeaderCell(table, "Prix TTC");

            String defaultSizesLabel = client.isPrimarySchool()
                    ? "Enfant : 2 ans à 14 ans"
                    : "Enfant (2-14 ans) & Adulte (XS-3XL)";

            for (CatalogItem item : catalogItems) {
                String sizesLabel = (item.availableSizes() != null && !item.availableSizes().isBlank())
                        ? formatAvailableSizesFr(item.availableSizes())
                        : defaultSizesLabel;
                String photosLabel = item.frontVisualStorageKey()
                        + (item.backVisualStorageKey() != null ? "\n" + item.backVisualStorageKey() : "");

                addBodyCell(table, translateProductTypeFr(item.productType()));
                addBodyCell(table, item.name() + "\n(" + item.garmentStyle() + " · Réf: " + item.referenceCode() + ")");
                addBodyCell(table, item.colorReference());
                addBodyCell(table, sizesLabel);
                addBodyCell(table, photosLabel);
                addBodyCell(table, item.b2cUnitPrice().toPlainString() + " DH");
            }

            document.add(table);

            if (client.sections() != null && !client.sections().isEmpty()) {
                String sectionsList = client.sections().stream()
                        .map(s -> s.name() + " (" + s.capacity() + " élèves)")
                        .collect(Collectors.joining("  ·  "));
                document.add(new Paragraph("Sections de l'établissement : " + sectionsList, BOLD_FONT));
                document.add(new Paragraph(" "));
            }

            document.add(new Paragraph(
                    "Modalités de commande : Présentez-vous au comptoir opérateur de l'établissement pour indiquer la section de l'élève, choisir les produits et tailles souhaités, et régler votre commande au comptant.",
                    BODY_FONT
            ));
        }
        return out.toByteArray();
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
