package com.uniform.app.api.rest;

import com.uniform.app.api.dto.ApiDtos.AddB2cOrderLineRequest;
import com.uniform.app.api.dto.ApiDtos.B2cOrderDetailResponse;
import com.uniform.app.api.dto.ApiDtos.B2cOrderSummaryResponse;
import com.uniform.app.api.mapper.ApiDtoMapper;
import com.uniform.app.api.security.SecurityActorResolver;
import com.uniform.app.domain.model.b2c.B2cOrder;
import com.uniform.app.domain.model.b2c.B2cOrderLine;
import com.uniform.app.domain.port.in.B2cOrderUseCase;
import com.uniform.app.domain.port.in.B2cOrderUseCase.AddB2cOrderLineCommand;
import io.smallrye.common.annotation.RunOnVirtualThread;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/clients/{clientId}/b2c-orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class B2cOrderResource {

    private final B2cOrderUseCase b2cOrderUseCase;
    private final ApiDtoMapper dtoMapper;
    private final SecurityActorResolver securityActorResolver;

    public B2cOrderResource(
            B2cOrderUseCase b2cOrderUseCase,
            ApiDtoMapper dtoMapper,
            SecurityActorResolver securityActorResolver
    ) {
        this.b2cOrderUseCase = b2cOrderUseCase;
        this.dtoMapper = dtoMapper;
        this.securityActorResolver = securityActorResolver;
    }

    @GET
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    public List<B2cOrderSummaryResponse> listB2cOrders(@PathParam("clientId") UUID clientId) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        return b2cOrderUseCase.listB2cOrders(clientId).stream()
                .map(dtoMapper::toB2cOrderSummaryResponse)
                .toList();
    }

    @POST
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    public Response createB2cOrder(@PathParam("clientId") UUID clientId) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        UUID operatorUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrder created = b2cOrderUseCase.createB2cOrder(clientId, operatorUserId);
        return Response.status(Response.Status.CREATED)
                .entity(dtoMapper.toB2cOrderDetailResponse(created))
                .build();
    }

    @GET
    @Path("/{orderId}")
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    public B2cOrderDetailResponse getB2cOrderById(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId
    ) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        return dtoMapper.toB2cOrderDetailResponse(
                b2cOrderUseCase.getB2cOrderById(clientId, orderId)
        );
    }

    @POST
    @Path("/{orderId}/lines")
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    @RunOnVirtualThread
    public Response addB2cOrderLine(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId,
            @Valid AddB2cOrderLineRequest request
    ) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        UUID operatorUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrderLine line = b2cOrderUseCase.addB2cOrderLine(
                clientId,
                orderId,
                new AddB2cOrderLineCommand(
                        request.catalogItemId(),
                        request.sectionId(),
                        request.sectionName(),
                        request.buyerFullName(),
                        request.buyerPhone(),
                        request.buyerEmail(),
                        request.gender(),
                        request.size(),
                        request.quantity(),
                        request.cashPaymentConfirmed(),
                        request.irreversibilityAcknowledged(),
                        operatorUserId
                )
        );
        return Response.status(Response.Status.CREATED)
                .entity(dtoMapper.toB2cOrderLineResponse(line))
                .build();
    }

    @GET
    @Path("/{orderId}/lines/{lineId}/receipt-pdf")
    @Produces("application/pdf")
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    @RunOnVirtualThread
    public Response downloadB2cLineReceiptPdf(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId,
            @PathParam("lineId") UUID lineId
    ) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        byte[] pdfBytes = b2cOrderUseCase.downloadB2cLineReceiptPdf(clientId, orderId, lineId);
        return Response.ok(pdfBytes)
                .header("Content-Disposition", "inline; filename=\"receipt-" + lineId + ".pdf\"")
                .build();
    }

    @GET
    @Path("/{orderId}/packing-list-pdf")
    @Produces("application/pdf")
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    @RunOnVirtualThread
    public Response downloadB2cOrderPackingListPdf(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId
    ) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        byte[] pdfBytes = b2cOrderUseCase.downloadB2cOrderPackingListPdf(clientId, orderId);
        return Response.ok(pdfBytes)
                .header("Content-Disposition", "inline; filename=\"reconstitution-commande-" + orderId + ".pdf\"")
                .build();
    }

    @POST
    @Path("/{orderId}/move-to-production")
    @RolesAllowed({"ROLE_ADMIN", "ADMIN"})
    @RunOnVirtualThread
    public B2cOrderDetailResponse moveB2cOrderToProduction(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrder updated = b2cOrderUseCase.moveB2cOrderToProduction(clientId, orderId, adminUserId);
        return dtoMapper.toB2cOrderDetailResponse(updated);
    }

    @POST
    @Path("/{orderId}/move-to-delivery")
    @RolesAllowed({"ROLE_ADMIN", "ADMIN"})
    public B2cOrderDetailResponse moveB2cOrderToDelivery(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrder updated = b2cOrderUseCase.moveB2cOrderToDelivery(clientId, orderId, adminUserId);
        return dtoMapper.toB2cOrderDetailResponse(updated);
    }

    @POST
    @Path("/{orderId}/lines/{lineId}/deliver")
    @RolesAllowed({"ROLE_USER", "USER", "ROLE_ADMIN", "ADMIN"})
    public B2cOrderDetailResponse markB2cOrderLineDelivered(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId,
            @PathParam("lineId") UUID lineId
    ) {
        securityActorResolver.assertClientAccessAllowed(clientId);
        UUID operatorUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrder updated = b2cOrderUseCase.markB2cOrderLineDelivered(clientId, orderId, lineId, operatorUserId);
        return dtoMapper.toB2cOrderDetailResponse(updated);
    }

    @DELETE
    @Path("/{orderId}/lines/{lineId}")
    @RolesAllowed({"ROLE_ADMIN", "ADMIN"})
    public B2cOrderDetailResponse deleteB2cOrderLine(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId,
            @PathParam("lineId") UUID lineId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        B2cOrder updated = b2cOrderUseCase.deleteB2cOrderLine(clientId, orderId, lineId, adminUserId);
        return dtoMapper.toB2cOrderDetailResponse(updated);
    }

    @DELETE
    @Path("/{orderId}")
    @RolesAllowed({"ROLE_ADMIN", "ADMIN"})
    public Response deleteB2cOrder(
            @PathParam("clientId") UUID clientId,
            @PathParam("orderId") UUID orderId
    ) {
        UUID adminUserId = securityActorResolver.resolveCurrentActorUserId();
        b2cOrderUseCase.deleteB2cOrder(clientId, orderId, adminUserId);
        return Response.noContent().build();
    }
}
