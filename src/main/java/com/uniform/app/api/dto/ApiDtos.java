package com.uniform.app.api.dto;

import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderLineStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.enums.ClientType;
import com.uniform.app.domain.model.enums.ErrorCode;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record ClientSectionRequest(
            UUID id,
            @NotBlank String name,
            @NotNull @Min(1) Integer capacity
    ) {
    }

    public record UpdateClientSectionsRequest(
            @NotNull List<@Valid ClientSectionRequest> sections
    ) {
    }

    public record ClientSectionResponse(
            UUID id,
            UUID clientId,
            String name,
            int capacity
    ) {
    }

    public record CreateClientRequest(
            @NotBlank String name,
            ClientType clientType,
            @NotBlank String address,
            String logoStorageKey,
            Integer moq,
            List<@Valid ClientSectionRequest> sections
    ) {
    }

    public record UpdateMoqRequest(
            @NotNull @Min(1) Integer moq
    ) {
    }

    public record ClientResponse(
            UUID id,
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            List<ClientSectionResponse> sections,
            int totalCapacity,
            boolean active,
            Instant createdAt
    ) {
    }

    public record CreateCatalogItemRequest(
            @NotBlank String referenceCode,
            String productType,
            @NotBlank String name,
            String garmentStyle,
            @NotBlank String colorReference,
            UUID supplierId,
            String supplierName,
            String availableSizes,
            @NotBlank String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            @NotNull @DecimalMin("0.00") BigDecimal b2cUnitPrice,
            @NotNull @DecimalMin("0.00") BigDecimal b2bUnitCost
    ) {
    }

    public record B2cCatalogItemResponse(
            UUID id,
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice
    ) {
    }

    public record AdminCatalogItemResponse(
            UUID id,
            UUID clientId,
            String referenceCode,
            String productType,
            String name,
            String garmentStyle,
            String colorReference,
            UUID supplierId,
            String supplierName,
            String availableSizes,
            String frontVisualStorageKey,
            String backVisualStorageKey,
            String visualPlacementNotes,
            BigDecimal b2cUnitPrice,
            BigDecimal b2bUnitCost
    ) {
    }

    public record ClientStockResponse(
            UUID id,
            UUID clientId,
            UUID catalogItemId,
            Gender gender,
            Size size,
            int availableQuantity,
            Instant updatedAt
    ) {
    }

    public record GlobalStockItemResponse(
            UUID stockId,
            UUID clientId,
            String clientName,
            ClientType clientType,
            UUID catalogItemId,
            String referenceCode,
            String productType,
            String itemName,
            String colorReference,
            UUID supplierId,
            String supplierName,
            Gender gender,
            Size size,
            int availableQuantity,
            Instant updatedAt
    ) {
    }

    public record UpsertClientStockRequest(
            @NotNull UUID catalogItemId,
            @NotNull Gender gender,
            @NotNull Size size,
            @NotNull @Min(0) Integer availableQuantity
    ) {
    }

    public record AddB2cOrderLineRequest(
            @NotNull UUID catalogItemId,
            UUID sectionId,
            String sectionName,
            @NotBlank String buyerFullName,
            String buyerPhone,
            String buyerEmail,
            @NotNull Gender gender,
            @NotNull Size size,
            @NotNull @Min(1) Integer quantity,
            @NotNull Boolean cashPaymentConfirmed,
            @NotNull Boolean irreversibilityAcknowledged
    ) {
    }

    public record B2cOrderLineResponse(
            UUID id,
            UUID b2cOrderId,
            UUID catalogItemId,
            UUID sectionId,
            String sectionName,
            String receiptNumber,
            String buyerFullName,
            String buyerPhone,
            String buyerEmail,
            Gender gender,
            Size size,
            int quantity,
            BigDecimal b2cUnitPrice,
            BigDecimal lineCashAmount,
            B2cOrderLineStatus lineStatus,
            Instant createdAt
    ) {
    }

    public record B2cOrderSummaryResponse(
            UUID id,
            UUID clientId,
            String orderNumber,
            B2cOrderStatus status,
            int clientMoqSnapshot,
            int totalQuantity,
            boolean moqReached,
            BigDecimal totalCashAmount,
            Instant createdAt
    ) {
    }

    public record B2cOrderDetailResponse(
            UUID id,
            UUID clientId,
            String orderNumber,
            B2cOrderStatus status,
            int clientMoqSnapshot,
            int totalQuantity,
            boolean moqReached,
            BigDecimal totalCashAmount,
            Instant createdAt,
            List<B2cOrderLineResponse> lines
    ) {
    }

    public record UpdateB2bFinalQuantityRequest(
            @NotNull @Min(0) Integer finalQuantity
    ) {
    }

    public record B2bPurchaseOrderLineResponse(
            UUID id,
            UUID catalogItemId,
            Gender gender,
            Size size,
            int b2cDemandedQuantity,
            int finalQuantity,
            BigDecimal b2bUnitCost,
            BigDecimal lineTotalCost,
            String itemNameSnapshot,
            String garmentStyleSnapshot,
            String colorReferenceSnapshot,
            String frontVisualStorageSnapshot,
            String backVisualStorageSnapshot
    ) {
    }

    public record B2bPurchaseOrderResponse(
            UUID id,
            UUID clientId,
            UUID b2cOrderId,
            String poNumber,
            String supplierName,
            B2bOrderStatus status,
            BigDecimal totalB2bCost,
            List<B2bPurchaseOrderLineResponse> lines,
            Instant createdAt
    ) {
    }

    public record ProblemDetails(
            URI type,
            String title,
            int status,
            String detail,
            String instance,
            ErrorCode errorCode,
            Instant timestamp
    ) {
    }
}
