package com.uniform.app.application.service;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog.AuditEntityType;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrderLine;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.client.ClientSection;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderLineStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.FinancialsAndQuantities.BuyerContact;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.domain.port.in.B2bPurchaseOrderUseCase;
import com.uniform.app.domain.port.in.B2cOrderUseCase;
import com.uniform.app.domain.port.in.ClientCatalogUseCase;
import com.uniform.app.domain.port.out.B2bPurchaseOrderRepositoryPort;
import com.uniform.app.domain.port.out.B2cOrderRepositoryPort;
import com.uniform.app.domain.port.out.CatalogItemRepositoryPort;
import com.uniform.app.domain.port.out.ClientRepositoryPort;
import com.uniform.app.domain.port.out.ClientStockRepositoryPort;
import com.uniform.app.domain.port.out.OrderStatusAuditLogPort;
import com.uniform.app.domain.port.out.PdfDocumentPort;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@ApplicationScoped
@Transactional
public class B2cB2bWorkflowService implements ClientCatalogUseCase, B2cOrderUseCase, B2bPurchaseOrderUseCase {

    private final ClientRepositoryPort clientRepositoryPort;
    private final CatalogItemRepositoryPort catalogItemRepositoryPort;
    private final ClientStockRepositoryPort clientStockRepositoryPort;
    private final B2cOrderRepositoryPort b2cOrderRepositoryPort;
    private final B2bPurchaseOrderRepositoryPort b2bPurchaseOrderRepositoryPort;
    private final PdfDocumentPort pdfDocumentPort;
    private final OrderStatusAuditLogPort auditLogPort;

    public B2cB2bWorkflowService(
            ClientRepositoryPort clientRepositoryPort,
            CatalogItemRepositoryPort catalogItemRepositoryPort,
            ClientStockRepositoryPort clientStockRepositoryPort,
            B2cOrderRepositoryPort b2cOrderRepositoryPort,
            B2bPurchaseOrderRepositoryPort b2bPurchaseOrderRepositoryPort,
            PdfDocumentPort pdfDocumentPort,
            OrderStatusAuditLogPort auditLogPort
    ) {
        this.clientRepositoryPort = clientRepositoryPort;
        this.catalogItemRepositoryPort = catalogItemRepositoryPort;
        this.clientStockRepositoryPort = clientStockRepositoryPort;
        this.b2cOrderRepositoryPort = b2cOrderRepositoryPort;
        this.b2bPurchaseOrderRepositoryPort = b2bPurchaseOrderRepositoryPort;
        this.pdfDocumentPort = pdfDocumentPort;
        this.auditLogPort = auditLogPort;
    }

    // =========================================================================
    // 1. Client & Catalog Management Use Cases
    // =========================================================================

    @Override
    public List<Client> listClients() {
        return clientRepositoryPort.findAll();
    }

    @Override
    public Client createClient(CreateClientCommand command) {
        if (command == null) {
            throw new DomainValidationException("CreateClientCommand must not be null.");
        }
        Instant now = Instant.now();
        Client client = Client.createNew(
                command.name(),
                command.clientType(),
                command.address(),
                command.logoStorageKey(),
                command.moq(),
                command.adminUserId(),
                now
        );
        if (command.sections() != null && !command.sections().isEmpty()) {
            client.replaceSections(toDomainSections(client.id(), command.sections()), now);
        }
        return clientRepositoryPort.save(client);
    }

    @Override
    public Client updateClient(UUID clientId, UpdateClientCommand command) {
        if (command == null) {
            throw new DomainValidationException("UpdateClientCommand must not be null.");
        }
        Instant now = Instant.now();
        Client client = requireClient(clientId);
        client.updateDetails(
                command.name(),
                command.clientType(),
                command.address(),
                command.logoStorageKey(),
                command.moq(),
                now
        );
        if (command.sections() != null) {
            client.replaceSections(toDomainSections(clientId, command.sections()), now);
        }
        return clientRepositoryPort.save(client);
    }

    @Override
    public Client updateClientMoq(UUID clientId, int newMoq, UUID adminUserId) {
        Client client = requireClient(clientId);
        client.updateMoq(newMoq, Instant.now());
        return clientRepositoryPort.save(client);
    }

