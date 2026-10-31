package com.uniform.app.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.uniform.app.application.service.B2cB2bWorkflowService;
import com.uniform.app.domain.exception.B2bStockNotReceivedException;
import com.uniform.app.domain.exception.MoqNotReachedException;
import com.uniform.app.domain.model.audit.OrderStatusAuditLog;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.B2cOrderStatus;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.model.vo.GarmentVariant;
import com.uniform.app.domain.port.in.B2cOrderUseCase.AddB2cOrderLineCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.CreateCatalogItemCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.CreateClientCommand;
import com.uniform.app.domain.port.out.B2bPurchaseOrderRepositoryPort;
import com.uniform.app.domain.port.out.B2cOrderRepositoryPort;
import com.uniform.app.domain.port.out.CatalogItemRepositoryPort;
import com.uniform.app.domain.port.out.ClientRepositoryPort;
import com.uniform.app.domain.port.out.ClientStockRepositoryPort;
import com.uniform.app.domain.port.out.OrderStatusAuditLogPort;
import com.uniform.app.infrastructure.pdf.OpenPdfDocumentAdapter;
import com.uniform.app.infrastructure.storage.LocalDocumentStorageService;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class B2cB2bWorkflowApplicationTest {

    @TempDir
    Path tempDir;

    private B2cB2bWorkflowService workflowService;
    private List<OrderStatusAuditLog> recordedAuditLogs;

    @BeforeEach
    void setUp() {
        recordedAuditLogs = new ArrayList<>();
        Map<UUID, Client> clients = new LinkedHashMap<>();
        Map<UUID, CatalogItem> catalogItems = new LinkedHashMap<>();
        Map<String, ClientStock> stocks = new LinkedHashMap<>();
        Map<UUID, B2cOrder> b2cOrders = new LinkedHashMap<>();
        Map<UUID, B2bPurchaseOrder> b2bOrders = new LinkedHashMap<>();

        ClientRepositoryPort clientRepo = new ClientRepositoryPort() {
            @Override
            public Client save(Client client) {
                clients.put(client.id(), client);
                return client;
            }

            @Override
            public Optional<Client> findById(UUID clientId) {
                return Optional.ofNullable(clients.get(clientId));
            }

            @Override
            public List<Client> findAll() {
                return List.copyOf(clients.values());
            }
        };

        CatalogItemRepositoryPort catalogRepo = new CatalogItemRepositoryPort() {
            @Override
            public CatalogItem save(UUID clientId, CatalogItem catalogItem) {
                catalogItem.assertBelongsToClient(clientId);
                catalogItems.put(catalogItem.id(), catalogItem);
                return catalogItem;
            }

            @Override
            public Optional<CatalogItem> findByClientIdAndId(UUID clientId, UUID catalogItemId) {
                return Optional.ofNullable(catalogItems.get(catalogItemId))
                        .filter(i -> i.clientId().equals(clientId));
            }

            @Override
            public List<CatalogItem> findAllByClientId(UUID clientId) {
                return catalogItems.values().stream()
                        .filter(i -> i.clientId().equals(clientId))
                        .toList();
            }

            @Override
            public Map<UUID, CatalogItem> findByClientIdAndIds(UUID clientId, Collection<UUID> catalogItemIds) {
                return catalogItems.values().stream()
                        .filter(i -> i.clientId().equals(clientId) && catalogItemIds.contains(i.id()))
                        .collect(Collectors.toMap(CatalogItem::id, Function.identity()));
            }
        };

        ClientStockRepositoryPort stockRepo = new ClientStockRepositoryPort() {
            private static String key(UUID clientId, GarmentVariant v) {
                return clientId + ":" + v.catalogItemId() + ":" + v.gender() + ":" + v.size();
            }

            @Override
            public ClientStock save(UUID clientId, ClientStock clientStock) {
                stocks.put(key(clientId, clientStock.variant()), clientStock);
                return clientStock;
            }

            @Override
            public void saveAll(UUID clientId, Collection<ClientStock> clientStocks) {
                clientStocks.forEach(s -> save(clientId, s));
            }

            @Override
            public Optional<ClientStock> findByClientIdAndVariant(UUID clientId, GarmentVariant variant) {
                return Optional.ofNullable(stocks.get(key(clientId, variant)));
            }

            @Override
            public Map<GarmentVariant, ClientStock> findOrCreateByClientIdAndVariants(
                    UUID clientId,
                    Collection<GarmentVariant> variants
            ) {
                Map<GarmentVariant, ClientStock> res = new LinkedHashMap<>();
                for (GarmentVariant v : variants) {
                    ClientStock s = findByClientIdAndVariant(clientId, v)
                            .orElseGet(() -> ClientStock.initializeEmpty(clientId, v.catalogItemId(), v.gender(), v.size(), Instant.now()));
                    res.put(v, s);
                }
                return res;
            }

            @Override
            public List<ClientStock> findAllByClientId(UUID clientId) {
                return stocks.values().stream().filter(s -> s.clientId().equals(clientId)).toList();
            }
        };

        B2cOrderRepositoryPort b2cRepo = new B2cOrderRepositoryPort() {
            @Override
            public B2cOrder save(UUID clientId, B2cOrder b2cOrder) {
                b2cOrders.put(b2cOrder.id(), b2cOrder);
                return b2cOrder;
            }

            @Override
            public Optional<B2cOrder> findByClientIdAndId(UUID clientId, UUID orderId) {
                return Optional.ofNullable(b2cOrders.get(orderId)).filter(o -> o.clientId().equals(clientId));
            }

            @Override
            public List<B2cOrder> findAllByClientId(UUID clientId) {
                return b2cOrders.values().stream().filter(o -> o.clientId().equals(clientId)).toList();
            }
        };

        B2bPurchaseOrderRepositoryPort b2bRepo = new B2bPurchaseOrderRepositoryPort() {
            @Override
            public B2bPurchaseOrder save(UUID clientId, B2bPurchaseOrder b2bPurchaseOrder) {
                b2bOrders.put(b2bPurchaseOrder.id(), b2bPurchaseOrder);
                return b2bPurchaseOrder;
            }

            @Override
            public Optional<B2bPurchaseOrder> findByClientIdAndId(UUID clientId, UUID b2bOrderId) {
                return Optional.ofNullable(b2bOrders.get(b2bOrderId)).filter(p -> p.clientId().equals(clientId));
            }

            @Override
            public Optional<B2bPurchaseOrder> findByClientIdAndB2cOrderId(UUID clientId, UUID b2cOrderId) {
                return b2bOrders.values().stream()
                        .filter(p -> p.clientId().equals(clientId) && p.b2cOrderId().equals(b2cOrderId))
                        .findFirst();
            }

            @Override
            public List<B2bPurchaseOrder> findAllByClientId(UUID clientId) {
                return b2bOrders.values().stream().filter(p -> p.clientId().equals(clientId)).toList();
            }
        };

        OrderStatusAuditLogPort auditPort = (clientId, log) -> recordedAuditLogs.add(log);
        OpenPdfDocumentAdapter pdfAdapter = new OpenPdfDocumentAdapter(new LocalDocumentStorageService(tempDir.toString()));

        workflowService = new B2cB2bWorkflowService(
                clientRepo, catalogRepo, stockRepo, b2cRepo, b2bRepo, pdfAdapter, auditPort
        );
    }

    @Test
    @DisplayName("2.1 - Should orchestrate complete B2C -> B2B -> Stock -> B2C workflow and audit logs")
    void shouldOrchestrateCompleteWorkflow() {
        UUID adminId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();

        Client client = workflowService.createClient(new CreateClientCommand(
                "École Alsacienne",
                "109 Rue Notre-Dame-des-Champs, 75006 Paris",
                null,
                4,
                adminId
        ));

        CatalogItem item = workflowService.createCatalogItem(client.id(), new CreateCatalogItemCommand(
                "CARD-01",
                "Cardigan Uniforme",
                "Maille fine",
                "Marine",
                "visuals/card-front.png",
                null,
                null,
                new BigDecimal("35.00"),
                new BigDecimal("16.00"),
                adminId
        ));

        B2cOrder order = workflowService.createB2cOrder(client.id(), operatorId);

        B2cOrderLine line1 = workflowService.addB2cOrderLine(client.id(), order.id(), new AddB2cOrderLineCommand(
                item.id(), "Marc Levy", "0611223344", "marc@example.com",
                Gender.KIDS, Size.AGE_10, 2, true, true, operatorId
        ));

        assertThat(workflowService.downloadB2cLineReceiptPdf(client.id(), order.id(), line1.id())).isNotEmpty();

        assertThatThrownBy(() -> workflowService.moveB2cOrderToProduction(client.id(), order.id(), adminId))
                .isInstanceOf(MoqNotReachedException.class);

        B2cOrderLine line2 = workflowService.addB2cOrderLine(client.id(), order.id(), new AddB2cOrderLineCommand(
                item.id(), "Julie Gayet", "0655667788", "julie@example.com",
                Gender.WOMEN, Size.M, 2, true, true, operatorId
        ));

        B2cOrder inProd = workflowService.moveB2cOrderToProduction(client.id(), order.id(), adminId);
        assertThat(inProd.status()).isEqualTo(B2cOrderStatus.IN_PRODUCTION);

        assertThatThrownBy(() -> workflowService.moveB2cOrderToDelivery(client.id(), order.id(), adminId))
                .isInstanceOf(B2bStockNotReceivedException.class);

        B2bPurchaseOrder po = workflowService.listB2bPurchaseOrders(client.id()).getFirst();
        assertThat(po.status()).isEqualTo(B2bOrderStatus.DRAFT);

        workflowService.updateB2bLineFinalQuantity(client.id(), po.id(), po.lines().getFirst().id(), 3, adminId);
        B2bPurchaseOrder orderedPo = workflowService.confirmB2bPurchaseOrder(client.id(), po.id(), adminId);
        assertThat(orderedPo.status()).isEqualTo(B2bOrderStatus.ORDERED);
        assertThat(orderedPo.totalB2bCost()).isEqualByComparingTo("80.00");

        B2bPurchaseOrder receivedPo = workflowService.receiveB2bPurchaseOrderStock(client.id(), po.id(), adminId);
        assertThat(receivedPo.status()).isEqualTo(B2bOrderStatus.RECEIVED);

        B2cOrder inDelivery = workflowService.moveB2cOrderToDelivery(client.id(), order.id(), adminId);
        assertThat(inDelivery.status()).isEqualTo(B2cOrderStatus.IN_DELIVERY);

        B2cOrder afterFirstPickup = workflowService.markB2cOrderLineDelivered(client.id(), order.id(), line1.id(), operatorId);
        assertThat(afterFirstPickup.status()).isEqualTo(B2cOrderStatus.IN_DELIVERY);

        B2cOrder afterSecondPickup = workflowService.markB2cOrderLineDelivered(client.id(), order.id(), line2.id(), operatorId);
        assertThat(afterSecondPickup.status()).isEqualTo(B2cOrderStatus.DELIVERED);
        assertThat(recordedAuditLogs).hasSizeGreaterThanOrEqualTo(9);
    }
}
