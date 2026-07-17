# Reenvío tras rechazo — Spam de palabras clave

**ID de infracción:** Yellow Argon  
**Motivo:** Palabras clave irrelevantes o en exceso en la descripción  
**Texto infractor:** Lista de plataformas (Gmail, Google Docs, LinkedIn, X, Slack, Reddit, Discord, WhatsApp Web)

## Qué hacer

### 1. Actualizar el listing en Developer Dashboard (sin cambiar código si ya subiste v1.0.3)

Ve a **Store listing** y sustituye:

| Campo | Texto nuevo (copiar de `LISTING.md`) |
|-------|--------------------------------------|
| Resumen corto | Corregir ortografía y gramática en tiempo real mientras escribes en campos de texto en la web. |
| Descripción | Versión sin nombres de sitios en `store/LISTING.md` |

### 2. Subir nuevo paquete (opcional pero recomendado)

```powershell
npm run package:store
```

Sube `release/lingua-check-v1.0.3.zip` — el `manifest.json` ya no menciona plataformas.

### 3. Revisar capturas de pantalla

Si alguna captura tiene texto superpuesto con nombres de sitios (Gmail, LinkedIn…), cámbiala.

### 4. Enviar de nuevo

**Package** → Upload → **Submit for review**

### 5. Apelación (opcional)

Si ya corregiste el listing, no hace falta apelar: reenvía con los textos corregidos.  
Si apelas, indica:

```
Hemos eliminado la lista de nombres de plataformas de la descripción del listing. 
La descripción ahora describe únicamente la funcionalidad de la extensión 
(corrección ortográfica y gramática en campos de texto web) sin palabras clave irrelevantes.
```

## Textos listos para pegar

**Resumen (ES):**
```
Corrector de ortografía y gramática en tiempo real mientras escribes en campos de texto en la web.
```

**Descripción (ES) — primer párrafo:**
```
LinguaCheck revisa tu escritura mientras escribes en la web. Detecta errores de ortografía y gramática y te muestra sugerencias que puedes aplicar al instante.
```

Ver descripción completa en `store/LISTING.md`.
