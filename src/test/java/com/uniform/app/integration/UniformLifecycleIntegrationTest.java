package com.uniform.app.integration;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.smallrye.jwt.build.Jwt;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.testcontainers.DockerClientFactory;

@QuarkusTest
@QuarkusTestResource(MySql84TestResource.class)
@EnabledIf("isDockerAvailable")
class UniformLifecycleIntegrationTest {

    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable _) {
            return false;
        }
    }

    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUpTokens() {
        adminToken = Jwt.issuer("https://uniform-app.local/issuer")
                .upn("admin@uniform.local")
                .subject("admin@uniform.local")
                .groups(Set.of("ROLE_ADMIN", "ADMIN"))
                .expiresIn(Duration.ofHours(1))
                .sign();

        userToken = Jwt.issuer("https://uniform-app.local/issuer")
                .upn("operator@uniform.local")
                .subject("operator@uniform.local")
                .groups(Set.of("ROLE_USER", "USER"))
                .expiresIn(Duration.ofHours(1))
                .sign();
    }

    @Test
    @DisplayName("4.3 - End-to-End B2C <-> B2B <-> Stock <-> B2C Lifecycle, RBAC & Multi-Tenant Isolation on MySQL 8.4")
    void shouldExecuteCompleteLifecycleAndEnforceRbacAndMultiTenancy() {
        // 1. ROLE_USER must be forbidden (403 INSUFFICIENT_PRIVILEGES) from creating a client
        given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .body(Map.of("name", "Forbidden School", "address", "Paris", "moq", 5))
                .when()
                .post("/api/v1/admin/clients")
                .then()
                .statusCode(403)
                .contentType("application/problem+json")
                .body("errorCode", equalTo("INSUFFICIENT_PRIVILEGES"));

        // 2. ROLE_ADMIN creates Client A (MOQ = 5) and Client B (MOQ = 3)
        String clientAId = given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "name", "Institution Sainte-Marie " + UUID.randomUUID(),
                        "address", "15 Rue de Vaugirard, 75006 Paris",
                        "moq", 5
                ))
                .when()
                .post("/api/v1/admin/clients")
                .then()
                .statusCode(201)
                .body("moq", equalTo(5))
                .extract().path("id");

        String clientBId = given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "name", "Collège Victor Hugo " + UUID.randomUUID(),
                        "address", "8 Place Bellecour, 69002 Lyon",
                        "moq", 3
                ))
                .when()
                .post("/api/v1/admin/clients")
                .then()
                .statusCode(201)
                .extract().path("id");

        // 3. ROLE_ADMIN adds a catalog item to Client A
        String itemAId = given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "referenceCode", "SWEAT-SM-01",
                        "name", "Sweat Officiel Brodé",
                        "garmentStyle", "Molleton 300g",
                        "colorReference", "Navy Blue",
                        "frontVisualStorageKey", "visuals/sm-front.png",
                        "b2cUnitPrice", 30.00,
                        "b2bUnitCost", 14.00
                ))
                .when()
                .post("/api/v1/admin/clients/{clientId}/catalog-items", clientAId)
                .then()
                .statusCode(201)
                .body("b2cUnitPrice", equalTo(30.0f))
                .body("b2bUnitCost", equalTo(14.0f))
                .extract().path("id");

        // 4. ROLE_USER queries Client A catalog -> b2bUnitCost must NOT be exposed, and Client B catalog must be empty
        given()
                .auth().oauth2(userToken)
                .when()
                .get("/api/v1/clients/{clientId}/catalog-items", clientAId)
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].b2bUnitCost", nullValue());

        given()
                .auth().oauth2(userToken)
                .when()
                .get("/api/v1/clients/{clientId}/catalog-items", clientBId)
                .then()
                .statusCode(200)
                .body("$", hasSize(0));

        // 5. ROLE_USER initializes a B2C order (IN_PROGRESS) for Client A
        String b2cOrderId = given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders", clientAId)
                .then()
                .statusCode(201)
                .body("status", equalTo("IN_PROGRESS"))
                .body("clientMoqSnapshot", equalTo(5))
                .extract().path("id");

        // 6. Rejects invalid gender/size (KIDS + XL -> 400 INVALID_GENDER_SIZE)
        given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "catalogItemId", itemAId,
                        "buyerFullName", "Paul Martin",
                        "buyerPhone", "0612345678",
                        "buyerEmail", "paul@example.com",
                        "gender", "KIDS",
                        "size", "XL",
                        "quantity", 2,
                        "cashPaymentConfirmed", true,
                        "irreversibilityAcknowledged", true
                ))
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines", clientAId, b2cOrderId)
                .then()
                .statusCode(400)
                .contentType("application/problem+json")
                .body("errorCode", equalTo("INVALID_GENDER_SIZE"));

        // 7. Rejects line when cashPaymentConfirmed = false (400 CASH_CONFIRMATION_REQUIRED)
        given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "catalogItemId", itemAId,
                        "buyerFullName", "Paul Martin",
                        "buyerPhone", "0612345678",
                        "buyerEmail", "paul@example.com",
                        "gender", "MEN",
                        "size", "L",
                        "quantity", 2,
                        "cashPaymentConfirmed", false,
                        "irreversibilityAcknowledged", true
                ))
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines", clientAId, b2cOrderId)
                .then()
                .statusCode(400)
                .contentType("application/problem+json")
                .body("errorCode", equalTo("CASH_CONFIRMATION_REQUIRED"));

        // 8. ROLE_USER adds Line 1 (qty = 3 < MOQ 5) and downloads PDF receipt
        String line1Id = given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "catalogItemId", itemAId,
                        "buyerFullName", "Paul Martin",
                        "buyerPhone", "0612345678",
                        "buyerEmail", "paul@example.com",
                        "gender", "MEN",
                        "size", "L",
                        "quantity", 3,
                        "cashPaymentConfirmed", true,
                        "irreversibilityAcknowledged", true
                ))
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines", clientAId, b2cOrderId)
                .then()
                .statusCode(201)
                .body("lineCashAmount", equalTo(90.0f))
                .body("lineStatus", equalTo("PENDING_PICKUP"))
                .extract().path("id");

        byte[] pdfBytes = given()
                .auth().oauth2(userToken)
                .when()
                .get("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines/{lineId}/receipt-pdf", clientAId, b2cOrderId, line1Id)
                .then()
                .statusCode(200)
                .contentType("application/pdf")
                .extract().asByteArray();
        assertThat(pdfBytes).isNotEmpty();

        // 9. ROLE_ADMIN attempts move-to-production before MOQ (3 < 5) -> 422 MOQ_NOT_REACHED
        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/move-to-production", clientAId, b2cOrderId)
                .then()
                .statusCode(422)
                .contentType("application/problem+json")
                .body("errorCode", equalTo("MOQ_NOT_REACHED"));

        // 10. ROLE_USER adds Line 2 (qty = 2, total = 5 >= MOQ 5)
        String line2Id = given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "catalogItemId", itemAId,
                        "buyerFullName", "Sophie Durand",
                        "buyerPhone", "0699887766",
                        "buyerEmail", "sophie@example.com",
                        "gender", "KIDS",
                        "size", "AGE_10",
                        "quantity", 2,
                        "cashPaymentConfirmed", true,
                        "irreversibilityAcknowledged", true
                ))
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines", clientAId, b2cOrderId)
                .then()
                .statusCode(201)
                .extract().path("id");

        // 11. ROLE_ADMIN moves B2C order to IN_PRODUCTION -> creates DRAFT B2B Purchase Order
        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/move-to-production", clientAId, b2cOrderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("IN_PRODUCTION"))
                .body("moqReached", equalTo(true));

        // 12. Attempting to move B2C order to IN_DELIVERY before B2B PO is RECEIVED -> 409 B2B_STOCK_NOT_RECEIVED
        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/move-to-delivery", clientAId, b2cOrderId)
                .then()
                .statusCode(409)
                .contentType("application/problem+json")
                .body("errorCode", equalTo("B2B_STOCK_NOT_RECEIVED"));

        // 13. ROLE_ADMIN lists B2B POs, adjusts finalQuantity, confirms (ORDERED), and receives stock (RECEIVED)
        String b2bOrderId = given()
                .auth().oauth2(adminToken)
                .when()
                .get("/api/v1/clients/{clientId}/b2b-orders", clientAId)
                .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].status", equalTo("DRAFT"))
                .extract().path("[0].id");

        String firstB2bLineId = given()
                .auth().oauth2(adminToken)
                .when()
                .get("/api/v1/clients/{clientId}/b2b-orders", clientAId)
                .then()
                .extract().path("[0].lines[0].id");

        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(Map.of("finalQuantity", 4))
                .when()
                .put("/api/v1/clients/{clientId}/b2b-orders/{b2bOrderId}/lines/{b2bLineId}", clientAId, b2bOrderId, firstB2bLineId)
                .then()
                .statusCode(200);

        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2b-orders/{b2bOrderId}/confirm-order", clientAId, b2bOrderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("ORDERED"))
                .body("totalB2bCost", equalTo(84.0f));

        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2b-orders/{b2bOrderId}/receive-stock", clientAId, b2bOrderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("RECEIVED"));

        // 14. ROLE_ADMIN moves B2C order to IN_DELIVERY
        given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/move-to-delivery", clientAId, b2cOrderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("IN_DELIVERY"));

        // 15. ROLE_USER delivers Line 1 -> order remains IN_DELIVERY; then delivers Line 2 -> automatic DELIVERED!
        given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines/{lineId}/deliver", clientAId, b2cOrderId, line1Id)
                .then()
                .statusCode(200)
                .body("status", equalTo("IN_DELIVERY"));

        given()
                .auth().oauth2(userToken)
                .contentType(ContentType.JSON)
                .when()
                .post("/api/v1/clients/{clientId}/b2c-orders/{orderId}/lines/{lineId}/deliver", clientAId, b2cOrderId, line2Id)
                .then()
                .statusCode(200)
                .body("status", equalTo("DELIVERED"))
                .body("lines[0].lineStatus", equalTo("DELIVERED"))
                .body("lines[1].lineStatus", equalTo("DELIVERED"));
    }
}
