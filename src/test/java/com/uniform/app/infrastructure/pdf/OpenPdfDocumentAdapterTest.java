package com.uniform.app.infrastructure.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.infrastructure.storage.LocalDocumentStorageService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class OpenPdfDocumentAdapterTest {

    @TempDir
    Path tempStorageDir;

    @Test
    @DisplayName("3.2 - Should generate and load valid B2C cash receipt PDF and B2B purchase order PDF via OpenPDF")
    void shouldGenerateAndLoadB2cReceiptAndB2bPurchaseOrderPdfs() {
        LocalDocumentStorageService storage = new LocalDocumentStorageService(tempStorageDir.toString());
        OpenPdfDocumentAdapter pdfAdapter = new OpenPdfDocumentAdapter(storage);

        UUID adminId = UUID.randomUUID();
        Instant now = Instant.parse("2026-10-28T15:00:00Z");

        Client client = Client.createNew("Collège Saint-Exupéry", "10 Rue de Lyon, 69000 Lyon", null, 2, adminId, now);
        UUID clientId = client.id();

        CatalogItem item = CatalogItem.createNew(
                clientId,
                "POLO-01",
                "Polo Collège",
                "Piqué 200g",
                "Bleu Roi",
                "visuals/front.png",
                "visuals/back.png",
                null,
                new BigDecimal("22.00"),
                new BigDecimal("10.50"),
                adminId,
                now
        );

        B2cOrder b2cOrder = B2cOrder.initializeInProgress(clientId, "B2C-PDF-001", client.moq(), adminId, now);
        B2cOrderLine line = b2cOrder.addCashOrderLine(
                item,
                Gender.KIDS,
                Size.AGE_12,
                3,
                new BuyerContact("Claire Martin", "0600112233", "claire@example.com"),
                true,
                true,
                "REC-PDF-001",
                "receipts/" + clientId + "/REC-PDF-001.pdf",
                adminId,
                now
        );

        String receiptKey = pdfAdapter.generateAndStoreB2cCashReceiptPdf(clientId, client, b2cOrder, line, item);
        byte[] receiptBytes = pdfAdapter.loadB2cCashReceiptPdf(clientId, receiptKey);

        assertThat(receiptBytes).isNotEmpty();
        assertThat(new String(receiptBytes, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");

        B2bPurchaseOrder po = b2cOrder.moveToProduction("PO-PDF-001", Map.of(item.id(), item), adminId, now);
        String poKey = pdfAdapter.generateAndStoreB2bPurchaseOrderPdf(clientId, client, po);
        byte[] poBytes = storage.loadDocument(clientId, poKey);

        assertThat(poBytes).isNotEmpty();
        assertThat(new String(poBytes, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }
}
