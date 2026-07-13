# Publicar la política de privacidad (GitHub Pages)

## URL final

Si tu repositorio en GitHub se llama `lingua-check` y tu usuario es `TU_USUARIO`:

```
https://TU_USUARIO.github.io/lingua-check/
```

Esa es la URL que debes pegar en Chrome Web Store → **Privacy policy**.

## Pasos

1. Crea un repositorio en GitHub llamado `lingua-check` (público)
2. Sube el proyecto o al menos la carpeta `docs/`
3. En GitHub: **Settings → Pages**
4. **Source:** Deploy from branch
5. **Branch:** `main` (o `master`) → carpeta **`/docs`**
6. Guarda y espera 1–2 minutos
7. Abre la URL en el navegador y comprueba que carga la política

## Comandos (si aún no has subido el repo)

```powershell
cd C:\Users\joeln\lingua-check
git add docs/
git commit -m "Add privacy policy for GitHub Pages"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/lingua-check.git
git push -u origin main
```

Luego activa Pages como se indica arriba.

## Chrome Web Store — Privacy practices

Responde así en el dashboard:

| Pregunta | Respuesta |
|----------|-----------|
| ¿Recopilas datos de usuario? | **Sí** |
| Website content | **Sí** — texto que el usuario escribe en campos editables |
| Personally identifiable info | **No** |
| ¿Para qué? | Funcionalidad de la extensión (corrección ortográfica) |
| ¿Se comparte con terceros? | **Sí** — LanguageTool API procesa el texto |
| ¿Se venden datos? | **No** |
| Privacy policy URL | `https://TU_USUARIO.github.io/lingua-check/` |

## Contacto en la política

Email configurado: **joelnogao625@gmail.com**