    @Override
    public Client updateClientSections(UUID clientId, List<ClientSectionInput> sections, UUID adminUserId) {
        Client client = requireClient(clientId);
        List<ClientSection> domainSections = toDomainSections(clientId, sections != null ? sections : List.of());
        client.replaceSections(domainSections, Instant.now());
        return clientRepositoryPort.save(client);
    }

    private List<ClientSection> toDomainSections(UUID clientId, List<ClientSectionInput> inputs) {
        if (inputs == null || inputs.isEmpty()) {
            return List.of();
        }
        return inputs.stream()
                .map(input -> new ClientSection(
                        input.id() != null ? input.id() : UUID.randomUUID(),
                        clientId,
                        input.name(),
                        input.capacity()
                ))
                .toList();
    }

    @Override
    public void deleteClient(UUID clientId, UUID adminUserId) {
        Client client = requireClient(clientId);
        client.deactivate(Instant.now());
        clientRepositoryPort.save(client);
    }

    @Override
    public CatalogItem createCatalogItem(UUID clientId, CreateCatalogItemCommand command) {
        requireClient(clientId);
        if (command == null) {
            throw new DomainValidationException("CreateCatalogItemCommand must not be null.");
        }
        CatalogItem item = CatalogItem.createNew(
                clientId,
                command.referenceCode(),
                command.productType(),
                command.name(),
                command.garmentStyle(),
                command.colorReference(),
                command.supplierId(),
                command.supplierName(),
                command.availableSizes(),
                command.frontVisualStorageKey(),
                command.backVisualStorageKey(),
                command.visualPlacementNotes(),
                command.b2cUnitPrice(),
                command.b2bUnitCost(),
                command.adminUserId(),
                Instant.now()
        );
        return catalogItemRepositoryPort.save(clientId, item);
    }

