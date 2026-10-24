// src/utils/imageEnhance.ts

export interface EnhancementOptions {
  sharpen: number;      // 0.0 a 1.0 (intensidad del filtro convolucional de nitidez)
  brightness: number;   // -50 a +50 (offset de brillo)
  contrast: number;     // -50 a +50 (contraste porcentual)
  saturation: number;   // -50 a +50 (saturación porcentual)
  vibrance: number;     // -50 a +50 (vibrancia para anime)
}

export const DEFAULT_ENHANCEMENT: EnhancementOptions = {
  sharpen: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
};

export const ENHANCEMENT_PRESETS: {
  id: string;
  name: string;
  desc: string;
  options: EnhancementOptions;
}[] = [
  {
    id: "none",
    name: "Original",
    desc: "Sin filtros, calidad nativa",
    options: { sharpen: 0, brightness: 0, contrast: 0, saturation: 0, vibrance: 0 },
  },
  {
    id: "anime-pop",
    name: "✨ Anime Pop",
    desc: "Realza colores y líneas de animación",
    options: { sharpen: 0.25, brightness: 2, contrast: 8, saturation: 12, vibrance: 15 },
  },
  {
    id: "crisp-hd",
    name: "🔍 Super Nítido",
    desc: "Elimina borrosidad de compresión",
    options: { sharpen: 0.45, brightness: 0, contrast: 5, saturation: 4, vibrance: 5 },
  },
  {
    id: "cinematic",
    name: "🎬 Cinemático",
    desc: "Profundidad y contraste para trailers",
    options: { sharpen: 0.2, brightness: -2, contrast: 15, saturation: 5, vibrance: 8 },
  },
];

/**
 * Aplica convolución 3x3 y ajustes de color sobre ImageData directamente en CPU/Canvas.
 * Operación ultra rápida (~15ms en 1900x400) sin latencia ni librerías pesadas.
 */
export function applyEnhancementsToImageData(
  imageData: ImageData,
  options: EnhancementOptions
): ImageData {
  const { sharpen, brightness, contrast, saturation, vibrance } = options;
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const hasColorAdjust =
    brightness !== 0 || contrast !== 0 || saturation !== 0 || vibrance !== 0;
  const hasSharpen = sharpen > 0.01;

  if (!hasColorAdjust && !hasSharpen) {
    return imageData;
  }

  // 1. Ajustes de Color (Brillo, Contraste, Saturación, Vibrancia)
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const satFactor = 1 + saturation / 100;
  const vibFactor = vibrance / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brillo
    if (brightness !== 0) {
      r += brightness;
      g += brightness;
      b += brightness;
    }

    // Contraste
    if (contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // Saturación & Vibrancia
    if (saturation !== 0 || vibrance !== 0) {
      const max = Math.max(r, g, b);
      const avg = (r + g + b) / 3;
      const amt = ((Math.abs(max - avg) * 2) / 255) * vibFactor;

      const totalSat = satFactor + (1 - amt);

      // Grayscale luminance
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * totalSat;
      g = gray + (g - gray) * totalSat;
      b = gray + (b - gray) * totalSat;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }

  // 2. Convolución de Nitidez (Unsharp Mask)
  if (hasSharpen) {
    const src = new Uint8ClampedArray(data);
    const amount = sharpen; // 0.05 a 0.8
    // Kernel 3x3 laplaciano:
    // [  0, -amount,  0 ]
    // [ -amount, 1 + 4*amount, -amount ]
    // [  0, -amount,  0 ]

    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width * 4;
      const prevRowOffset = (y - 1) * width * 4;
      const nextRowOffset = (y + 1) * width * 4;

      for (let x = 1; x < width - 1; x++) {
        const px = rowOffset + x * 4;
        const pxTop = prevRowOffset + x * 4;
        const pxBottom = nextRowOffset + x * 4;
        const pxLeft = rowOffset + (x - 1) * 4;
        const pxRight = rowOffset + (x + 1) * 4;

        for (let c = 0; c < 3; c++) {
          const center = src[px + c];
          const top = src[pxTop + c];
          const bottom = src[pxBottom + c];
          const left = src[pxLeft + c];
          const right = src[pxRight + c];

          const val =
            center * (1 + 4 * amount) -
            amount * (top + bottom + left + right);

          data[px + c] = Math.min(255, Math.max(0, val));
        }
      }
    }
  }

  return imageData;
}
