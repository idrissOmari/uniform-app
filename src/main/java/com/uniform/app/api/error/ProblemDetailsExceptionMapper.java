package com.uniform.app.api.error;

import com.uniform.app.api.dto.ApiDtos.ProblemDetails;
import com.uniform.app.domain.exception.B2bStockNotReceivedException;
import com.uniform.app.domain.exception.CashPaymentNotConfirmedException;
import com.uniform.app.domain.exception.DomainException;
import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.InsufficientClientStockException;
import com.uniform.app.domain.exception.InsufficientPrivilegesException;
import com.uniform.app.domain.exception.InvalidGenderSizeCombinationException;
import com.uniform.app.domain.exception.MoqNotReachedException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.domain.model.enums.ErrorCode;
import io.quarkus.security.ForbiddenException;
import io.quarkus.security.UnauthorizedException;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.net.URI;
import java.time.Instant;
import java.util.stream.Collectors;

@Provider
public class ProblemDetailsExceptionMapper implements ExceptionMapper<Throwable> {

    public static final String PROBLEM_JSON_MEDIA_TYPE = "application/problem+json";

    @Context
    UriInfo uriInfo;

    @Override
    public Response toResponse(Throwable exception) {
        String instancePath = (uriInfo != null && uriInfo.getRequestUri() != null)
                ? uriInfo.getRequestUri().getPath()
                : "/api/v1";

        if (exception instanceof DomainException domainException) {
            return buildProblemResponse(
                    mapDomainExceptionStatus(domainException),
                    domainException.errorCode(),
                    domainException.title(),
                    domainException.getMessage(),
                    instancePath
            );
        }

        if (exception instanceof ForbiddenException || exception instanceof jakarta.ws.rs.ForbiddenException) {
            return buildProblemResponse(
                    403,
                    ErrorCode.INSUFFICIENT_PRIVILEGES,
                    "Accès refusé (Privilèges insuffisants)",
                    "You do not have sufficient privileges (ROLE_ADMIN required) to perform this operation.",
                    instancePath
            );
        }

        if (exception instanceof UnauthorizedException || exception instanceof jakarta.ws.rs.NotAuthorizedException) {
            String detail = (exception.getMessage() != null && !exception.getMessage().isBlank())
                    ? exception.getMessage()
                    : "Valid authentication credentials are required.";
            return buildProblemResponse(
                    401,
                    ErrorCode.INSUFFICIENT_PRIVILEGES,
                    "Authentification refusée",
                    detail,
                    instancePath
            );
        }

        if (exception instanceof ConstraintViolationException validationEx) {
            String details = validationEx.getConstraintViolations().stream()
                    .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                    .collect(Collectors.joining("; "));
            return buildProblemResponse(
                    400,
                    ErrorCode.VALIDATION_ERROR,
                    "Erreur de validation de la requête",
                    details.isBlank() ? validationEx.getMessage() : details,
                    instancePath
            );
        }

        if (exception instanceof NotFoundException notFoundEx) {
            return buildProblemResponse(
                    404,
                    ErrorCode.RESOURCE_NOT_FOUND,
                    "Ressource introuvable",
                    notFoundEx.getMessage(),
                    instancePath
            );
        }

        if (exception instanceof WebApplicationException webEx) {
            int status = webEx.getResponse() != null ? webEx.getResponse().getStatus() : 400;
            ErrorCode code = status == 403 ? ErrorCode.INSUFFICIENT_PRIVILEGES
                    : status == 404 ? ErrorCode.RESOURCE_NOT_FOUND
                    : ErrorCode.VALIDATION_ERROR;
            return buildProblemResponse(
                    status,
                    code,
                    "Erreur HTTP " + status,
                    webEx.getMessage() != null ? webEx.getMessage() : "HTTP error " + status,
                    instancePath
            );
        }

        return buildProblemResponse(
                500,
                ErrorCode.VALIDATION_ERROR,
                "Erreur interne du serveur",
                exception.getMessage() != null ? exception.getMessage() : "Unexpected error",
                instancePath
        );
    }

    private static int mapDomainExceptionStatus(DomainException domainException) {
        return switch (domainException) {
            case CashPaymentNotConfirmedException _ -> 400;
            case InvalidGenderSizeCombinationException _ -> 400;
            case DomainValidationException _ -> 400;
            case InsufficientPrivilegesException _ -> 403;
            case ResourceNotFoundException _ -> 404;
            case OrderLockedException _ -> 409;
            case InsufficientClientStockException _ -> 409;
            case B2bStockNotReceivedException _ -> 409;
            case MoqNotReachedException _ -> 422;
        };
    }

    private static Response buildProblemResponse(
            int status,
            ErrorCode errorCode,
            String title,
            String detail,
            String instancePath
    ) {
        URI typeUri = URI.create("https://uniform-app.local/problems/" + errorCode.name().toLowerCase().replace('_', '-'));
        ProblemDetails problem = new ProblemDetails(
                typeUri,
                title,
                status,
                detail,
                instancePath,
                errorCode,
                Instant.now()
        );
        return Response.status(status)
                .type(PROBLEM_JSON_MEDIA_TYPE)
                .entity(problem)
                .build();
    }
}
