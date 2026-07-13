# Publicar LinguaCheck en Chrome Web Store

Guía paso a paso para la primera publicación.

## Requisitos previos

1. Cuenta de Google
2. Registro de desarrollador en Chrome Web Store (**5 USD**, pago único)
   - https://chrome.google.com/webstore/devconsole
3. Política de privacidad publicada en una URL pública
4. ZIP de la extensión generado con `npm run package:store`

---

## Paso 1 — Preparar la política de privacidad

1. Edita `store/privacy-policy.html` y sustituye `[TU_EMAIL@ejemplo.com]` por tu email real.
2. Publica el archivo en una URL accesible. Opciones:

### Opción A: GitHub Pages (recomendada)

```bash
# Si el repo está en GitHub:
# 1. Sube store/privacy-policy.html a la rama main
# 2. Settings → Pages → Deploy from branch → main /docs o /root
# 3. URL resultante: https://TU_USUARIO.github.io/lingua-check/store/privacy-policy.html
```

### Opción B: Gist o sitio propio

Cualquier URL HTTPS pública válida sirve.

---

## Paso 2 — Generar el paquete ZIP

```powershell
cd C:\Users\joeln\lingua-check
npm run package:store
```

Esto crea: `release/lingua-check-v1.0.1.zip` (o la versión actual del manifest)

**Importante:** el ZIP debe contener `manifest.json` en la raíz (no dentro de una carpeta `dist/`). El script ya lo hace correctamente.

---

## Paso 3 — Probar el paquete antes de subir

1. Descomprime el ZIP en una carpeta temporal
2. Chrome → `chrome://extensions`
3. Modo desarrollador → **Cargar descomprimida**
4. Prueba: Gmail, un textarea genérico, panel lateral, popup, opciones

---

## Paso 4 — Crear el listing en Developer Dashboard

1. Ve a https://chrome.google.com/webstore/devconsole
2. Paga el registro de desarrollador si es tu primera extensión
3. **New item** → sube `release/lingua-check-v1.0.0.zip`

### Pestaña Store listing

| Campo | Valor |
|-------|-------|
| Title | LinguaCheck — Corrector de gramática |
| Summary | (copia de `store/LISTING.md`) |
| Description | (copia descripción detallada de `store/LISTING.md`) |
| Category | Productivity |
| Language | Spanish (+ English opcional) |
| Icon | Ya incluido en el paquete (128×128) |
| Screenshots | Mínimo 1 (ver `store/LISTING.md`) |
| Privacy policy URL | Tu URL pública de `privacy-policy.html` |

### Pestaña Privacy

- Declara que se procesa **contenido de sitios web** (texto escrito por el usuario)
- Uso: funcionalidad de la extensión
- Tercero: LanguageTool API
- No se venden datos
- Enlace a política de privacidad

### Pestaña Distribution

- Visibilidad: **Public** (o Unlisted para prueba inicial)
- Países: todos o los que elijas
- Para prueba privada: **Unlisted** + compartir enlace directo

---

## Paso 5 — Enviar a revisión

1. Completa todas las secciones obligatorias (aparecen ✅)
2. **Submit for review**
3. La revisión suele tardar **1–3 días laborables** (a veces más)

---

## Motivos comunes de rechazo y cómo evitarlos

| Motivo | Solución |
|--------|----------|
| Permisos excesivos sin justificación | Usa el texto de justificación en `store/LISTING.md` |
| Falta política de privacidad | Publica `privacy-policy.html` con URL HTTPS |
| Descripción poco clara | Explica que el texto se envía a LanguageTool |
| Capturas de baja calidad | Usa 1280×800, muestra la extensión en uso real |
| Funcionalidad rota | Prueba el ZIP descomprimido antes de subir |
| Single purpose poco claro | La extensión solo corrige ortografía/gramática |

---

## Actualizar versiones futuras

1. Incrementa `version` en `src/manifest.json` (ej. `1.0.1`, `1.1.0`)
2. `npm run package:store`
3. Developer Dashboard → tu extensión → **Package** → Upload new package
4. Actualiza notas de la versión y envía a revisión

---

## Checklist final antes de enviar

- [ ] Email actualizado en política de privacidad
- [ ] Política de privacidad accesible por HTTPS
- [ ] `npm run package:store` sin errores
- [ ] ZIP probado en Chrome (cargar descomprimida)
- [ ] Al menos 1 captura de pantalla subida
- [ ] Descripción en español (e inglés recomendado)
- [ ] Privacy practices completadas en el dashboard
- [ ] Permisos justificados

---

## Comandos útiles

```powershell
# Desarrollo
npm run dev

# Build producción
npm run build

# Build + ZIP para la tienda
npm run package:store
```

---

## Notas legales

- LanguageTool tiene sus propios términos de uso para la API pública. Revisa límites en https://dev.languagetool.org/public-http-api
- Si monetizas la extensión o superas límites de la API, considera servidor propio o plan de LanguageTool.
- No uses el nombre "LanguageTool" como nombre principal de la extensión en la tienda (puedes mencionarlo en la descripción como motor utilizado).
