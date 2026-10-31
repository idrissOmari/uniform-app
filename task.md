# Task Checklist — uniform-app (B2C / B2B Order Management)

## Phase 0 : Cadrage, Constitution, Contrat OpenAPI & Base de Données
- [x] Cadrage fonctionnel et métier de la chaîne synchronisée B2C <-> B2B (`cadrage_projet_commandes.md`)
- [x] Rédaction de la constitution technique et métier (`GEMINI.md`)
- [x] Spécification du contrat d'API REST OpenAPI 3.1 (`openAPI.yml`)
- [x] Création de la migration initiale Flyway MySQL 8.4 (`src/main/resources/db/migration/V1__init_schema.sql`)
- [x] Initialisation des artefacts et règles de l'espace de travail Google Antigravity

## Phase 1 : Cœur Métier Pur — Couche domain (Java 25, Zéro Framework)
- [x] 1.1. Value Objects & Référentiels immuables (`record` & `enum`)
- [x] 1.2. Exceptions Métier & Hiérarchie Scellée (`DomainException`)
- [x] 1.3. Agrégats du Domaine & Machines à États (`Client`, `B2cOrder`, `B2bPurchaseOrder`, `ClientStock`)
- [x] 1.4. Ports Primaires (`in`) & Secondaires (`out`)
- [x] 1.5. Tests Unitaires du Domaine & ArchUnit (`HexagonalArchitectureTest`)

## Phase 2 : Orchestration — Couche application
- [x] 2.1. Services Applicatifs Transactionnels

## Phase 3 : Adaptateurs Secondaires — Couche infrastructure (Quarkus 3.x)
- [x] 3.1. Persistance Hibernate ORM Panache & Mappers
- [x] 3.2. Génération PDF (OpenPDF sur `@RunOnVirtualThread`)

## Phase 4 : Adaptateurs Primaires REST & Sécurité — Couche api
- [x] 4.1. Contrôleurs REST & Sécurité RBAC (`ROLE_ADMIN` / `ROLE_USER`)
- [x] 4.2. Gestionnaire Global d'Erreurs RFC 7807 / RFC 9457
- [x] 4.3. Tests d'Intégration Backend (`@QuarkusTest` + Testcontainers MySQL 8.4)

## Phase 5 : Frontend Réactif — Angular 21 (Zoneless & Signals)
- [x] 5.1. Socle Angular 21, Sécurité RBAC & État Réactif
- [x] 5.2. Composants B2C (Comptoir & Remise Ligne par Ligne)
- [x] 5.3. Composants B2B (ADMIN uniquement)
