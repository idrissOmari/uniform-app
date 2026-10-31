package com.uniform.app.domain.port.in;

import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.enums.ClientType;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.stock.ClientStock;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface ClientCatalogUseCase {

    List<Client> listClients();

    Client createClient(CreateClientCommand command);

    Client updateClient(UUID clientId, UpdateClientCommand command);

    Client updateClientMoq(UUID clientId, int newMoq, UUID adminUserId);

    Client updateClientSections(UUID clientId, List<ClientSectionInput> sections, UUID adminUserId);

    void deleteClient(UUID clientId, UUID adminUserId);

    CatalogItem createCatalogItem(UUID clientId, CreateCatalogItemCommand command);

    CatalogItem updateCatalogItem(UUID clientId, UUID catalogItemId, UpdateCatalogItemCommand command);

    void deleteCatalogItem(UUID clientId, UUID catalogItemId, UUID adminUserId);

    List<CatalogItem> listClientCatalogItems(UUID clientId);

    byte[] generateClientCatalogFlyerPdf(UUID clientId);

    List<ClientStock> listClientStocks(UUID clientId);

    ClientStock upsertClientStock(UUID clientId, UpsertClientStockCommand command);

    record UpsertClientStockCommand(
            UUID catalogItemId,
            Gender gender,
            Size size,
            int availableQuantity,
            UUID adminUserId
    ) {
    }

    record ClientSectionInput(
            UUID id,
            String name,
            int capacity
    ) {
        public ClientSectionInput(String name, int capacity) {
            this(null, name, capacity);
        }
    }

    record CreateClientCommand(
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            List<ClientSectionInput> sections,
            UUID adminUserId
    ) {
        public CreateClientCommand(
                String name,
                ClientType clientType,
                String address,
                String logoStorageKey,
                int moq,
                UUID adminUserId
        ) {
            this(name, clientType, address, logoStorageKey, moq, List.of(), adminUserId);
        }

        public CreateClientCommand(
                String name,
                String address,
                String logoStorageKey,
                int moq,
                UUID adminUserId
        ) {
            this(name, ClientType.SECONDARY_SCHOOL, address, logoStorageKey, moq, List.of(), adminUserId);
        }
    }

    record UpdateClientCommand(
            String name,
            ClientType clientType,
            String address,
            String logoStorageKey,
            int moq,
            List<ClientSectionInput> sections,
            UUID adminUserId
    ) {
        public UpdateClientCommand(
                String name,
                ClientType clientType,
                String address,
                String logoStorageKey,
                int moq,
                UUID adminUserId
        ) {
            this(name, clientType, address, logoStorageKey, moq, null, adminUserId);
        }

        public UpdateClientCommand(
                String name,
                String address,
                String logoStorageKey,
                int moq,
                UUID adminUserId
        ) {
            this(name, ClientType.SECONDARY_SCHOOL, address, logoStorageKey, moq, null, adminUserId);
        }
    }

    record CreateCatalogItemCommand(
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
            BigDecimal b2bUnitCost,
            UUID adminUserId
    ) {
        public CreateCatalogItemCommand(
                String referenceCode,
                String productType,
                String name,
                String garmentStyle,
                String colorReference,
                String supplierName,
                String availableSizes,
                String frontVisualStorageKey,
                String backVisualStorageKey,
                String visualPlacementNotes,
                BigDecimal b2cUnitPrice,
                BigDecimal b2bUnitCost,
                UUID adminUserId
        ) {
            this(
                    referenceCode,
                    productType,
                    name,
                    garmentStyle,
                    colorReference,
                    null,
                    supplierName,
                    availableSizes,
                    frontVisualStorageKey,
                    backVisualStorageKey,
                    visualPlacementNotes,
                    b2cUnitPrice,
                    b2bUnitCost,
                    adminUserId
            );
        }

        public CreateCatalogItemCommand(
                String referenceCode,
                String name,
                String garmentStyle,
                String colorReference,
                String frontVisualStorageKey,
                String backVisualStorageKey,
                String visualPlacementNotes,
                BigDecimal b2cUnitPrice,
                BigDecimal b2bUnitCost,
                UUID adminUserId
        ) {
            this(
                    referenceCode,
                    CatalogItem.DEFAULT_PRODUCT_TYPE,
                    name,
                    garmentStyle,
                    colorReference,
                    null,
                    CatalogItem.DEFAULT_SUPPLIER_NAME,
                    null,
                    frontVisualStorageKey,
                    backVisualStorageKey,
                    visualPlacementNotes,
                    b2cUnitPrice,
                    b2bUnitCost,
                    adminUserId
            );
        }
    }

    record UpdateCatalogItemCommand(
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
            BigDecimal b2bUnitCost,
            UUID adminUserId
    ) {
        public UpdateCatalogItemCommand(
                String referenceCode,
                String productType,
                String name,
                String garmentStyle,
                String colorReference,
                String supplierName,
                String availableSizes,
                String frontVisualStorageKey,
                String backVisualStorageKey,
                String visualPlacementNotes,
                BigDecimal b2cUnitPrice,
                BigDecimal b2bUnitCost,
                UUID adminUserId
        ) {
            this(
                    referenceCode,
                    productType,
                    name,
                    garmentStyle,
                    colorReference,
                    null,
                    supplierName,
                    availableSizes,
                    frontVisualStorageKey,
                    backVisualStorageKey,
                    visualPlacementNotes,
                    b2cUnitPrice,
                    b2bUnitCost,
                    adminUserId
            );
        }

        public UpdateCatalogItemCommand(
                String referenceCode,
                String name,
                String garmentStyle,
                String colorReference,
                String frontVisualStorageKey,
                String backVisualStorageKey,
                String visualPlacementNotes,
                BigDecimal b2cUnitPrice,
                BigDecimal b2bUnitCost,
                UUID adminUserId
        ) {
            this(
                    referenceCode,
                    CatalogItem.DEFAULT_PRODUCT_TYPE,
                    name,
                    garmentStyle,
                    colorReference,
                    null,
                    CatalogItem.DEFAULT_SUPPLIER_NAME,
                    null,
                    frontVisualStorageKey,
                    backVisualStorageKey,
                    visualPlacementNotes,
                    b2cUnitPrice,
                    b2bUnitCost,
                    adminUserId
            );
        }
    }
}
