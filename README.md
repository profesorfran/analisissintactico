# Analizador Sintáctico (NGLE)

Aplicación web que genera y representa análisis sintácticos según la Nueva Gramática de la Lengua Española empleando la API de Gemini.

## Requisitos

- Node.js 18 o superior
- Una clave API de [Google AI Studio](https://aistudio.google.com/app/apikey)

## Ejecución local

1. Instala dependencias
   ```bash
   npm install
   ```
2. Arranca el entorno de desarrollo
   ```bash
   npm run dev
   ```
3. Abre `http://localhost:3000`
4. Pulsa **Configurar clave API** e introduce tu clave (se guarda en `localStorage` del navegador)

> Sugerencia: también puedes definir `GEMINI_API_KEY` en tu entorno si prefieres no escribir la clave manualmente en cada sesión.

## Generar build de producción

```bash
npm run build
```

El resultado queda en la carpeta `dist/`. Puedes previsualizarlo con:

```bash
npm run preview
```

## Publicar en GitHub Pages

1. Ejecuta `npm run build`
2. Copia el contenido de `dist/` a la rama `gh-pages` (o la rama configurada para Pages)
3. En el repositorio de GitHub, ve a **Settings → Pages** y selecciona la carpeta `/ (root)` de la rama `gh-pages`
4. Espera a que GitHub procese la publicación y abre `https://<tu_usuario>.github.io/analisissintactico/`

> Cada persona que use la versión pública tendrá que introducir su propia clave API de Gemini desde el modal de configuración.

## Scripts disponibles

- `npm run dev` – Vite en modo desarrollo con recarga en caliente
- `npm run build` – Compila la aplicación para producción
- `npm run preview` – Sirve el build generado en local

## Notas de seguridad

- La clave de Gemini nunca se envía a ningún servidor propio. Se utiliza únicamente desde el navegador del usuario.
- Si quieres revocar la clave almacenada, usa el botón **Quitar clave local** dentro de la aplicación.
## Despliegue automático

El repositorio incluye `.github/workflows/deploy.yml`, que construye y publica automáticamente el contenido de `dist/` en GitHub Pages cuando haces push a `main` (o ejecutas la acción manualmente). Si prefieres usar tu propia clave, crea el *secret* `GEMINI_API_KEY` o `VITE_PUBLIC_GEMINI_KEY`; de lo contrario se usará la clave pública incluida.

## Clave API pública

Para que la versión hospedada funcione sin configuración inicial, la aplicación carga por defecto la clave que nos facilitaste. Ten en cuenta que al ser una aplicación frontend cualquier visitante podrá ver dicha clave; considera reemplazarla por otra o rotarla periódicamente si detectas abuso.
