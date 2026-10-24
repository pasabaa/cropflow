// src/types/presets.ts

export interface CropPreset {
  id: string;
  name: string;
  badge?: string;
  aspect?: number;
  width?: number;
  height?: number;
  description: string;
}

export const CROP_PRESETS: CropPreset[] = [
  {
    id: "aniflow-banner",
    name: "Aniflow Banner",
    badge: "Oficial",
    aspect: 1900 / 400, // 4.75
    width: 1900,
    height: 400,
    description: "1900 x 400 px • Proporción 4.75:1 para catálogo",
  },
  {
    id: "aniflow-poster",
    name: "Aniflow Poster",
    badge: "Póster",
    aspect: 2 / 3,
    width: 600,
    height: 900,
    description: "600 x 900 px • Portada vertical 2:3",
  },
  {
    id: "video-16-9",
    name: "Full HD 16:9",
    aspect: 16 / 9,
    width: 1920,
    height: 1080,
    description: "1920 x 1080 px • Miniaturas y fondos estándar",
  },
  {
    id: "square-1-1",
    name: "Cuadrado 1:1",
    aspect: 1 / 1,
    width: 800,
    height: 800,
    description: "800 x 800 px • Avatares y perfiles",
  },
  {
    id: "twitter-header",
    name: "Twitter / X",
    aspect: 3 / 1,
    width: 1500,
    height: 500,
    description: "1500 x 500 px • Encabezado de perfil",
  },
  {
    id: "freeform",
    name: "Recorte Libre",
    description: "Sin restricción de proporción o tamaño fijo",
  },
];
