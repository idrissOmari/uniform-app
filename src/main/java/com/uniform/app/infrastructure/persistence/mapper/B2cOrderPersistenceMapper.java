package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.infrastructure.persistence.entity.B2cOrderJpaEntity;
import com.uniform.app.infrastructure.persistence.entity.B2cOrderLineJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@ApplicationScoped
public class B2cOrderPersistenceMapper {

    public B2cOrder toDomain(B2cOrderJpaEntity entity) {
        if (entity == null) {
            return null;
        }
        List<B2cOrderLine> domainLines = entity.getLines().stream()
                .map(lineEntity -> toDomainLine(entity.getId(), lineEntity))
                .toList();

        return new B2cOrder(
                entity.getId(),
                entity.getClientId(),
                entity.getOrderNumber(),
                entity.getStatus(),
                entity.getClientMoqSnapshot(),
                domainLines,
                entity.getVersion(),
                entity.getCreatedByUserId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private B2cOrderLine toDomainLine(UUID orderId, B2cOrderLineJpaEntity lineEntity) {
        return new B2cOrderLine(
                lineEntity.getId(),
                lineEntity.getClientId(),
                orderId,
                lineEntity.getSectionId(),
                lineEntity.getSectionName(),
                new GarmentVariant(lineEntity.getCatalogItemId(), lineEntity.getGender(), lineEntity.getSize()),
                lineEntity.getReceiptNumber(),
                new BuyerContact(lineEntity.getBuyerFullName(), lineEntity.getBuyerPhone(), lineEntity.getBuyerEmail()),
                lineEntity.getQuantity(),
                lineEntity.getB2cUnitPrice(),
                lineEntity.getLineCashAmount(),
                lineEntity.isCashPaymentConfirmed(),
                lineEntity.isIrreversibilityAcknowledged(),
                lineEntity.getLineStatus(),
                lineEntity.getReceiptPdfStorageKey(),
                lineEntity.getCreatedByUserId(),
                lineEntity.getCreatedAt(),
                lineEntity.getDeliveredByUserId(),
                lineEntity.getDeliveredAt()
        );
    }

    public void updateEntity(B2cOrder domain, B2cOrderJpaEntity entity) {
        entity.setId(domain.id());
        entity.setClientId(domain.clientId());
        entity.setOrderNumber(domain.orderNumber());
        entity.setStatus(domain.status());
        entity.setClientMoqSnapshot(domain.clientMoqSnapshot());
        entity.setTotalQuantity(domain.totalQuantity());
        entity.setTotalCashAmount(domain.totalCashAmount());
        entity.setCreatedByUserId(domain.createdByUserId());
        entity.setCreatedAt(domain.createdAt());
        entity.setUpdatedAt(domain.updatedAt());

        Map<UUID, B2cOrderLineJpaEntity> existingById = entity.getLines().stream()
                .collect(Collectors.toMap(B2cOrderLineJpaEntity::getId, Function.identity()));

        for (B2cOrderLine line : domain.lines()) {
            B2cOrderLineJpaEntity lineEntity = existingById.get(line.id());
            if (lineEntity == null) {
                lineEntity = new B2cOrderLineJpaEntity();
                lineEntity.setId(line.id());
                lineEntity.setClientId(line.clientId());
                lineEntity.setB2cOrder(entity);
                lineEntity.setCatalogItemId(line.catalogItemId());
                lineEntity.setSectionId(line.sectionId());
                lineEntity.setSectionName(line.sectionName());
                lineEntity.setReceiptNumber(line.receiptNumber());
                lineEntity.setBuyerFullName(line.buyerFullName());
                lineEntity.setBuyerPhone(line.buyerPhone());
                lineEntity.setBuyerEmail(line.buyerEmail());
                lineEntity.setGender(line.gender());
                lineEntity.setSize(line.size());
                lineEntity.setQuantity(line.quantity());
                lineEntity.setB2cUnitPrice(line.b2cUnitPrice());
                lineEntity.setLineCashAmount(line.lineCashAmount());
                lineEntity.setCashPaymentConfirmed(line.cashPaymentConfirmed());
                lineEntity.setIrreversibilityAcknowledged(line.irreversibilityAcknowledged());
                lineEntity.setReceiptPdfStorageKey(line.receiptPdfStorageKey());
                lineEntity.setCreatedByUserId(line.createdByUserId());
                lineEntity.setCreatedAt(line.createdAt());
                entity.getLines().add(lineEntity);
            }
            lineEntity.setLineStatus(line.lineStatus());
            lineEntity.setDeliveredByUserId(line.deliveredByUserId());
            lineEntity.setDeliveredAt(line.deliveredAt());
        }
    }
}
