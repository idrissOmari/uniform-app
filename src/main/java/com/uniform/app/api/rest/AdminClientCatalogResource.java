package com.uniform.app.api.rest;

import com.uniform.app.api.dto.ApiDtos.AdminCatalogItemResponse;
import com.uniform.app.api.dto.ApiDtos.ClientResponse;
import com.uniform.app.api.dto.ApiDtos.ClientSectionRequest;
import com.uniform.app.api.dto.ApiDtos.ClientStockResponse;
import com.uniform.app.api.dto.ApiDtos.CreateCatalogItemRequest;
import com.uniform.app.api.dto.ApiDtos.CreateClientRequest;
import com.uniform.app.api.dto.ApiDtos.GlobalStockItemResponse;
import com.uniform.app.api.dto.ApiDtos.UpdateClientSectionsRequest;
import com.uniform.app.api.dto.ApiDtos.UpdateMoqRequest;
import com.uniform.app.api.dto.ApiDtos.UpsertClientStockRequest;
import com.uniform.app.api.mapper.ApiDtoMapper;
import com.uniform.app.api.security.SecurityActorResolver;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.client.CatalogItem;
import com.uniform.app.domain.model.client.Client;
import com.uniform.app.domain.model.stock.ClientStock;
import com.uniform.app.domain.port.in.ClientCatalogUseCase;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.ClientSectionInput;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.CreateCatalogItemCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.CreateClientCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.UpdateCatalogItemCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.UpdateClientCommand;
import com.uniform.app.domain.port.in.ClientCatalogUseCase.UpsertClientStockCommand;
import com.uniform.app.infrastructure.persistence.entity.SupplierJpaEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/admin/clients")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ROLE_ADMIN", "ADMIN"})
public class AdminClientCatalogResource {

    private final ClientCatalogUseCase clientCatalogUseCase;
    private final ApiDtoMapper dtoMapper;
    private final SecurityActorResolver securityActorResolver;
    private final EntityManager entityManager;

    public AdminClientCatalogResource(
            ClientCatalogUseCase clientCatalogUseCase,
            ApiDtoMapper dtoMapper,
            SecurityActorResolver securityActorResolver,
            EntityManager entityManager
    ) {
        this.clientCatalogUseCase = clientCatalogUseCase;
        this.dtoMapper = dtoMapper;
        this.securityActorResolver = securityActorResolver;
        this.entityManager = entityManager;
    }

    @GET
    public List<ClientResponse> listClients() {
        return clientCatalogUseCase.listClients().stream()
                .map(dtoMapper::toClientResponse)
                .toList();
    }

    @GET
    @Path("/global-stocks")
    public List<GlobalStockItemResponse> listGlobalStocks() {
        List<Client> clients = clientCatalogUseCase.listClients();
        java.util.ArrayList<GlobalStockItemResponse> result = new java.util.ArrayList<>();
        for (Client client : clients) {
            java.util.Map<UUID, CatalogItem> itemsById = clientCatalogUseCase.listClientCatalogItems(client.id())
                    .stream()
                    .collect(java.util.stream.Collectors.toMap(CatalogItem::id, java.util.function.Function.identity()));
            for (ClientStock stock : clientCatalogUseCase.listClientStocks(client.id())) {
                CatalogItem item = itemsById.get(stock.variant().catalogItemId());
                if (item != null) {
                    result.add(new GlobalStockItemResponse(
                            stock.id(),
                            client.id(),
                            client.name(),
                            client.clientType(),
                            item.id(),
                            item.referenceCode(),
                            item.productType(),
                            item.name(),
                            item.colorReference(),
                            item.supplierId(),
                            item.supplierName(),
                            stock.variant().gender(),
                            stock.variant().size(),
                            stock.availableQuantity(),
                            stock.updatedAt()
                    ));
                }
            }
        }
        return result;
    }

