package com.uniform.app.api.mapper;

import com.uniform.app.api.dto.ApiDtos.AdminCatalogItemResponse;
import com.uniform.app.api.dto.ApiDtos.B2bPurchaseOrderLineResponse;
import com.uniform.app.api.dto.ApiDtos.B2bPurchaseOrderResponse;
import com.uniform.app.api.dto.ApiDtos.B2cCatalogItemResponse;
import com.uniform.app.api.dto.ApiDtos.B2cOrderDetailResponse;
import com.uniform.app.api.dto.ApiDtos.B2cOrderLineResponse;
import com.uniform.app.api.dto.ApiDtos.B2cOrderSummaryResponse;
import com.uniform.app.api.dto.ApiDtos.ClientResponse;
import com.uniform.app.api.dto.ApiDtos.ClientSectionResponse;
import com.uniform.app.api.dto.ApiDtos.ClientStockResponse;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrderLine;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.client.ClientSection;
import com.uniform.app.domain.model.stock.ClientStock;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

@ApplicationScoped
public class ApiDtoMapper {

    public ClientResponse toClientResponse(Client client) {
        List<ClientSectionResponse> sectionResponses = client.sections() == null
                ? List.of()
                : client.sections().stream()
                        .map(this::toClientSectionResponse)
                        .toList();

        return new ClientResponse(
                client.id(),
                client.name(),
                client.clientType(),
                client.address(),
                client.logoStorageKey(),
                client.moq(),
                sectionResponses,
                client.totalCapacity(),
                client.active(),
                client.createdAt()
        );
    }

    public ClientSectionResponse toClientSectionResponse(ClientSection section) {
        return new ClientSectionResponse(
                section.id(),
                section.clientId(),
                section.name(),
                section.capacity()
        );
    }

    public B2cCatalogItemResponse toB2cCatalogItemResponse(CatalogItem item) {
        return new B2cCatalogItemResponse(
                item.id(),
                item.clientId(),
                item.referenceCode(),
                item.productType(),
                item.name(),
                item.garmentStyle(),
                item.colorReference(),
                item.availableSizes(),
                item.frontVisualStorageKey(),
                item.backVisualStorageKey(),
                item.visualPlacementNotes(),
                item.b2cUnitPrice()
        );
    }

    public AdminCatalogItemResponse toAdminCatalogItemResponse(CatalogItem item) {
        return new AdminCatalogItemResponse(
                item.id(),
                item.clientId(),
                item.referenceCode(),
                item.productType(),
                item.name(),
                item.garmentStyle(),
                item.colorReference(),
                item.supplierId(),
                item.supplierName(),
                item.availableSizes(),
                item.frontVisualStorageKey(),
                item.backVisualStorageKey(),
                item.visualPlacementNotes(),
                item.b2cUnitPrice(),
                item.b2bUnitCost()
        );
    }

    public ClientStockResponse toClientStockResponse(ClientStock stock) {
        return new ClientStockResponse(
                stock.id(),
                stock.clientId(),
                stock.catalogItemId(),
                stock.gender(),
                stock.size(),
                stock.availableQuantity(),
                stock.updatedAt()
        );
    }

    public B2cOrderLineResponse toB2cOrderLineResponse(B2cOrderLine line) {
        return new B2cOrderLineResponse(
                line.id(),
                line.b2cOrderId(),
                line.catalogItemId(),
                line.sectionId(),
                line.sectionName(),
                line.receiptNumber(),
                line.buyerFullName(),
                line.buyerPhone(),
                line.buyerEmail(),
                line.gender(),
                line.size(),
                line.quantity(),
                line.b2cUnitPrice(),
                line.lineCashAmount(),
                line.lineStatus(),
                line.createdAt()
        );
    }

    public B2cOrderSummaryResponse toB2cOrderSummaryResponse(B2cOrder order) {
        return new B2cOrderSummaryResponse(
                order.id(),
                order.clientId(),
                order.orderNumber(),
                order.status(),
                order.clientMoqSnapshot(),
                order.totalQuantity(),
                order.isMoqReached(),
                order.totalCashAmount(),
                order.createdAt()
        );
    }

    public B2cOrderDetailResponse toB2cOrderDetailResponse(B2cOrder order) {
        return new B2cOrderDetailResponse(
                order.id(),
                order.clientId(),
                order.orderNumber(),
                order.status(),
                order.clientMoqSnapshot(),
                order.totalQuantity(),
                order.isMoqReached(),
                order.totalCashAmount(),
                order.createdAt(),
                order.lines().stream().map(this::toB2cOrderLineResponse).toList()
        );
    }

    public B2bPurchaseOrderLineResponse toB2bPurchaseOrderLineResponse(B2bPurchaseOrderLine line) {
        return new B2bPurchaseOrderLineResponse(
                line.id(),
                line.catalogItemId(),
                line.gender(),
                line.size(),
                line.b2cDemandedQuantity(),
                line.finalQuantity(),
                line.b2bUnitCost(),
                line.lineTotalCost(),
                line.itemNameSnapshot(),
                line.garmentStyleSnapshot(),
                line.colorReferenceSnapshot(),
                line.frontVisualStorageSnapshot(),
                line.backVisualStorageSnapshot()
        );
    }

    public B2bPurchaseOrderResponse toB2bPurchaseOrderResponse(B2bPurchaseOrder po) {
        return new B2bPurchaseOrderResponse(
                po.id(),
                po.clientId(),
                po.b2cOrderId(),
                po.poNumber(),
                po.supplierName(),
                po.status(),
                po.totalB2bCost(),
                po.lines().stream().map(this::toB2bPurchaseOrderLineResponse).toList(),
                po.createdAt()
        );
    }
}
