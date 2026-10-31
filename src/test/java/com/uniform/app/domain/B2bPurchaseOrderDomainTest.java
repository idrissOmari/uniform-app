package com.uniform.app.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog.AuditEntityType;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrderLine;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.Money;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class B2bPurchaseOrderDomainTest {

    private UUID clientId;
    private UUID adminId;
    private Client client;
    private CatalogItem hoodieItem;
    private Instant now;

    @BeforeEach
    void setUp() {
        clientId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        now = Instant.parse("2026-10-28T14:00:00Z");

        client = Client.createNew(
                "Lycée International",
                "12 Avenue de la République, 75011 Paris",
                "logos/lycee.png",
                5,
                adminId,
                now
        );

        hoodieItem = CatalogItem.createNew(
                client.id(),
                "HOODIE-2026",
                "Sweat à Capuche Brodé",
                "Molleton 320g",
                "Bordeaux 19-1725",
                "visuals/hoodie-front.png",
                "visuals/hoodie-back.png",
                "Broderie dos",
                new BigDecimal("40.00"),
                new BigDecimal("18.50"),
                adminId,
                now
        );
        clientId = client.id();
    }

    @Test
    @DisplayName("1.4 - Should aggregate B2C lines by variant, allow finalQuantity edit in DRAFT, freeze cost on ORDERED, and credit stock on RECEIVED")
    void shouldManageFullB2bPurchaseOrderLifecycle() {
        B2cOrder b2cOrder = B2cOrder.initializeInProgress(clientId, "B2C-2026-010", client.moq(), adminId, now);
        BuyerContact buyer1 = new BuyerContact("Jean Valjean", "0611223344", "jean@example.com");
        BuyerContact buyer2 = new BuyerContact("Cosette Fauchelevent", "0655667788", "cosette@example.com");

        // Two distinct buyers ordering the exact same variant (UNISEX / M)
        b2cOrder.addCashOrderLine(
                hoodieItem, Gender.UNISEX, Size.M, 3, buyer1,
                true, true, "REC-101", "receipts/101.pdf", adminId, now
        );
        b2cOrder.addCashOrderLine(
                hoodieItem, Gender.UNISEX, Size.M, 4, buyer2,
                true, true, "REC-102", "receipts/102.pdf", adminId, now
        );

        B2bPurchaseOrder po = b2cOrder.moveToProduction(
                "PO-2026-010",
                Map.of(hoodieItem.id(), hoodieItem),
                adminId,
                now
        );

        // Verify aggregation into a single B2B line with demanded = 7 and initial finalQuantity = 7
        assertThat(po.status()).isEqualTo(B2bOrderStatus.DRAFT);
        assertThat(po.lines()).hasSize(1);

        B2bPurchaseOrderLine b2bLine = po.lines().getFirst();
        assertThat(b2bLine.b2cDemandedQuantity()).isEqualTo(7);
        assertThat(b2bLine.finalQuantity()).isEqualTo(7);
        assertThat(b2bLine.b2bUnitCost()).isEqualByComparingTo("18.50");
        assertThat(b2bLine.lineTotalCost()).isEqualByComparingTo("129.50");
        assertThat(b2bLine.garmentStyleSnapshot()).isEqualTo("Molleton 320g");
        assertThat(b2bLine.colorReferenceSnapshot()).isEqualTo("Bordeaux 19-1725");
        assertThat(po.totalB2bCost()).isEqualByComparingTo("129.50");

        // Admin adjusts finalQuantity in DRAFT to 10 (e.g. extra safety stock)
        po.updateLineFinalQuantity(b2bLine.id(), 10, now);
        assertThat(b2bLine.finalQuantity()).isEqualTo(10);
        assertThat(b2bLine.lineTotalCost()).isEqualByComparingTo("185.00");
        assertThat(po.totalB2bCost()).isEqualByComparingTo("185.00");

        // Cannot receive stock while still in DRAFT
        GarmentVariant variant = new GarmentVariant(hoodieItem.id(), Gender.UNISEX, Size.M);
        ClientStock clientStock = ClientStock.initializeEmpty(clientId, hoodieItem.id(), Gender.UNISEX, Size.M, now);
        assertThatThrownBy(() -> po.receiveStock(Map.of(variant, clientStock), adminId, now))
                .isInstanceOf(OrderLockedException.class);

        // Confirm B2B order (DRAFT -> ORDERED)
        po.confirmOrder(adminId, "po-pdfs/PO-2026-010.pdf", now);
        assertThat(po.status()).isEqualTo(B2bOrderStatus.ORDERED);
        assertThat(po.poPdfStorageKey()).isEqualTo("po-pdfs/PO-2026-010.pdf");
        assertThat(po.orderedByUserId()).isEqualTo(adminId);
        assertThat(po.totalB2bCost()).isEqualByComparingTo("185.00");

        // Cannot edit finalQuantity once ORDERED
        assertThatThrownBy(() -> po.updateLineFinalQuantity(b2bLine.id(), 12, now))
                .isInstanceOf(OrderLockedException.class);

        // Receive stock (ORDERED -> RECEIVED) -> credits ClientStock with finalQuantity (10)
        po.receiveStock(Map.of(variant, clientStock), adminId, now);
        assertThat(po.status()).isEqualTo(B2bOrderStatus.RECEIVED);
        assertThat(po.receivedByUserId()).isEqualTo(adminId);
        assertThat(clientStock.availableQuantity()).isEqualTo(10);
    }

    @Test
    @DisplayName("1.1 - Should update Client MOQ and validate Money & AuditLog value objects")
    void shouldUpdateClientMoqAndValidateValueObjects() {
        client.updateMoq(15, now.plusSeconds(60));
        assertThat(client.moq()).isEqualTo(15);

        Money price = Money.of("19.99").multiply(3).add(Money.of(new BigDecimal("0.03")));
        assertThat(price.amount()).isEqualByComparingTo("60.00");

        OrderStatusAuditLog log = new OrderStatusAuditLog(
                UUID.randomUUID(),
                clientId,
                AuditEntityType.B2B_PURCHASE_ORDER,
                UUID.randomUUID(),
                "DRAFT",
                "ORDERED",
                adminId,
                now,
                "Confirmed supplier order"
        );
        assertThat(log.newStatus()).isEqualTo("ORDERED");
    }
}
