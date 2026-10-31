---
trigger: glob
globs: "*.ts, *.html, *.css"
description: "Règles Angular 21 Standalone, Zoneless, Signals API et sécurité RBAC UI pour uniform-app."
---

# Règles Frontend (uniform-app) — Angular 21 (Zoneless & Signals)

1. Ne jamais importer Zone.js. Tous les composants doivent être standalone: true avec changeDetection: ChangeDetectionStrategy.OnPush.
2. Utiliser exclusivement input(), input.required(), output(), model(), signal(), computed() et linkedSignal().
3. Utiliser exclusivement @if, @for (...; track item.id), @switch et @defer dans les templates HTML.
