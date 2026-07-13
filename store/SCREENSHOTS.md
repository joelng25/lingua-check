# Capturas para Chrome Web Store

Tamaños válidos: **1280×800** (recomendado) o **640×400**

## Cómo hacerlas

1. `npm run build` y carga `dist/` en Chrome
2. Abre una página de prueba con un `<textarea>` o Gmail
3. Escribe: `Esto es un eror de ortografia con faltas de gramatica`
4. Espera los subrayados rojos
5. Captura de pantalla (Win + Shift + S)
6. Recorta a 1280×800 si hace falta

## Capturas sugeridas (3–5)

| # | Qué mostrar |
|---|-------------|
| 1 | Campo de texto con subrayados + tooltip abierto |
| 2 | Panel lateral con lista de errores y chips de categoría |
| 3 | Popup de LinguaCheck (idioma, estado, botón panel) |
| 4 | Gmail o Google Docs con correcciones |
| 5 | Página de opciones (diccionario + reglas ignoradas) |

Guarda las imágenes en `store/screenshots/` antes de subirlas al dashboard.

Nombres sugeridos:
- `01-underlines.png`
- `02-sidepanel.png`
- `03-popup.png`
- `04-gmail.png`
- `05-options.png`