    @POST
    public Response createClient(@Valid CreateClientRequest request) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        int resolvedMoq = (request.moq() != null && request.moq() >= 1) ? request.moq() : 1;
        Client created = clientCatalogUseCase.createClient(new CreateClientCommand(
                request.name(),
                request.clientType(),
                request.address(),
                request.logoStorageKey(),
                resolvedMoq,
                toSectionInputs(request.sections()),
                adminUserId
        ));
        return Response.status(Response.Status.CREATED)
                .entity(dtoMapper.toClientResponse(created))
                .build();
    }

    @PUT
    @Path("/{clientId}")
    public ClientResponse updateClient(
            @PathParam("clientId") UUID clientId,
            @Valid CreateClientRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        int resolvedMoq = (request.moq() != null && request.moq() >= 1) ? request.moq() : 1;
        Client updated = clientCatalogUseCase.updateClient(
                clientId,
                new UpdateClientCommand(
                        request.name(),
                        request.clientType(),
                        request.address(),
                        request.logoStorageKey(),
                        resolvedMoq,
                        toSectionInputs(request.sections()),
                        adminUserId
                )
        );
        return dtoMapper.toClientResponse(updated);
    }

    @PUT
    @Path("/{clientId}/sections")
    public ClientResponse updateClientSections(
            @PathParam("clientId") UUID clientId,
            @Valid UpdateClientSectionsRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        Client updated = clientCatalogUseCase.updateClientSections(
                clientId,
                toSectionInputs(request.sections()),
                adminUserId
        );
        return dtoMapper.toClientResponse(updated);
    }

    private List<ClientSectionInput> toSectionInputs(List<ClientSectionRequest> sectionRequests) {
        if (sectionRequests == null) {
            return null;
        }
        return sectionRequests.stream()
                .map(s -> new ClientSectionInput(s.id(), s.name(), s.capacity()))
                .toList();
    }

    @PATCH
    @Path("/{clientId}/moq")
    public ClientResponse updateClientMoq(
            @PathParam("clientId") UUID clientId,
            @Valid UpdateMoqRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        Client updated = clientCatalogUseCase.updateClientMoq(clientId, request.moq(), adminUserId);
        return dtoMapper.toClientResponse(updated);
    }

    @DELETE
    @Path("/{clientId}")
    public Response deleteClient(@PathParam("clientId") UUID clientId) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        clientCatalogUseCase.deleteClient(clientId, adminUserId);
        return Response.noContent().build();
    }

    @GET
    @Path("/{clientId}/catalog-items")
    public List<AdminCatalogItemResponse> listAdminClientCatalogItems(@PathParam("clientId") UUID clientId) {
        return clientCatalogUseCase.listClientCatalogItems(clientId).stream()
                .map(dtoMapper::toAdminCatalogItemResponse)
                .toList();
    }

    @POST
    @Path("/{clientId}/catalog-items")
    public Response createCatalogItem(
            @PathParam("clientId") UUID clientId,
            @Valid CreateCatalogItemRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        ResolvedSupplier supplier = resolveSupplier(request.supplierId(), request.supplierName());
        String resolvedStyle = (request.garmentStyle() != null && !request.garmentStyle().isBlank())
                ? request.garmentStyle().trim()
                : (request.productType() != null && !request.productType().isBlank() ? request.productType().trim() : request.name().trim());
        BigDecimal resolvedB2bCost = request.b2bUnitCost() != null ? request.b2bUnitCost() : java.math.BigDecimal.ZERO;
        CatalogItem created = clientCatalogUseCase.createCatalogItem(
                clientId,
                new CreateCatalogItemCommand(
                        request.referenceCode(),
                        request.productType(),
                        request.name(),
                        resolvedStyle,
                        request.colorReference(),
                        supplier.supplierId(),
                        supplier.supplierName(),
                        request.availableSizes(),
                        request.frontVisualStorageKey(),
                        request.backVisualStorageKey(),
                        request.visualPlacementNotes(),
                        request.b2cUnitPrice(),
                        resolvedB2bCost,
                        adminUserId
                )
        );
        AdminCatalogItemResponse response = dtoMapper.toAdminCatalogItemResponse(created);
        return Response.status(Response.Status.CREATED)
                .entity(response)
                .build();
    }

    @PUT
    @Path("/{clientId}/catalog-items/{catalogItemId}")
    public AdminCatalogItemResponse updateCatalogItem(
            @PathParam("clientId") UUID clientId,
            @PathParam("catalogItemId") UUID catalogItemId,
            @Valid CreateCatalogItemRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        ResolvedSupplier supplier = resolveSupplier(request.supplierId(), request.supplierName());
        String resolvedStyle = (request.garmentStyle() != null && !request.garmentStyle().isBlank())
                ? request.garmentStyle().trim()
                : (request.productType() != null && !request.productType().isBlank() ? request.productType().trim() : request.name().trim());
        BigDecimal resolvedB2bCost = request.b2bUnitCost() != null ? request.b2bUnitCost() : java.math.BigDecimal.ZERO;
        CatalogItem updated = clientCatalogUseCase.updateCatalogItem(
                clientId,
                catalogItemId,
                new UpdateCatalogItemCommand(
                        request.referenceCode(),
                        request.productType(),
                        request.name(),
                        resolvedStyle,
                        request.colorReference(),
                        supplier.supplierId(),
                        supplier.supplierName(),
                        request.availableSizes(),
                        request.frontVisualStorageKey(),
                        request.backVisualStorageKey(),
                        request.visualPlacementNotes(),
                        request.b2cUnitPrice(),
                        resolvedB2bCost,
                        adminUserId
                )
        );
        return dtoMapper.toAdminCatalogItemResponse(updated);
    }

    private record ResolvedSupplier(UUID supplierId, String supplierName) {
    }

    private ResolvedSupplier resolveSupplier(UUID supplierId, String supplierName) {
        if (supplierId != null) {
            SupplierJpaEntity supplier = entityManager.find(SupplierJpaEntity.class, supplierId);
            if (supplier == null || !supplier.isActive()) {
                throw new ResourceNotFoundException("Fournisseur introuvable : " + supplierId);
            }
            return new ResolvedSupplier(supplier.getId(), supplier.getName());
        }
        if (supplierName != null && !supplierName.isBlank()) {
            var matches = entityManager.createQuery(
                            "SELECT s FROM SupplierJpaEntity s WHERE s.active = true AND LOWER(s.name) = LOWER(:name)",
                            SupplierJpaEntity.class
                    )
                    .setParameter("name", supplierName.trim())
                    .getResultList();
            if (!matches.isEmpty()) {
                SupplierJpaEntity found = matches.getFirst();
                return new ResolvedSupplier(found.getId(), found.getName());
            }
            return new ResolvedSupplier(null, supplierName.trim());
        }
        return new ResolvedSupplier(null, "Atelier UniformApp");
    }

    @DELETE
    @Path("/{clientId}/catalog-items/{catalogItemId}")
    public Response deleteCatalogItem(
            @PathParam("clientId") UUID clientId,
            @PathParam("catalogItemId") UUID catalogItemId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        clientCatalogUseCase.deleteCatalogItem(clientId, catalogItemId, adminUserId);
        return Response.noContent().build();
    }

    @PUT
    @Path("/{clientId}/stocks")
    public ClientStockResponse upsertClientStock(
            @PathParam("clientId") UUID clientId,
            @Valid UpsertClientStockRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        ClientStock updated = clientCatalogUseCase.upsertClientStock(
                clientId,
                new UpsertClientStockCommand(
                        request.catalogItemId(),
                        request.gender(),
                        request.size(),
                        request.availableQuantity(),
                        adminUserId
                )
        );
        return dtoMapper.toClientStockResponse(updated);
    }
}