    @Override
    public CatalogItem updateCatalogItem(UUID clientId, UUID catalogItemId, UpdateCatalogItemCommand command) {
        requireClient(clientId);
        if (command == null) {
            throw new DomainValidationException("UpdateCatalogItemCommand must not be null.");
        }
        CatalogItem existing = catalogItemRepositoryPort.findByClientIdAndId(clientId, catalogItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CatalogItem %s not found for client %s.".formatted(catalogItemId, clientId)
                ));
        existing.assertBelongsToClient(clientId);
        CatalogItem updated = existing.withUpdatedSpecifications(
                command.referenceCode(),
                command.productType(),
                command.name(),
                command.garmentStyle(),
                command.colorReference(),
                command.supplierId(),
                command.supplierName(),
                command.availableSizes(),
                command.frontVisualStorageKey(),
                command.backVisualStorageKey(),
                command.visualPlacementNotes(),
                command.b2cUnitPrice(),
                command.b2bUnitCost(),
                Instant.now()
        );
        return catalogItemRepositoryPort.save(clientId, updated);
    }

    @Override
    public void deleteCatalogItem(UUID clientId, UUID catalogItemId, UUID adminUserId) {
        requireClient(clientId);
        CatalogItem existing = catalogItemRepositoryPort.findByClientIdAndId(clientId, catalogItemId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CatalogItem %s not found for client %s.".formatted(catalogItemId, clientId)
                ));
        existing.assertBelongsToClient(clientId);
        catalogItemRepositoryPort.save(clientId, existing.deactivated(Instant.now()));
    }

    @Override
    public List<CatalogItem> listClientCatalogItems(UUID clientId) {
        requireClient(clientId);
        return catalogItemRepositoryPort.findAllByClientId(clientId);
    }

    @Override
    public byte[] generateClientCatalogFlyerPdf(UUID clientId) {
        Client client = requireClient(clientId);
        List<CatalogItem> items = catalogItemRepositoryPort.findAllByClientId(clientId);
        return pdfDocumentPort.generateClientCatalogFlyerPdf(clientId, client, items);
    }

    @Override
    public List<ClientStock> listClientStocks(UUID clientId) {
        requireClient(clientId);
        return clientStockRepositoryPort.findAllByClientId(clientId);
    }

    @Override
    public ClientStock upsertClientStock(UUID clientId, UpsertClientStockCommand command) {
        Client client = requireClient(clientId);
        if (command == null) {
            throw new DomainValidationException("UpsertClientStockCommand must not be null.");
        }
        client.assertVariantAllowedForClientType(command.gender(), command.size());
        CatalogItem catalogItem = catalogItemRepositoryPort
                .findByClientIdAndId(clientId, command.catalogItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CatalogItem %s not found for client %s.".formatted(command.catalogItemId(), clientId)
                ));
        catalogItem.assertBelongsToClient(clientId);

        Instant now = Instant.now();
        GarmentVariant variant = new GarmentVariant(command.catalogItemId(), command.gender(), command.size());
        ClientStock stock = clientStockRepositoryPort
                .findByClientIdAndVariant(clientId, variant)
                .orElseGet(() -> ClientStock.initializeEmpty(
                        clientId,
                        command.catalogItemId(),
                        command.gender(),
                        command.size(),
                        now
                ));

        stock.assertIsolationAndVariant(clientId, variant);
        stock.updateAvailableQuantity(command.availableQuantity(), now);
        return clientStockRepositoryPort.save(clientId, stock);
    }

    // =========================================================================
    // 2. B2C Counter Order Use Cases
    // =========================================================================

    @Override
    public List<B2cOrder> listB2cOrders(UUID clientId) {
        requireClient(clientId);
        return b2cOrderRepositoryPort.findAllByClientId(clientId);
    }

    @Override
    public B2cOrder createB2cOrder(UUID clientId, UUID operatorUserId) {
        Client client = requireClient(clientId);
        Instant now = Instant.now();
        String orderNumber = "B2C-" + shortCode();

        B2cOrder order = B2cOrder.initializeInProgress(
                client.id(),
                orderNumber,
                client.moq(),
                operatorUserId,
                now
        );
        B2cOrder saved = b2cOrderRepositoryPort.save(clientId, order);

        recordAudit(
                clientId,
                AuditEntityType.B2C_ORDER,
                saved.id(),
                null,
                B2cOrderStatus.IN_PROGRESS.name(),
                operatorUserId,
                now,
                "Initialized B2C order " + saved.orderNumber()
        );
        return saved;
    }

    @Override
    public B2cOrder getB2cOrderById(UUID clientId, UUID orderId) {
        return requireB2cOrder(clientId, orderId);
    }

    @Override
    public B2cOrderLine addB2cOrderLine(UUID clientId, UUID orderId, AddB2cOrderLineCommand command) {
        if (command == null) {
            throw new DomainValidationException("AddB2cOrderLineCommand must not be null.");
        }
        Client client = requireClient(clientId);
        client.assertVariantAllowedForClientType(command.gender(), command.size());
        B2cOrder order = requireB2cOrder(clientId, orderId);
        CatalogItem catalogItem = catalogItemRepositoryPort
                .findByClientIdAndId(clientId, command.catalogItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "CatalogItem %s not found for client %s.".formatted(command.catalogItemId(), clientId)
                ));

        Instant now = Instant.now();
        String receiptNumber = "REC-" + shortCode();
        String receiptPdfStorageKey = "receipts/%s/%s.pdf".formatted(clientId, receiptNumber);

        BuyerContact buyerContact = new BuyerContact(
                command.buyerFullName(),
                command.buyerPhone(),
                command.buyerEmail()
        );

        UUID resolvedSectionId = null;
        String resolvedSectionName = null;
        if (command.sectionId() != null) {
            ClientSection matchedSection = client.sections().stream()
                    .filter(s -> s.id().equals(command.sectionId()))
                    .findFirst()
                    .orElseThrow(() -> new DomainValidationException(
                            "La section sélectionnée n'appartient pas à ce client."
                    ));
            resolvedSectionId = matchedSection.id();
            resolvedSectionName = matchedSection.name();
        } else if (command.sectionName() != null && !command.sectionName().isBlank()) {
            String trimmedName = command.sectionName().trim();
            ClientSection matchedByName = client.sections().stream()
                    .filter(s -> s.name().equalsIgnoreCase(trimmedName))
                    .findFirst()
                    .orElse(null);
            if (matchedByName != null) {
                resolvedSectionId = matchedByName.id();
                resolvedSectionName = matchedByName.name();
            } else {
                resolvedSectionName = trimmedName;
            }
        }

        B2cOrderLine line = order.addCashOrderLine(
                catalogItem,
                resolvedSectionId,
                resolvedSectionName,
                command.gender(),
                command.size(),
                command.quantity(),
                buyerContact,
                command.cashPaymentConfirmed(),
                command.irreversibilityAcknowledged(),
                receiptNumber,
                receiptPdfStorageKey,
                command.operatorUserId(),
                now
        );

        pdfDocumentPort.generateAndStoreB2cCashReceiptPdf(clientId, client, order, line, catalogItem);
        b2cOrderRepositoryPort.save(clientId, order);

        recordAudit(
                clientId,
                AuditEntityType.B2C_ORDER_LINE,
                line.id(),
                null,
                B2cOrderLineStatus.PENDING_PICKUP.name(),
                command.operatorUserId(),
                now,
                "Cash payment receipt %s generated (%s EUR)".formatted(receiptNumber, line.lineCashAmount())
        );
        return line;
    }

    @Override
    public byte[] downloadB2cLineReceiptPdf(UUID clientId, UUID orderId, UUID lineId) {
        B2cOrder order = requireB2cOrder(clientId, orderId);
        B2cOrderLine line = order.lines().stream()
                .filter(l -> l.id().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2C order line %s not found in order %s.".formatted(lineId, orderId)
                ));
        return pdfDocumentPort.loadB2cCashReceiptPdf(clientId, line.receiptPdfStorageKey());
    }

    @Override
    public byte[] downloadB2cOrderPackingListPdf(UUID clientId, UUID orderId) {
        Client client = requireClient(clientId);
        B2cOrder order = requireB2cOrder(clientId, orderId);
        Set<UUID> catalogItemIds = order.lines().stream()
                .map(B2cOrderLine::catalogItemId)
                .collect(Collectors.toSet());
        Map<UUID, CatalogItem> catalogItemsById = catalogItemIds.isEmpty()
                ? Map.of()
                : catalogItemRepositoryPort.findByClientIdAndIds(clientId, catalogItemIds);
        return pdfDocumentPort.generateB2cOrderPackingListPdf(clientId, client, order, catalogItemsById);
    }

    @Override
    public B2cOrder moveB2cOrderToProduction(UUID clientId, UUID orderId, UUID adminUserId) {
        Client client = requireClient(clientId);
        B2cOrder order = requireB2cOrder(clientId, orderId);
        Set<UUID> catalogItemIds = order.lines().stream()
                .map(B2cOrderLine::catalogItemId)
                .collect(Collectors.toSet());

        Map<UUID, CatalogItem> catalogItemsById = catalogItemIds.isEmpty()
                ? Map.of()
                : catalogItemRepositoryPort.findByClientIdAndIds(clientId, catalogItemIds);

        Instant now = Instant.now();
        String basePoNumber = "PO-" + shortCode();

        List<B2bPurchaseOrder> draftPos = order.moveToProductionBySupplier(
                basePoNumber,
                catalogItemsById,
                adminUserId,
                now
        );

        B2cOrder savedOrder = b2cOrderRepositoryPort.save(clientId, order);

        for (B2bPurchaseOrder draftPo : draftPos) {
            String poPdfKey = pdfDocumentPort.generateAndStoreB2bPurchaseOrderPdf(clientId, client, draftPo);
            draftPo.updatePoPdfStorageKey(poPdfKey, now);
            B2bPurchaseOrder savedPo = b2bPurchaseOrderRepositoryPort.save(clientId, draftPo);

            recordAudit(
                    clientId,
                    AuditEntityType.B2B_PURCHASE_ORDER,
                    savedPo.id(),
                    null,
                    B2bOrderStatus.DRAFT.name(),
                    adminUserId,
                    now,
                    "Created DRAFT B2B purchase order " + savedPo.poNumber()
                            + " for supplier " + savedPo.supplierName()
            );
        }

        recordAudit(
                clientId,
                AuditEntityType.B2C_ORDER,
                savedOrder.id(),
                B2cOrderStatus.IN_PROGRESS.name(),
                B2cOrderStatus.IN_PRODUCTION.name(),
                adminUserId,
                now,
                "Moved B2C order to IN_PRODUCTION and spawned " + draftPos.size() + " supplier PO(s)"
        );

        return savedOrder;
    }

    @Override
    public B2cOrder moveB2cOrderToDelivery(UUID clientId, UUID orderId, UUID adminUserId) {
        B2cOrder order = requireB2cOrder(clientId, orderId);
        List<B2bPurchaseOrder> associatedPos = b2bPurchaseOrderRepositoryPort
                .findAllByClientIdAndB2cOrderId(clientId, orderId);
        if (associatedPos.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No B2B Purchase Order found for B2C order %s (client %s).".formatted(orderId, clientId)
            );
        }

        B2bOrderStatus effectivePoStatus = associatedPos.stream()
                .map(B2bPurchaseOrder::status)
                .filter(status -> status != B2bOrderStatus.RECEIVED)
                .findFirst()
                .orElse(B2bOrderStatus.RECEIVED);

        Instant now = Instant.now();
        order.moveToDelivery(effectivePoStatus, now);
        B2cOrder savedOrder = b2cOrderRepositoryPort.save(clientId, order);

        recordAudit(
                clientId,
                AuditEntityType.B2C_ORDER,
                savedOrder.id(),
                B2cOrderStatus.IN_PRODUCTION.name(),
                B2cOrderStatus.IN_DELIVERY.name(),
                adminUserId,
                now,
                "Moved B2C order to IN_DELIVERY after all " + associatedPos.size() + " supplier PO(s) received"
        );
        return savedOrder;
    }

    @Override
    public B2cOrder markB2cOrderLineDelivered(UUID clientId, UUID orderId, UUID lineId, UUID operatorUserId) {
        B2cOrder order = requireB2cOrder(clientId, orderId);
        B2cOrderLine targetLine = order.lines().stream()
                .filter(l -> l.id().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2C order line %s not found in order %s.".formatted(lineId, orderId)
                ));

        Instant now = Instant.now();
        ClientStock stock = clientStockRepositoryPort
                .findByClientIdAndVariant(clientId, targetLine.variant())
                .orElseGet(() -> ClientStock.initializeEmpty(
                        clientId,
                        targetLine.catalogItemId(),
                        targetLine.gender(),
                        targetLine.size(),
                        now
                ));

        B2cOrderStatus statusBefore = order.status();
        order.markLineDelivered(lineId, stock, operatorUserId, now);

        clientStockRepositoryPort.save(clientId, stock);
        B2cOrder savedOrder = b2cOrderRepositoryPort.save(clientId, order);

        recordAudit(
                clientId,
                AuditEntityType.B2C_ORDER_LINE,
                lineId,
                B2cOrderLineStatus.PENDING_PICKUP.name(),
                B2cOrderLineStatus.DELIVERED.name(),
                operatorUserId,
                now,
                "Delivered line %s to buyer %s".formatted(targetLine.receiptNumber(), targetLine.buyerFullName())
        );

        if (statusBefore != B2cOrderStatus.DELIVERED && savedOrder.status() == B2cOrderStatus.DELIVERED) {
            recordAudit(
                    clientId,
                    AuditEntityType.B2C_ORDER,
                    savedOrder.id(),
                    B2cOrderStatus.IN_DELIVERY.name(),
                    B2cOrderStatus.DELIVERED.name(),
                    operatorUserId,
                    now,
                    "100% of B2C order lines delivered — automatic transition to DELIVERED"
            );
        }

        return savedOrder;
    }

    // =========================================================================
    // 3. B2B Supplier Purchase Order Use Cases
    // =========================================================================

    @Override
    public List<B2bPurchaseOrder> listB2bPurchaseOrders(UUID clientId) {
        requireClient(clientId);
        return b2bPurchaseOrderRepositoryPort.findAllByClientId(clientId);
    }

    @Override
    public B2bPurchaseOrder updateB2bLineFinalQuantity(
            UUID clientId,
            UUID b2bOrderId,
            UUID b2bLineId,
            int finalQuantity,
            UUID adminUserId
    ) {
        Client client = requireClient(clientId);
        B2bPurchaseOrder po = requireB2bPurchaseOrder(clientId, b2bOrderId);
        Instant now = Instant.now();
        po.updateLineFinalQuantity(b2bLineId, finalQuantity, now);
        String poPdfKey = pdfDocumentPort.generateAndStoreB2bPurchaseOrderPdf(clientId, client, po);
        po.updatePoPdfStorageKey(poPdfKey, now);
        return b2bPurchaseOrderRepositoryPort.save(clientId, po);
    }

    @Override
    public B2bPurchaseOrder confirmB2bPurchaseOrder(UUID clientId, UUID b2bOrderId, UUID adminUserId) {
        Client client = requireClient(clientId);
        B2bPurchaseOrder po = requireB2bPurchaseOrder(clientId, b2bOrderId);

        Instant now = Instant.now();
        String poPdfKey = pdfDocumentPort.generateAndStoreB2bPurchaseOrderPdf(clientId, client, po);
        po.confirmOrder(adminUserId, poPdfKey, now);

        B2bPurchaseOrder savedPo = b2bPurchaseOrderRepositoryPort.save(clientId, po);
        recordAudit(
                clientId,
                AuditEntityType.B2B_PURCHASE_ORDER,
                savedPo.id(),
                B2bOrderStatus.DRAFT.name(),
                B2bOrderStatus.ORDERED.name(),
                adminUserId,
                now,
                "Confirmed B2B PO %s (frozen cost: %s EUR)".formatted(savedPo.poNumber(), savedPo.totalB2bCost())
        );
        return savedPo;
    }

    @Override
    public B2bPurchaseOrder receiveB2bPurchaseOrderStock(UUID clientId, UUID b2bOrderId, UUID adminUserId) {
        B2bPurchaseOrder po = requireB2bPurchaseOrder(clientId, b2bOrderId);
        Set<GarmentVariant> variants = po.lines().stream()
                .map(B2bPurchaseOrderLine::variant)
                .collect(Collectors.toSet());

        Map<GarmentVariant, ClientStock> stocksByVariant =
                clientStockRepositoryPort.findOrCreateByClientIdAndVariants(clientId, variants);

        Instant now = Instant.now();
        po.receiveStock(stocksByVariant, adminUserId, now);

        clientStockRepositoryPort.saveAll(clientId, stocksByVariant.values());
        B2bPurchaseOrder savedPo = b2bPurchaseOrderRepositoryPort.save(clientId, po);

        recordAudit(
                clientId,
                AuditEntityType.B2B_PURCHASE_ORDER,
                savedPo.id(),
                B2bOrderStatus.ORDERED.name(),
                B2bOrderStatus.RECEIVED.name(),
                adminUserId,
                now,
                "Received supplier stock for B2B PO " + savedPo.poNumber()
        );
        return savedPo;
    }

    @Override
    public byte[] downloadB2bPurchaseOrderPdf(UUID clientId, UUID b2bOrderId) {
        Client client = requireClient(clientId);
        B2bPurchaseOrder po = requireB2bPurchaseOrder(clientId, b2bOrderId);
        String key = po.poPdfStorageKey();
        if (key == null || key.isBlank()) {
            key = pdfDocumentPort.generateAndStoreB2bPurchaseOrderPdf(clientId, client, po);
            po.updatePoPdfStorageKey(key, Instant.now());
            b2bPurchaseOrderRepositoryPort.save(clientId, po);
        }
        return pdfDocumentPort.loadB2bPurchaseOrderPdf(clientId, key);
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    private Client requireClient(UUID clientId) {
        if (clientId == null) {
            throw new DomainValidationException("clientId must not be null.");
        }
        return clientRepositoryPort.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client %s not found.".formatted(clientId)));
    }

    private B2cOrder requireB2cOrder(UUID clientId, UUID orderId) {
        if (clientId == null || orderId == null) {
            throw new DomainValidationException("clientId and orderId must not be null.");
        }
        return b2cOrderRepositoryPort.findByClientIdAndId(clientId, orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2C order %s not found for client %s.".formatted(orderId, clientId)
                ));
    }

    private B2bPurchaseOrder requireB2bPurchaseOrder(UUID clientId, UUID b2bOrderId) {
        if (clientId == null || b2bOrderId == null) {
            throw new DomainValidationException("clientId and b2bOrderId must not be null.");
        }
        return b2bPurchaseOrderRepositoryPort.findByClientIdAndId(clientId, b2bOrderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "B2B purchase order %s not found for client %s.".formatted(b2bOrderId, clientId)
                ));
    }

    private void recordAudit(
            UUID clientId,
            AuditEntityType entityType,
            UUID entityId,
            String previousStatus,
            String newStatus,
            UUID userId,
            Instant now,
            String details
    ) {
        auditLogPort.recordStatusTransition(
                clientId,
                new OrderStatusAuditLog(
                        UUID.randomUUID(),
                        clientId,
                        entityType,
                        entityId,
                        previousStatus,
                        newStatus,
                        userId,
                        now,
                        details
                )
        );
    }

    private static String shortCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
