package com.uniform.app.infrastructure.persistence.mapper;

import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrderLine;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.GarmentSpecificationSnapshot;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.infrastructure.persistence.entity.B2bPurchaseOrderJpaEntity;
import com.uniform.app.infrastructure.persistence.entity.B2bPurchaseOrderLineJpaEntity;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@ApplicationScoped
public class B2bPurchaseOrderPersistenceMapper {

    public B2bPurchaseOrder toDomain(B2bPurchaseOrderJpaEntity entity) {
        if (entity == null) {
            return null;
        }
        List<B2bPurchaseOrderLine> domainLines = entity.getLines().stream()
                .map(lineEntity -> toDomainLine(entity.getId(), lineEntity))
                .toList();

        return new B2bPurchaseOrder(
                entity.getId(),
                entity.getClientId(),
                entity.getB2cOrderId(),
                entity.getPoNumber(),
                entity.getSupplierName(),
                entity.getStatus(),
                entity.getPoPdfStorageKey(),
                domainLines,
                entity.getVersion(),
                entity.getCreatedByUserId(),
                entity.getOrderedByUserId(),
                entity.getOrderedAt(),
                entity.getReceivedByUserId(),
                entity.getReceivedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private B2bPurchaseOrderLine toDomainLine(UUID poId, B2bPurchaseOrderLineJpaEntity lineEntity) {
        return new B2bPurchaseOrderLine(
                lineEntity.getId(),
                lineEntity.getClientId(),
                poId,
                new GarmentVariant(lineEntity.getCatalogItemId(), lineEntity.getGender(), lineEntity.getSize()),
                lineEntity.getB2cDemandedQuantity(),
                lineEntity.getFinalQuantity(),
                lineEntity.getB2bUnitCost(),
                lineEntity.getLineTotalCost(),
                new GarmentSpecificationSnapshot(
                        lineEntity.getItemNameSnapshot(),
                        lineEntity.getGarmentStyleSnapshot(),
                        lineEntity.getColorReferenceSnapshot(),
                        lineEntity.getFrontVisualStorageSnapshot(),
                        lineEntity.getBackVisualStorageSnapshot()
                )
        );
    }

    public void updateEntity(B2bPurchaseOrder domain, B2bPurchaseOrderJpaEntity entity) {
        entity.setId(domain.id());
        entity.setClientId(domain.clientId());
        entity.setB2cOrderId(domain.b2cOrderId());
        entity.setPoNumber(domain.poNumber());
        entity.setSupplierName(domain.supplierName());
        entity.setStatus(domain.status());
        entity.setTotalB2bCost(domain.totalB2bCost());
        entity.setPoPdfStorageKey(domain.poPdfStorageKey());
        entity.setCreatedByUserId(domain.createdByUserId());
        entity.setOrderedByUserId(domain.orderedByUserId());
        entity.setOrderedAt(domain.orderedAt());
        entity.setReceivedByUserId(domain.receivedByUserId());
        entity.setReceivedAt(domain.receivedAt());
        entity.setCreatedAt(domain.createdAt());
        entity.setUpdatedAt(domain.updatedAt());

        Map<UUID, B2bPurchaseOrderLineJpaEntity> existingById = entity.getLines().stream()
                .collect(Collectors.toMap(B2bPurchaseOrderLineJpaEntity::getId, Function.identity()));

        for (B2bPurchaseOrderLine line : domain.lines()) {
            B2bPurchaseOrderLineJpaEntity lineEntity = existingById.get(line.id());
            if (lineEntity == null) {
                lineEntity = new B2bPurchaseOrderLineJpaEntity();
                lineEntity.setId(line.id());
                lineEntity.setClientId(line.clientId());
                lineEntity.setB2bPurchaseOrder(entity);
                lineEntity.setCatalogItemId(line.catalogItemId());
                lineEntity.setGender(line.gender());
                lineEntity.setSize(line.size());
                lineEntity.setB2cDemandedQuantity(line.b2cDemandedQuantity());
                lineEntity.setB2bUnitCost(line.b2bUnitCost());
                lineEntity.setItemNameSnapshot(line.itemNameSnapshot());
                lineEntity.setGarmentStyleSnapshot(line.garmentStyleSnapshot());
                lineEntity.setColorReferenceSnapshot(line.colorReferenceSnapshot());
                lineEntity.setFrontVisualStorageSnapshot(line.frontVisualStorageSnapshot());
                lineEntity.setBackVisualStorageSnapshot(line.backVisualStorageSnapshot());
                entity.getLines().add(lineEntity);
            }
            lineEntity.setFinalQuantity(line.finalQuantity());
            lineEntity.setLineTotalCost(line.lineTotalCost());
        }
    }
}
