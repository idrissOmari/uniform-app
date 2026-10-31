# Implementation Plan — uniform-app (Gestion de Commandes B2C / B2B)

Ce plan d'implémentation structure l'exécution technique du projet **uniform-app** en mode **Google Antigravity**, conformément à @GEMINI.md, @openAPI.yml et @src/main/resources/db/migration/V1__init_schema.sql.

## Proposed Changes

### 1. Couche domain — Modèle Métier Pur (Java 25, package com.uniform.app.domain)
* src/main/java/com/uniform/app/domain/model/vo/GarmentVariant.java
* src/main/java/com/uniform/app/domain/model/vo/FinancialsAndQuantities.java
* src/main/java/com/uniform/app/domain/model/b2c/B2cOrder.java
* src/main/java/com/uniform/app/domain/model/b2b/B2bPurchaseOrder.java
* src/main/java/com/uniform/app/domain/model/stock/ClientStock.java

### 2. Couche application — Use Cases & Orchestration Transactionnelle
* src/main/java/com/uniform/app/application/service/B2cB2bWorkflowService.java

### 3. Couches infrastructure & api — Quarkus 3.x, MySQL 8.4 & RFC 7807
* src/main/java/com/uniform/app/api/error/ProblemDetailsExceptionMapper.java

### 4. Couche frontend — Angular 21 (Zoneless & Signals)
* frontend/src/app/features/b2c/b2c-order-counter.component.ts
* frontend/src/app/features/b2b/b2b-purchase-order-editor.component.ts

## Verification Plan
1. ./mvnw test -Dtest=*DomainTest,HexagonalArchitectureTest
2. ./mvnw verify -Dtest=UniformLifecycleIntegrationTest
