# Guide de Lancement Rapide — Google Antigravity IDE (uniform-app)

Ouvrez ce dossier (uniform-app) dans Google Antigravity IDE, puis copiez-collez ce prompt dans l'Agent :

Prends connaissance de la constitution @GEMINI.md, du contrat @openAPI.yml, du schéma de base de données @src/main/resources/db/migration/V1__init_schema.sql, ainsi que des artefacts @task.md et @implementation_plan.md.

Exécute maintenant la Phase 1 de @task.md pour l'application uniform-app (package racine com.uniform.app) :
1. Génère le pom.xml Quarkus 3.x (artifactId: uniform-app) configuré pour Java 25, Hibernate ORM Panache, MySQL 8.4, Flyway, SmallRye JWT, OpenPDF, ArchUnit et Testcontainers.
2. Implémente l'intégralité de la couche pure domain (Value Objects, Exceptions Métier, Agrégats Client, B2cOrder, B2bPurchaseOrder, ClientStock et Ports).
3. Génère et exécute les tests unitaires JUnit 5 + AssertJ (B2cOrderDomainTest, B2bPurchaseOrderDomainTest) et le test HexagonalArchitectureTest (ArchUnit), puis mets à jour @task.md.
