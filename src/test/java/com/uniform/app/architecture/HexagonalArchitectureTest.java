package com.uniform.app.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import com.uniform.app.domain.port.in.ClientCatalogUseCase;
import com.uniform.app.domain.port.out.ClientRepositoryPort;
import io.smallrye.common.annotation.RunOnVirtualThread;
import java.util.UUID;

@AnalyzeClasses(packages = "com.uniform.app", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {

    @ArchTest
    static final ArchRule domain_must_not_depend_on_frameworks =
            noClasses()
                    .that().resideInAPackage("com.uniform.app.domain..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "io.quarkus..",
                            "org.springframework..",
                            "jakarta.persistence..",
                            "org.hibernate..",
                            "com.fasterxml.jackson..",
                            "jakarta.ws.rs..",
                            "jakarta.transaction..",
                            "jakarta.enterprise.."
                    )
                    .because("The pure domain layer must have zero framework dependencies (GEMINI.md Section 3.1).");

    @ArchTest
    static final ArchRule domain_must_not_depend_on_outer_layers =
            noClasses()
                    .that().resideInAPackage("com.uniform.app.domain..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "com.uniform.app.application..",
                            "com.uniform.app.infrastructure..",
                            "com.uniform.app.api.."
                    )
                    .because("Domain is the innermost concentric layer of the hexagonal architecture.");

    @ArchTest
    static final ArchRule application_must_not_depend_on_infrastructure_or_api =
            noClasses()
                    .that().resideInAPackage("com.uniform.app.application..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(
                            "com.uniform.app.infrastructure..",
                            "com.uniform.app.api..",
                            "jakarta.persistence..",
                            "org.hibernate.."
                    )
                    .because("Application layer must only orchestrate domain objects and ports.");

    @ArchTest
    static final ArchRule pdf_generation_entrypoints_must_run_on_virtual_threads =
            methods()
                    .that().areDeclaredInClassesThat().resideInAPackage("com.uniform.app.api.rest..")
                    .and().haveNameMatching("addB2cOrderLine|downloadB2cLineReceiptPdf|confirmB2bPurchaseOrder")
                    .should().beAnnotatedWith(RunOnVirtualThread.class)
                    .because("Blocking PDF generation and I/O entrypoints must run on Java 25 Virtual Threads.");

    @ArchTest
    static final ArchRule domain_must_never_use_float_or_double =
            fields()
                    .that().areDeclaredInClassesThat().resideInAPackage("com.uniform.app.domain..")
                    .should().notHaveRawType(float.class)
                    .andShould().notHaveRawType(double.class)
                    .andShould().notHaveRawType(Float.class)
                    .andShould().notHaveRawType(Double.class)
                    .because("All financial amounts must exclusively use BigDecimal (GEMINI.md Section 2).");

    @ArchTest
    static final ArchRule multi_tenant_ports_must_accept_explicit_client_id =
            methods()
                    .that().areDeclaredInClassesThat().resideInAnyPackage(
                            "com.uniform.app.domain.port.in..",
                            "com.uniform.app.domain.port.out.."
                    )
                    .and().areDeclaredInClassesThat().areInterfaces()
                    .and().areNotDeclaredIn(ClientRepositoryPort.class)
                    .and().doNotHaveName("listClients")
                    .and().doNotHaveName("createClient")
                    .should(new ArchCondition<>("declare an explicit UUID clientId parameter") {
                        @Override
                        public void check(JavaMethod method, ConditionEvents events) {
                            boolean hasUuidParam = method.getRawParameterTypes().stream()
                                    .anyMatch(type -> type.isEquivalentTo(UUID.class));
                            if (!hasUuidParam) {
                                events.add(SimpleConditionEvent.violated(
                                        method,
                                        "Port method %s does not declare an explicit UUID clientId parameter"
                                                .formatted(method.getFullName())
                                ));
                            }
                        }
                    })
                    .allowEmptyShould(false);
}
