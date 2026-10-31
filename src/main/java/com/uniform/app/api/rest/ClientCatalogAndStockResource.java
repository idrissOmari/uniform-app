package com.uniform.app.api.rest;

import com.uniform.app.api.dto.ApiDtos.B2cCatalogItemResponse;
import com.uniform.app.api.dto.ApiDtos.ClientResponse;
import com.uniform.app.api.dto.ApiDtos.ClientStockResponse;
import com.uniform.app.api.mapper.ApiDtoMapper;
import com.uniform.app.api.security.SecurityActorResolver;
import com.uniform.app.domain.port.in.ClientCatalogUseCase;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Path("/api/v1/clients")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
public class ClientCatalogAndStockResource {

    private final ClientCatalogUseCase clientCatalogUseCase;
    private final ApiDtoMapper dtoMapper;
    private final SecurityActorResolver securityActorResolver;

    public ClientCatalogAndStockResource(
            ClientCatalogUseCase clientCatalogUseCase,
            ApiDtoMapper dtoMapper,
            SecurityActorResolver securityActorResolver
    ) {
        this.clientCatalogUseCase = clientCatalogUseCase;
        this.dtoMapper = dtoMapper;
        this.securityActorResolver = securityActorResolver;
    }

    @GET
    public List<ClientResponse> listAccessibleClients() {
        Optional<UUID> assignedClientId = securityActorResolver.resolveAssignedClientIdForNonAdmin();
        return clientCatalogUseCase.listClients().stream()
                .filter(c -> assignedClientId.isEmpty() || c.id().equals(assignedClientId.get()))
                .map(dtoMapper::toClientResponse)
                .toList();
    }

    @GET
    @Path("/{clientId}/catalog-items")
    public List<B2cCatalogItemResponse> listClientCatalogItems(@PathParam("clientId") UUID clientId) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        return clientCatalogUseCase.listClientCatalogItems(clientId).stream()
                .map(dtoMapper::toB2cCatalogItemResponse)
                .toList();
    }

    @GET
    @Path("/{clientId}/catalog-flyer-pdf")
    @Produces("application/pdf")
    @RunOnVirtualThread
    public Response downloadClientCatalogFlyerPdf(@PathParam("clientId") UUID clientId) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        byte[] pdfBytes = clientCatalogUseCase.generateClientCatalogFlyerPdf(clientId);
        return Response.ok(pdfBytes)
                .header("Content-Disposition", "inline; filename=\"flyer-catalogue-" + clientId + ".pdf\"")
                .build();
    }

    @GET
    @Path("/{clientId}/stocks")
    public List<ClientStockResponse> listClientStocks(@PathParam("clientId") UUID clientId) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        return clientCatalogUseCase.listClientStocks(clientId).stream()
                .map(dtoMapper::toClientStockResponse)
                .toList();
    }
}
