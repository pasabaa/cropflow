# Cropflow — Recortador y Optimizador HD para Aniflow

Aplicación web moderna y ultra rápida construida con **Vite**, **React 19**, **TypeScript** y **Tailwind CSS v4** para recortar, optimizar y preparar banners y portadas con precisión milimétrica y máxima calidad visual.

---

## 🚀 Características Principales

1. **Formatos y Proporciones Oficiales**:
   - **Aniflow Banner**: `1900 x 400` px (proporción panorámica 4.75:1 para catálogo).
   - **Aniflow Poster**: `600 x 900` px (portada vertical 2:3).
   - **Full HD 16:9**: `1920 x 1080` px (estándar para YouTube / wallpapers).
   - **Cuadrado 1:1**: `800 x 800` px (avatares / iconos).
   - **Twitter / X Header**: `1500 x 500` px.
   - **Recorte Libre**: Sin bloqueo de proporción.

2. **Carga Rápida y Flexible de Imágenes**:
   - **Arrastrar y soltar (Drag & Drop)** directo en la pantalla.
   - **Pegado instantáneo desde el portapapeles**: presiona `Ctrl + V` en cualquier momento con una captura de pantalla copiada.
   - **Carga directa por URL**: pega enlaces de CDN (`cdn.aniflow.net`), AniList o cualquier web.
   - **Selector de archivos locales**: soporte para PNG, JPG, WebP, AVIF.

3. **Motor de Calidad HD y Remuestreo**:
   - **Cero pérdida de resolución**: recorta a partir de los píxeles reales de la imagen original sin compresión prematura.
   - **Remuestreo Bicúbico / Lanczos** de alta precisión activado en Canvas (`imageSmoothingQuality = "high"`).

4. **Filtros de Convolución y Mejora (HD Studio)**:
   - **✨ Anime Pop**: Realza colores vivos de animación, contraste y nitidez en líneas de personajes.
   - **🔍 Super Nítido (Unsharp Mask)**: Convolución laplaciana 3x3 que elimina el desenfoque y artefactos de compresión de trailers de YouTube.
   - **🎬 Cinemático**: Contraste y profundidad dramática para fondos.
   - **Ajustes manuales**: Sliders de Nitidez (0-80%), Vibrancia de color, Brillo y Contraste.

5. **Opciones de Exportación**:
   - Descarga en **JPG** (calidad personalizable 90-100%), **PNG** (100% sin pérdida) o **WebP**.
   - Botón **"Copiar imagen"** para pegar directamente en Photoshop, Discord o el Admin de Aniflow sin guardar en disco.
   - **Vista Previa HD** en modal con estimación de tamaño de archivo (KB / MB).

---

## 🛠️ Instalación y Uso

### Iniciar el servidor de desarrollo en Fish Shell:
```fish
cd /home/pablos/Proyectos/cropflow
pnpm dev
```

Abre en tu navegador la URL que muestra Vite (usualmente `http://localhost:5173`).

### Compilar para producción:
```fish
pnpm build
pnpm preview
```
