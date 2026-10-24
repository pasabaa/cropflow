// src/utils/cropImage.ts
import { applyEnhancementsToImageData, EnhancementOptions, DEFAULT_ENHANCEMENT } from "./imageEnhance";

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Necesario para evitar CORS en imágenes externas
    image.src = url;
  });
}

/**
 * Recorta la imagen a partir de las coordenadas reales en píxeles de la imagen original
 * y aplica las opciones de mejoramiento y reescalado de alta fidelidad.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  targetDimensions?: { width: number; height: number },
  enhancements: EnhancementOptions = DEFAULT_ENHANCEMENT
): Promise<{ blob: Blob; url: string; canvas: HTMLCanvasElement }> {
  const image = await createImage(imageSrc);

  // Dimensiones finales del canvas
  const finalWidth = targetDimensions?.width || pixelCrop.width;
  const finalHeight = targetDimensions?.height || pixelCrop.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(finalWidth);
  canvas.height = Math.round(finalHeight);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo obtener el contexto 2D del Canvas");
  }

  // Máxima calidad de remuestreo (Lanczos/Bicubic según navegador)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Dibujar el recorte exacto de la imagen original en el canvas destino
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Aplicar mejoras (nitidez / color) si se configuraron
  const hasEnhancements =
    enhancements.sharpen > 0 ||
    enhancements.brightness !== 0 ||
    enhancements.contrast !== 0 ||
    enhancements.saturation !== 0 ||
    enhancements.vibrance !== 0;

  if (hasEnhancements) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const enhancedData = applyEnhancementsToImageData(imageData, enhancements);
    ctx.putImageData(enhancedData, 0, 0);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error al convertir Canvas a Blob"));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, canvas });
      },
      "image/jpeg",
      0.95 // Calidad alta sin compresión visible
    );
  });
}

/**
 * Exporta un canvas al formato y calidad solicitada (PNG, JPG, WebP)
 */
export function exportCanvasAsBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  quality: number = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Error generando archivo"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    // Portapapeles solo soporta image/png en la mayoría de navegadores modernos
    let pngBlob = blob;
    if (blob.type !== "image/png") {
      // Convertir a PNG en memoria para clipboard
      const img = await createImage(URL.createObjectURL(blob));
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error("Error copiando imagen al portapapeles:", err);
    return false;
  }
}
