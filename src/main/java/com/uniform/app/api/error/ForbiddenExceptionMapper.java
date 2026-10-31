package com.uniform.app.api.error;

import com.uniform.app.api.dto.ApiDtos.ProblemDetails;
import com.uniform.app.domain.model.enums.ErrorCode;
import io.quarkus.security.ForbiddenException;
import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.net.URI;
import java.time.Instant;

@Provider
@Priority(Priorities.AUTHENTICATION - 1)
public class ForbiddenExceptionMapper implements ExceptionMapper<ForbiddenException> {

    @Context
    UriInfo uriInfo;

    @Override
    public Response toResponse(ForbiddenException exception) {
        String instancePath = (uriInfo != null && uriInfo.getRequestUri() != null)
                ? uriInfo.getRequestUri().getPath()
                : "/api/v1";

        ProblemDetails problem = new ProblemDetails(
                URI.create("https://uniform-app.local/problems/insufficient-privileges"),
                "Accès refusé (ROLE_ADMIN requis)",
                403,
                "Insufficient privileges to execute this operation.",
                instancePath,
                ErrorCode.INSUFFICIENT_PRIVILEGES,
                Instant.now()
        );
        return Response.status(Response.Status.FORBIDDEN)
                .type(ProblemDetailsExceptionMapper.PROBLEM_JSON_MEDIA_TYPE)
                .entity(problem)
                .build();
    }
}
