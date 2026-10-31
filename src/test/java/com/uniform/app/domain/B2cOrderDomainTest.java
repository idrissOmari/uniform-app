package com.uniform.app.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.uniform.app.domain.exception.B2bStockNotReceivedException;
import com.uniform.app.domain.exception.CashPaymentNotConfirmedException;
import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InsufficientClientStockException;
import com.uniform.app.domain.exception.InvalidGenderSizeCombinationException;
import com.uniform.app.domain.exception.MoqNotReachedException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.client.ClientSection;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderLineStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.enums.ClientType;
import com.uniform.app.domain.model.enums.ErrorCode;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.domain.model.vo.GarmentVariant;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class B2cOrderDomainTest {

    private UUID clientId;
    private UUID operatorId;
    private UUID adminId;
    private CatalogItem poloItem;
    private BuyerContact buyerAlice;
    private BuyerContact buyerBob;
    private Instant now;

    @BeforeEach
    void setUp() {
        clientId = UUID.randomUUID();
        operatorId = UUID.randomUUID();
        adminId = UUID.randomUUID();
        now = Instant.parse("2026-10-28T12:00:00Z");

        poloItem = CatalogItem.createNew(
                clientId,
                "POLO-NAVY-01",
                "Polo Officiel Brodé",
                "Coupe droite piquée 220g",
                "Pantone Navy 19-4024",
                "visuals/client1/polo-front.png",
                "visuals/client1/polo-back.png",
                "Logo coeur 8cm",
                new BigDecimal("25.50"),
                new BigDecimal("12.00"),
                adminId,
                now
        );

        buyerAlice = new BuyerContact("Alice Martin", "+33601020304", "alice@example.com");
        buyerBob = new BuyerContact("Bob Dupont", "+33605060708", "bob@example.com");
    }

    @Test
    @DisplayName("1.2 - Should enforce Gender and Size grid invariant on GarmentVariant")
    void shouldEnforceGenderAndSizeGridInvariant() {
        // Valid Adult combinations
        for (Gender adultGender : new Gender[]{Gender.MEN, Gender.WOMEN, Gender.UNISEX}) {
            for (Size adultSize : new Size[]{Size.XS, Size.S, Size.M, Size.L, Size.XL, Size.XXL, Size.XXXL}) {
                GarmentVariant v = new GarmentVariant(poloItem.id(), adultGender, adultSize);
                assertThat(v.gender()).isEqualTo(adultGender);
                assertThat(v.size()).isEqualTo(adultSize);
            }
        }

        // Valid Kids combinations
        for (Size kidsSize : new Size[]{Size.AGE_2, Size.AGE_4, Size.AGE_6, Size.AGE_8, Size.AGE_10, Size.AGE_12, Size.AGE_14}) {
            GarmentVariant v = new GarmentVariant(poloItem.id(), Gender.KIDS, kidsSize);
            assertThat(v.gender()).isEqualTo(Gender.KIDS);
            assertThat(v.size()).isEqualTo(kidsSize);
        }

        // Invalid: KIDS with Adult Size
        assertThatThrownBy(() -> new GarmentVariant(poloItem.id(), Gender.KIDS, Size.M))
                .isInstanceOf(InvalidGenderSizeCombinationException.class)
                .satisfies(ex -> {
                    InvalidGenderSizeCombinationException domainEx = (InvalidGenderSizeCombinationException) ex;
                    assertThat(domainEx.httpStatus()).isEqualTo(400);
                    assertThat(domainEx.errorCode()).isEqualTo(ErrorCode.INVALID_GENDER_SIZE);
                });

        // Invalid: MEN with Kids Size
        assertThatThrownBy(() -> new GarmentVariant(poloItem.id(), Gender.MEN, Size.AGE_10))
                .isInstanceOf(InvalidGenderSizeCombinationException.class)
                .satisfies(ex -> {
                    InvalidGenderSizeCombinationException domainEx = (InvalidGenderSizeCombinationException) ex;
                    assertThat(domainEx.httpStatus()).isEqualTo(400);
                    assertThat(domainEx.errorCode()).isEqualTo(ErrorCode.INVALID_GENDER_SIZE);
                });
    }

    @Test
    @DisplayName("1.2b - Primary school client (PRIMARY_SCHOOL) should only allow KIDS gender and Kids sizes")
    void shouldEnforceKidsOnlySizesForPrimarySchoolClient() {
        Client primarySchool = Client.createNew(
                "École Primaire Al Madina",
                ClientType.PRIMARY_SCHOOL,
                "Rabat, Maroc",
                "logos/almadina.png",
                10,
                adminId,
                now
        );

        assertThat(primarySchool.isPrimarySchool()).isTrue();
        primarySchool.assertVariantAllowedForClientType(Gender.KIDS, Size.AGE_8);

        assertThatThrownBy(() -> primarySchool.assertVariantAllowedForClientType(Gender.MEN, Size.M))
                .isInstanceOf(InvalidGenderSizeCombinationException.class)
                .satisfies(ex -> {
                    InvalidGenderSizeCombinationException domainEx = (InvalidGenderSizeCombinationException) ex;
                    assertThat(domainEx.httpStatus()).isEqualTo(400);
                    assertThat(domainEx.errorCode()).isEqualTo(ErrorCode.INVALID_GENDER_SIZE);
                });
    }

    @Test
    @DisplayName("1.1b - Client sections should enforce positive capacity, unique names per client, and compute total capacity")
    void shouldManageClientSectionsAndCapacities() {
        Client school = Client.createNew(
                "Groupe Scolaire Al Jabr",
                ClientType.PRIMARY_SCHOOL,
                "Casablanca, Maroc",
                "logos/aljabr.png",
                20,
                adminId,
                now
        );

        school.replaceSections(
                java.util.List.of(
                        ClientSection.createNew(school.id(), "CP - Section A", 28),
                        ClientSection.createNew(school.id(), "CE1 - Section A", 30)
                ),
                now
        );

        assertThat(school.sections()).hasSize(2);
        assertThat(school.totalCapacity()).isEqualTo(58);

        assertThatThrownBy(() -> ClientSection.createNew(school.id(), "CE2", 0))
                .isInstanceOf(DomainValidationException.class);

        assertThatThrownBy(() -> school.replaceSections(
                java.util.List.of(
                        ClientSection.createNew(school.id(), "CP - Section A", 25),
                        ClientSection.createNew(school.id(), "cp - section a", 30)
                ),
                now
        )).isInstanceOf(DomainValidationException.class);
    }

    @Test
    @DisplayName("1.3 - Should reject B2C line if cash payment or irreversibility is not confirmed")
    void shouldRejectLineWithoutExplicitCashConfirmation() {
        B2cOrder order = B2cOrder.initializeInProgress(clientId, "B2C-2026-001", 10, operatorId, now);

        assertThatThrownBy(() -> order.addCashOrderLine(
                poloItem, Gender.MEN, Size.L, 2, buyerAlice,
                false, true, "REC-001", "receipts/rec-001.pdf", operatorId, now
        ))
                .isInstanceOf(CashPaymentNotConfirmedException.class)
                .satisfies(ex -> {
                    CashPaymentNotConfirmedException domainEx = (CashPaymentNotConfirmedException) ex;
                    assertThat(domainEx.httpStatus()).isEqualTo(400);
                    assertThat(domainEx.errorCode()).isEqualTo(ErrorCode.CASH_CONFIRMATION_REQUIRED);
                });

        assertThatThrownBy(() -> order.addCashOrderLine(
                poloItem, Gender.MEN, Size.L, 2, buyerAlice,
                true, false, "REC-001", "receipts/rec-001.pdf", operatorId, now
        ))
                .isInstanceOf(CashPaymentNotConfirmedException.class);
    }

    @Test
    @DisplayName("1.1 - Should enforce strict client isolation when adding catalog item to B2C order")
    void shouldRejectCatalogItemFromAnotherClient() {
        UUID otherClientId = UUID.randomUUID();
        CatalogItem foreignItem = CatalogItem.createNew(
                otherClientId,
                "FOREIGN-01",
                "Sweat Autre Client",
                "Hoodie",
                "Black",
                "visuals/other/front.png",
                null,
                null,
                new BigDecimal("30.00"),
                new BigDecimal("15.00"),
                adminId,
                now
        );

        B2cOrder order = B2cOrder.initializeInProgress(clientId, "B2C-2026-001", 5, operatorId, now);

        assertThatThrownBy(() -> order.addCashOrderLine(
                foreignItem, Gender.UNISEX, Size.M, 2, buyerAlice,
                true, true, "REC-001", "receipts/rec-001.pdf", operatorId, now
        ))
                .isInstanceOf(DomainValidationException.class)
                .hasMessageContaining("Tenant isolation violation");
    }

    @Test
    @DisplayName("1.4 - Should block IN_PRODUCTION transition when MOQ is not reached (422 MOQ_NOT_REACHED)")
    void shouldBlockMoveToProductionWhenMoqNotReached() {
        B2cOrder order = B2cOrder.initializeInProgress(clientId, "B2C-2026-001", 10, operatorId, now);

        order.addCashOrderLine(
                poloItem, Gender.MEN, Size.L, 4, buyerAlice,
                true, true, "REC-001", "receipts/rec-001.pdf", operatorId, now
        );

        assertThat(order.totalQuantity()).isEqualTo(4);
        assertThat(order.isMoqReached()).isFalse();
        assertThat(order.totalCashAmount()).isEqualByComparingTo("102.00");

        assertThatThrownBy(() -> order.moveToProduction("PO-2026-001", Map.of(poloItem.id(), poloItem), adminId, now))
                .isInstanceOf(MoqNotReachedException.class)
                .satisfies(ex -> {
                    MoqNotReachedException moqEx = (MoqNotReachedException) ex;
                    assertThat(moqEx.httpStatus()).isEqualTo(422);
                    assertThat(moqEx.errorCode()).isEqualTo(ErrorCode.MOQ_NOT_REACHED);
                    assertThat(moqEx.currentQuantity()).isEqualTo(4);
                    assertThat(moqEx.requiredMoq()).isEqualTo(10);
                });
    }

    @Test
    @DisplayName("1.4 - Full synchronized lifecycle: IN_PROGRESS -> IN_PRODUCTION -> IN_DELIVERY -> automatic DELIVERED")
    void shouldExecuteFullSynchronizedB2cLifecycle() {
        B2cOrder order = B2cOrder.initializeInProgress(clientId, "B2C-2026-001", 5, operatorId, now);

        B2cOrderLine line1 = order.addCashOrderLine(
                poloItem, Gender.WOMEN, Size.S, 3, buyerAlice,
                true, true, "REC-001", "receipts/rec-001.pdf", operatorId, now
        );
        B2cOrderLine line2 = order.addCashOrderLine(
                poloItem, Gender.KIDS, Size.AGE_8, 2, buyerBob,
                true, true, "REC-002", "receipts/rec-002.pdf", operatorId, now
        );

        assertThat(order.totalQuantity()).isEqualTo(5);
        assertThat(order.isMoqReached()).isTrue();
        assertThat(order.totalCashAmount()).isEqualByComparingTo("127.50");

        // Move to IN_PRODUCTION -> locks B2C order and spawns DRAFT B2B PO
        B2bPurchaseOrder b2bPo = order.moveToProduction(
                "PO-2026-001",
                Map.of(poloItem.id(), poloItem),
                adminId,
                now
        );

        assertThat(order.status()).isEqualTo(B2cOrderStatus.IN_PRODUCTION);
        assertThat(b2bPo.status()).isEqualTo(B2bOrderStatus.DRAFT);
        assertThat(b2bPo.lines()).hasSize(2);

        // Locked B2C order must reject new lines (409 ORDER_IMMUTABLE)
        assertThatThrownBy(() -> order.addCashOrderLine(
                poloItem, Gender.MEN, Size.M, 1, buyerAlice,
                true, true, "REC-003", "receipts/rec-003.pdf", operatorId, now
        ))
                .isInstanceOf(OrderLockedException.class)
                .satisfies(ex -> {
                    OrderLockedException lockedEx = (OrderLockedException) ex;
                    assertThat(lockedEx.httpStatus()).isEqualTo(409);
                    assertThat(lockedEx.errorCode()).isEqualTo(ErrorCode.ORDER_IMMUTABLE);
                });

        // Cannot move to IN_DELIVERY before B2B PO is RECEIVED (409 B2B_STOCK_NOT_RECEIVED)
        assertThatThrownBy(() -> order.moveToDelivery(B2bOrderStatus.ORDERED, now))
                .isInstanceOf(B2bStockNotReceivedException.class)
                .satisfies(ex -> {
                    B2bStockNotReceivedException b2bEx = (B2bStockNotReceivedException) ex;
                    assertThat(b2bEx.httpStatus()).isEqualTo(409);
                    assertThat(b2bEx.errorCode()).isEqualTo(ErrorCode.B2B_STOCK_NOT_RECEIVED);
                });

        // Move to IN_DELIVERY once B2B PO is RECEIVED
        order.moveToDelivery(B2bOrderStatus.RECEIVED, now);
        assertThat(order.status()).isEqualTo(B2cOrderStatus.IN_DELIVERY);

        // Prepare client stock
        ClientStock stockWomenS = ClientStock.initializeEmpty(clientId, poloItem.id(), Gender.WOMEN, Size.S, now);
        stockWomenS.credit(3, now);
        ClientStock stockKids8 = ClientStock.initializeEmpty(clientId, poloItem.id(), Gender.KIDS, Size.AGE_8, now);
        stockKids8.credit(1, now); // Only 1 in stock whereas line2 needs 2

        // Deliver line 1: order remains IN_DELIVERY because line 2 is still PENDING_PICKUP
        order.markLineDelivered(line1.id(), stockWomenS, operatorId, now);
        assertThat(line1.lineStatus()).isEqualTo(B2cOrderLineStatus.DELIVERED);
        assertThat(stockWomenS.availableQuantity()).isZero();
        assertThat(order.status()).isEqualTo(B2cOrderStatus.IN_DELIVERY);

        // Attempt to deliver line 2 with insufficient stock -> 409 INSUFFICIENT_CLIENT_STOCK
        assertThatThrownBy(() -> order.markLineDelivered(line2.id(), stockKids8, operatorId, now))
                .isInstanceOf(InsufficientClientStockException.class)
                .satisfies(ex -> {
                    InsufficientClientStockException stockEx = (InsufficientClientStockException) ex;
                    assertThat(stockEx.httpStatus()).isEqualTo(409);
                    assertThat(stockEx.errorCode()).isEqualTo(ErrorCode.INSUFFICIENT_CLIENT_STOCK);
                });

        // Credit missing stock and deliver line 2 -> 100% lines delivered -> automatic transition to DELIVERED
        stockKids8.credit(1, now);
        order.markLineDelivered(line2.id(), stockKids8, operatorId, now);

        assertThat(line2.lineStatus()).isEqualTo(B2cOrderLineStatus.DELIVERED);
        assertThat(stockKids8.availableQuantity()).isZero();
        assertThat(order.status()).isEqualTo(B2cOrderStatus.DELIVERED);
    }
}
