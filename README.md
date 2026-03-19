# DS CORE 2.0 — Design Tokens

Design tokens exportados de Figma DS CORE 2.0, en formato **W3C Design Tokens** compatible con Style Dictionary.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `ds-core-tokens.json` | 145 tokens: 68 colores, 56 tipografías, 21 efectos |
| `export-tokens.mjs` | Script de exportación via Figma REST API |
| `tokens-viewer.html` | Visualizador interactivo (Colors, Typography, Effects, JSON) |

## Tokens incluidos

- **Colors** — brand (teal + rojo), neutral, feedback (success/info/warning/critical), special (púrpura), interactive2, special2
- **Typography** — Aptos, escalas 10px → 128px, pesos light/regular/medium/bold
- **Effects** — izi-level 1/2/3, shadow turquoise/neutral/red

## Uso

```js
import tokens from './ds-core-tokens.json'

// Color
tokens.color.color.brand.primary_interactive_1.medium_500.$value // "#008380"

// Typography
tokens.typography.text.body.base.regular.$value.fontSize // 16
tokens.typography.text.body.base.regular.$value.fontWeight // 400

// Shadow
tokens.effect['shadow_turquoise'].lg.$value // "0px 4px 6px ..."
```

## Re-exportar

```bash
node export-tokens.mjs 2>export-log.txt > ds-core-tokens.json
```

Requiere Figma Personal Access Token en la variable `TOKEN` dentro del script.
