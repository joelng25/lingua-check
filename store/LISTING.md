# Textos para Chrome Web Store — LinguaCheck

> **Importante:** No listes nombres de sitios web (Gmail, LinkedIn, etc.) en título, resumen ni descripción. Google lo considera spam de palabras clave.

## Nombre
LinguaCheck — Corrector de gramática

## Resumen corto (132 caracteres máx.)

**Español (recomendado):**
```
Corrector de ortografía y gramática en tiempo real mientras escribes en campos de texto en la web.
```

**English:**
```
Real-time spelling and grammar checker for text fields as you write on the web.
```

---

## Descripción detallada (español)

```
LinguaCheck revisa tu escritura mientras escribes en la web. Detecta errores de ortografía y gramática y te muestra sugerencias que puedes aplicar al instante.

Características:
• Subrayados en tiempo real en campos de texto editables
• Panel lateral con la lista completa de errores
• Atajos: Ctrl + ., flechas para elegir sugerencia, Enter y Esc
• Diccionario personal (exportar/importar) y reglas ignoradas
• Tema claro/oscuro y estadísticas locales de correcciones
• Varios idiomas: español, inglés, francés, alemán y portugués
• Activar o desactivar la extensión por sitio
• Servidor LanguageTool personalizado opcional

Cómo funciona:
1. Escribe en cualquier campo de texto de una página web
2. LinguaCheck analiza el texto con LanguageTool
3. Haz clic en un subrayado o abre el panel lateral
4. Aplica la corrección con un clic

Privacidad:
Solo se revisa el texto que escribes en campos activos. Las preferencias se guardan en tu navegador. Puedes desactivar la extensión en sitios concretos cuando quieras.
```

---

## Detailed description (English)

```
LinguaCheck checks your writing as you type on the web. It finds spelling and grammar mistakes and shows suggestions you can apply right away.

Features:
• Real-time underlines in editable text fields
• Side panel with a full list of issues
• Ctrl + . shortcut to apply the first suggestion
• Personal dictionary and ignorable rules
• Multiple languages: Spanish, English, French, German, and Portuguese
• Enable or disable the extension per website

How it works:
1. Type in any text field on a web page
2. LinguaCheck analyzes the text with LanguageTool
3. Click an underline or open the side panel
4. Apply a fix in one click

Privacy:
Only text you type in active fields is checked. Settings are stored in your browser. You can turn the extension off for specific sites at any time.
```

---

## Una sola finalidad (Single purpose)

**Español:**
```
Corregir errores de ortografía y gramática en tiempo real mientras el usuario escribe en campos de texto de páginas web, mostrando sugerencias que el usuario puede aplicar.
```

**English:**
```
Check spelling and grammar in real time as the user types in web text fields, and show suggestions the user can apply.
```

---

## Código remoto (Remote code)

**Respuesta:** No, no estoy usando Código remoto

**Justificación (si piden texto):**
```
La extensión no ejecuta código remoto. Toda la lógica está empaquetada en la extensión. Solo se envían peticiones HTTPS a la API de LanguageTool para obtener sugerencias en JSON.
```

---

## Categoría
Productividad

## URL de política de privacidad
```
https://joelng25.github.io/lingua-check/
```

Contacto: joelnogao625@gmail.com

---

## Justificación de permisos

| Permiso | Motivo |
|---------|--------|
| `storage` | Guardar idioma, diccionario, reglas ignoradas y sitios desactivados |
| `tabs` | Mostrar contador de errores en el icono por pestaña |
| `sidePanel` | Panel lateral con lista de errores |
| `scripting` | Integración con editores web que cargan en iframes |
| `host_permissions: api.languagetool.org` | Obtener sugerencias de corrección |
| `host_permissions: docs.google.com` | Detectar campos de texto en documentos en línea |
| `content_scripts: <all_urls>` | Detectar campos editables donde el usuario escribe |
| `optional_host_permissions: localhost` | Servidor LanguageTool local opcional |

---

## Privacy practices

| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas datos? | Sí |
| Website content | Sí — texto en campos editables activos |
| Datos personales identificables | No |
| Uso | Funcionalidad de la extensión |
| ¿Terceros? | Sí — LanguageTool API |
| ¿Se venden datos? | No |

---

## Qué NO poner en el listing (causa rechazo)

❌ Listas de plataformas: Gmail, Google Docs, LinkedIn, X, Slack, Reddit, Discord, WhatsApp  
❌ "Compatible con todas las webs populares"  
❌ Palabras clave repetidas: grammar grammar spell check corrector  
❌ Comparaciones: "como Grammarly", "mejor que LanguageTool"

✅ Describe qué hace la extensión, no dónde funciona  
✅ Menciona "campos de texto en la web" en lugar de nombres de sitios

---

## Notas de versión (v1.0.3 — reenvío)

```
Corrección de metadatos del listing según políticas de Chrome Web Store.
```
