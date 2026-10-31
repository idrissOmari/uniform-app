package com.uniform.app.api.rest;

import com.uniform.app.domain.exception.DomainValidationException;
import com.uniform.app.domain.exception.ResourceNotFoundException;
import com.uniform.app.infrastructure.persistence.entity.SupplierJpaEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/admin/suppliers")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({"ADMIN", "ROLE_ADMIN"})
public class AdminSupplierManagementResource {

    private final EntityManager entityManager;

    public AdminSupplierManagementResource(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public record CreateOrUpdateSupplierRequest(
            @NotBlank String name,
            String specialty,
            String contactName,
            String phone,
            String email,
            String cityAddress
    ) {
    }

    public record SupplierResponse(
            UUID id,
            String name,
            String specialty,
            String contactName,
            String phone,
            String email,
            String cityAddress,
            boolean active,
            long attachedCatalogItemsCount,
            Instant createdAt
    ) {
    }

    @GET
    public List<SupplierResponse> listSuppliers() {
        return entityManager.createQuery(
                        "SELECT s FROM SupplierJpaEntity s WHERE s.active = true ORDER BY s.name ASC",
                        SupplierJpaEntity.class
                )
                .getResultList()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @POST
    @Transactional
    public Response createSupplier(@Valid CreateOrUpdateSupplierRequest request) {
        String normalizedName = request.name().trim();
        long existingCount = entityManager.createQuery(
                        "SELECT COUNT(s) FROM SupplierJpaEntity s WHERE s.active = true AND LOWER(s.name) = LOWER(:name)",
                        Long.class
                )
                .setParameter("name", normalizedName)
                .getSingleResult();
        if (existingCount > 0) {
            throw new DomainValidationException(
                    "Un fournisseur portant le nom '" + normalizedName + "' existe déjà."
            );
        }

        Instant now = Instant.now();
        SupplierJpaEntity supplier = new SupplierJpaEntity();
        supplier.setId(UUID.randomUUID());
        supplier.setName(normalizedName);
        supplier.setSpecialty(trimOrNull(request.specialty()));
        supplier.setContactName(trimOrNull(request.contactName()));
        supplier.setPhone(trimOrNull(request.phone()));
        supplier.setEmail(trimOrNull(request.email()));
        supplier.setCityAddress(trimOrNull(request.cityAddress()));
        supplier.setActive(true);
        supplier.setCreatedAt(now);
        supplier.setUpdatedAt(now);

        entityManager.persist(supplier);
        entityManager.flush();

        return Response.status(Response.Status.CREATED)
                .entity(toResponse(supplier))
                .build();
    }

    @PUT
    @Path("/{supplierId}")
    @Transactional
    public SupplierResponse updateSupplier(
            @PathParam("supplierId") UUID supplierId,
            @Valid CreateOrUpdateSupplierRequest request
    ) {
        SupplierJpaEntity supplier = entityManager.find(SupplierJpaEntity.class, supplierId);
        if (supplier == null || !supplier.isActive()) {
            throw new ResourceNotFoundException("Fournisseur introuvable : " + supplierId);
        }

        String normalizedName = request.name().trim();
        long duplicateCount = entityManager.createQuery(
                        "SELECT COUNT(s) FROM SupplierJpaEntity s WHERE s.active = true AND s.id <> :id AND LOWER(s.name) = LOWER(:name)",
                        Long.class
                )
                .setParameter("id", supplierId)
                .setParameter("name", normalizedName)
                .getSingleResult();
        if (duplicateCount > 0) {
            throw new DomainValidationException(
                    "Un autre fournisseur porte déjà le nom '" + normalizedName + "'."
            );
        }

        supplier.setName(normalizedName);
        supplier.setSpecialty(trimOrNull(request.specialty()));
        supplier.setContactName(trimOrNull(request.contactName()));
        supplier.setPhone(trimOrNull(request.phone()));
        supplier.setEmail(trimOrNull(request.email()));
        supplier.setCityAddress(trimOrNull(request.cityAddress()));
        supplier.setUpdatedAt(Instant.now());
        entityManager.flush();

        // Synchronize attached catalog items' supplierName with the updated supplier name
        entityManager.createQuery(
                        "UPDATE CatalogItemJpaEntity c SET c.supplierName = :supplierName WHERE c.supplierId = :supplierId"
                )
                .setParameter("supplierName", normalizedName)
                .setParameter("supplierId", supplierId)
                .executeUpdate();

        return toResponse(supplier);
    }

    @DELETE
    @Path("/{supplierId}")
    @Transactional
    public Response deleteSupplier(@PathParam("supplierId") UUID supplierId) {
        SupplierJpaEntity supplier = entityManager.find(SupplierJpaEntity.class, supplierId);
        if (supplier == null) {
            throw new ResourceNotFoundException("Fournisseur introuvable : " + supplierId);
        }
        supplier.setActive(false);
        supplier.setUpdatedAt(Instant.now());
        entityManager.flush();
        return Response.noContent().build();
    }

    private SupplierResponse toResponse(SupplierJpaEntity supplier) {
        long attachedCount = entityManager.createQuery(
                        "SELECT COUNT(c) FROM CatalogItemJpaEntity c WHERE c.supplierId = :supplierId OR LOWER(c.supplierName) = LOWER(:supplierName)",
                        Long.class
                )
                .setParameter("supplierId", supplier.getId())
                .setParameter("supplierName", supplier.getName())
                .getSingleResult();

        return new SupplierResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getSpecialty(),
                supplier.getContactName(),
                supplier.getPhone(),
                supplier.getEmail(),
                supplier.getCityAddress(),
                supplier.isActive(),
                attachedCount,
                supplier.getCreatedAt()
        );
    }

    private static String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
