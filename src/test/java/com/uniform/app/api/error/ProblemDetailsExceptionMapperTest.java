package com.uniform.app.api.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.uniform.app.api.dto.ApiDtos.ProblemDetails;
import com.uniform.app.domain.exception.B2bStockNotReceivedException;
import com.uniform.app.domain.exception.CashPaymentNotConfirmedException;
import com.uniform.app.domain.exception.InsufficientClientStockException;
import com.uniform.app.domain.exception.InvalidGenderSizeCombinationException;
import com.uniform.app.domain.exception.MoqNotReachedException;
import com.uniform.app.domain.exception.OrderLockedException;
import com.uniform.app.domain.model.enums.B2bOrderStatus;
import com.uniform.app.domain.model.enums.ErrorCode;
import com.uniform.app.domain.model.enums.Gender;
import com.uniform.app.domain.model.enums.Size;
import com.uniform.app.domain.model.vo.GarmentVariant;
import io.quarkus.security.ForbiddenException;
import jakarta.ws.rs.core.Response;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ProblemDetailsExceptionMapperTest {

    private final ProblemDetailsExceptionMapper mapper = new ProblemDetailsExceptionMapper();
    private final ForbiddenExceptionMapper forbiddenMapper = new ForbiddenExceptionMapper();

    @Test
    @DisplayName("4.2 - Should map all sealed DomainExceptions and RBAC ForbiddenException to RFC 7807 ProblemDetails")
    void shouldMapAllDomainExceptionsToRfc7807ProblemDetails() {
        assertProblem(
                mapper.toResponse(CashPaymentNotConfirmedException.defaultMessage()),
                400,
                ErrorCode.CASH_CONFIRMATION_REQUIRED
        );

        assertProblem(
                mapper.toResponse(new InvalidGenderSizeCombinationException(Gender.KIDS, Size.XL)),
                400,
                ErrorCode.INVALID_GENDER_SIZE
        );

        assertProblem(
                mapper.toResponse(new OrderLockedException("Order locked")),
                409,
                ErrorCode.ORDER_IMMUTABLE
        );

        assertProblem(
                mapper.toResponse(new InsufficientClientStockException(
                        new GarmentVariant(UUID.randomUUID(), Gender.MEN, Size.M), 5, 2
                )),
                409,
                ErrorCode.INSUFFICIENT_CLIENT_STOCK
        );

        assertProblem(
                mapper.toResponse(new B2bStockNotReceivedException(UUID.randomUUID(), B2bOrderStatus.ORDERED)),
                409,
                ErrorCode.B2B_STOCK_NOT_RECEIVED
        );

        assertProblem(
                mapper.toResponse(new MoqNotReachedException(UUID.randomUUID(), 3, 10)),
                422,
                ErrorCode.MOQ_NOT_REACHED
        );

        assertProblem(
                forbiddenMapper.toResponse(new ForbiddenException("ROLE_ADMIN required")),
                403,
                ErrorCode.INSUFFICIENT_PRIVILEGES
        );
    }

    private static void assertProblem(Response response, int expectedStatus, ErrorCode expectedErrorCode) {
        assertThat(response.getStatus()).isEqualTo(expectedStatus);
        assertThat(response.getMediaType().toString()).isEqualTo("application/problem+json");
        ProblemDetails body = (ProblemDetails) response.getEntity();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(expectedStatus);
        assertThat(body.errorCode()).isEqualTo(expectedErrorCode);
        assertThat(body.timestamp()).isNotNull();
    }
}
