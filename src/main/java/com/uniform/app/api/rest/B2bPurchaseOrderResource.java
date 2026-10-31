package com.uniform.app.api.rest;

import com.uniform.app.api.dto.ApiDtos.B2bPurchaseOrderResponse;
import com.uniform.app.api.dto.ApiDtos.UpdateB2bFinalQuantityRequest;
import com.uniform.app.api.mapper.ApiDtoMapper;
import com.uniform.app.api.security.SecurityActorResolver;
import com.uniform.app.domain.model.b2b.B2bPurchaseOrder;
import com.uniform.app.domain.port.in.B2bPurchaseOrderUseCase;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/clients/{clientId}/b2b-orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ROLE_ADMIN", "ADMIN"})
public class B2bPurchaseOrderResource {

    private final B2bPurchaseOrderUseCase b2bPurchaseOrderUseCase;
    private final ApiDtoMapper dtoMapper;
    private final SecurityActorResolver securityActorResolver;

    public B2bPurchaseOrderResource(
            B2bPurchaseOrderUseCase b2bPurchaseOrderUseCase,
            ApiDtoMapper dtoMapper,
            SecurityActorResolver securityActorResolver
    ) {
        this.b2bPurchaseOrderUseCase = b2bPurchaseOrderUseCase;
        this.dtoMapper = dtoMapper;
        this.securityActorResolver = securityActorResolver;
    }

    @GET
    public List<B2bPurchaseOrderResponse> listB2bPurchaseOrders(@PathParam("clientId") UUID clientId) {
        return b2bPurchaseOrderUseCase.listB2bPurchaseOrders(clientId).stream()
                .map(dtoMapper::toB2bPurchaseOrderResponse)
                .toList();
    }

    @PUT
    @Path("/{b2bOrderId}/lines/{b2bLineId}")
    @RunOnVirtualThread
    public B2bPurchaseOrderResponse updateB2bLineFinalQuantity(
            @PathParam("clientId") UUID clientId,
            @PathParam("b2bOrderId") UUID b2bOrderId,
            @PathParam("b2bLineId") UUID b2bLineId,
            @Valid UpdateB2bFinalQuantityRequest request
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2bPurchaseOrder updated = b2bPurchaseOrderUseCase.updateB2bLineFinalQuantity(
                clientId,
                b2bOrderId,
                b2bLineId,
                request.finalQuantity(),
                adminUserId
        );
        return dtoMapper.toB2bPurchaseOrderResponse(updated);
    }

    @GET
    @Path("/{b2bOrderId}/po-pdf")
    @Produces("application/pdf")
    @RunOnVirtualThread
    public Response downloadB2bPurchaseOrderPdf(
            @PathParam("clientId") UUID clientId,
            @PathParam("b2bOrderId") UUID b2bOrderId
    ) {
        byte[] pdfBytes = b2bPurchaseOrderUseCase.downloadB2bPurchaseOrderPdf(clientId, b2bOrderId);
        return Response.ok(pdfBytes)
                .header("Content-Disposition", "inline; filename=\"bon-commande-fournisseur-" + b2bOrderId + ".pdf\"")
                .build();
    }

    @POST
    @Path("/{b2bOrderId}/confirm-order")
    @RunOnVirtualThread
    public B2bPurchaseOrderResponse confirmB2bPurchaseOrder(
            @PathParam("clientId") UUID clientId,
            @PathParam("b2bOrderId") UUID b2bOrderId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2bPurchaseOrder confirmed = b2bPurchaseOrderUseCase.confirmB2bPurchaseOrder(
                clientId,
                b2bOrderId,
                adminUserId
        );
        return dtoMapper.toB2bPurchaseOrderResponse(confirmed);
    }

    @POST
    @Path("/{b2bOrderId}/receive-stock")
    public B2bPurchaseOrderResponse receiveB2bPurchaseOrderStock(
            @PathParam("clientId") UUID clientId,
            @PathParam("b2bOrderId") UUID b2bOrderId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2bPurchaseOrder received = b2bPurchaseOrderUseCase.receiveB2bPurchaseOrderStock(
                clientId,
                b2bOrderId,
                adminUserId
        );
        return dtoMapper.toB2bPurchaseOrderResponse(received);
    }
}
