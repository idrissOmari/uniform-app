package com.uniform.app.domain.port.out;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface PdfDocumentPort {

    String generateAndStoreB2cCashReceiptPdf(
            UUID clientId,
            Client client,
            B2cOrder b2cOrder,
            B2cOrderLine line,
            CatalogItem catalogItem
    );

    byte[] loadB2cCashReceiptPdf(UUID clientId, String receiptPdfStorageKey);

    String generateAndStoreB2bPurchaseOrderPdf(
            UUID clientId,
            Client client,
            B2bPurchaseOrder b2bPurchaseOrder
    );

    default byte[] loadB2bPurchaseOrderPdf(UUID clientId, String poPdfStorageKey) {
        return loadB2cCashReceiptPdf(clientId, poPdfStorageKey);
    }

    default byte[] generateClientCatalogFlyerPdf(UUID clientId, Client client, List<CatalogItem> catalogItems) {
        return new byte[0];
    }

    default byte[] generateB2cOrderPackingListPdf(
            UUID clientId,
            Client client,
            B2cOrder b2cOrder,
            Map<UUID, CatalogItem> catalogItemsById
    ) {
        return new byte[0];
    }
}
