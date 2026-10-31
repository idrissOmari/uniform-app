package com.uniform.app.infrastructure.persistence.entity;

import com.uniform.app.domain.model.enums.B2cOrderLineStatus;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "b2c_order_lines")
public class B2cOrderLineJpaEntity {

    @Id
    @Column(name = "id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "client_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID clientId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "b2c_order_id", nullable = false, updatable = false)
    private B2cOrderJpaEntity b2cOrder;

    @Column(name = "catalog_item_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID catalogItemId;

    @Column(name = "section_id", columnDefinition = "BINARY(16)", updatable = false)
    private UUID sectionId;

    @Column(name = "section_name", length = 120, updatable = false)
    private String sectionName;

    @Column(name = "receipt_number", length = 64, nullable = false, unique = true, updatable = false)
    private String receiptNumber;

    @Column(name = "buyer_full_name", length = 150, nullable = false, updatable = false)
    private String buyerFullName;

    @Column(name = "buyer_phone", length = 40, nullable = false, updatable = false)
    private String buyerPhone;

    @Column(name = "buyer_email", length = 255, nullable = false, updatable = false)
    private String buyerEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 16, nullable = false, updatable = false)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", length = 16, nullable = false, updatable = false)
    private Size size;

    @Column(name = "quantity", nullable = false, updatable = false)
    private int quantity;

    @Column(name = "b2c_unit_price", precision = 12, scale = 2, nullable = false, updatable = false)
    private BigDecimal b2cUnitPrice;

    @Column(name = "line_cash_amount", precision = 12, scale = 2, nullable = false, updatable = false)
    private BigDecimal lineCashAmount;

    @Column(name = "cash_payment_confirmed", nullable = false, updatable = false)
    private boolean cashPaymentConfirmed;

    @Column(name = "irreversibility_acknowledged", nullable = false, updatable = false)
    private boolean irreversibilityAcknowledged;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_status", length = 24, nullable = false)
    private B2cOrderLineStatus lineStatus;

    @Column(name = "receipt_pdf_storage_key", length = 512, nullable = false, updatable = false)
    private String receiptPdfStorageKey;

    @Column(name = "created_by_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "delivered_by_user_id", columnDefinition = "BINARY(16)")
    private UUID deliveredByUserId;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    public B2cOrderLineJpaEntity() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getClientId() {
        return clientId;
    }

    public void setClientId(UUID clientId) {
        this.clientId = clientId;
    }

    public B2cOrderJpaEntity getB2cOrder() {
        return b2cOrder;
    }

    public void setB2cOrder(B2cOrderJpaEntity b2cOrder) {
        this.b2cOrder = b2cOrder;
    }

    public UUID getCatalogItemId() {
        return catalogItemId;
    }

    public void setCatalogItemId(UUID catalogItemId) {
        this.catalogItemId = catalogItemId;
    }

    public UUID getSectionId() {
        return sectionId;
    }

    public void setSectionId(UUID sectionId) {
        this.sectionId = sectionId;
    }

    public String getSectionName() {
        return sectionName;
    }

    public void setSectionName(String sectionName) {
        this.sectionName = sectionName;
    }

    public String getReceiptNumber() {
        return receiptNumber;
    }

    public void setReceiptNumber(String receiptNumber) {
        this.receiptNumber = receiptNumber;
    }

    public String getBuyerFullName() {
        return buyerFullName;
    }

    public void setBuyerFullName(String buyerFullName) {
        this.buyerFullName = buyerFullName;
    }

    public String getBuyerPhone() {
        return buyerPhone;
    }

    public void setBuyerPhone(String buyerPhone) {
        this.buyerPhone = buyerPhone;
    }

    public String getBuyerEmail() {
        return buyerEmail;
    }

    public void setBuyerEmail(String buyerEmail) {
        this.buyerEmail = buyerEmail;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public Size getSize() {
        return size;
    }

    public void setSize(Size size) {
        this.size = size;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getB2cUnitPrice() {
        return b2cUnitPrice;
    }

    public void setB2cUnitPrice(BigDecimal b2cUnitPrice) {
        this.b2cUnitPrice = b2cUnitPrice;
    }

    public BigDecimal getLineCashAmount() {
        return lineCashAmount;
    }

    public void setLineCashAmount(BigDecimal lineCashAmount) {
        this.lineCashAmount = lineCashAmount;
    }

    public boolean isCashPaymentConfirmed() {
        return cashPaymentConfirmed;
    }

    public void setCashPaymentConfirmed(boolean cashPaymentConfirmed) {
        this.cashPaymentConfirmed = cashPaymentConfirmed;
    }

    public boolean isIrreversibilityAcknowledged() {
        return irreversibilityAcknowledged;
    }

    public void setIrreversibilityAcknowledged(boolean irreversibilityAcknowledged) {
        this.irreversibilityAcknowledged = irreversibilityAcknowledged;
    }

    public B2cOrderLineStatus getLineStatus() {
        return lineStatus;
    }

    public void setLineStatus(B2cOrderLineStatus lineStatus) {
        this.lineStatus = lineStatus;
    }

    public String getReceiptPdfStorageKey() {
        return receiptPdfStorageKey;
    }

    public void setReceiptPdfStorageKey(String receiptPdfStorageKey) {
        this.receiptPdfStorageKey = receiptPdfStorageKey;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(UUID createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public UUID getDeliveredByUserId() {
        return deliveredByUserId;
    }

    public void setDeliveredByUserId(UUID deliveredByUserId) {
        this.deliveredByUserId = deliveredByUserId;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(Instant deliveredAt) {
        this.deliveredAt = deliveredAt;
    }
}
