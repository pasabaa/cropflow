import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Point, Area } from "react-easy-crop";
import {
  Upload,
  Link as LinkIcon,
  Download,
  Copy,
  Check,
  RotateCw,
  ZoomIn,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Trash2,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { CROP_PRESETS } from "./types/presets";
import type { CropPreset } from "./types/presets";
import {
  getCroppedImg,
  exportCanvasAsBlob,
  formatFileSize,
  downloadBlob,
  copyBlobToClipboard,
} from "./utils/cropImage";
import { DEFAULT_ENHANCEMENT, ENHANCEMENT_PRESETS } from "./utils/imageEnhance";
import type { EnhancementOptions } from "./utils/imageEnhance";

export default function App() {
  // Estado de la Imagen
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("anime-crop");
  const [origDimensions, setOrigDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Estados de Recorte (react-easy-crop)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<CropPreset>(
    CROP_PRESETS[0],
  ); // Por defecto Aniflow Banner 1900x400

  // Mejoras y Filtros
  const [selectedEnhancePreset, setSelectedEnhancePreset] =
    useState<string>("none");
  const [enhancements, setEnhancements] =
    useState<EnhancementOptions>(DEFAULT_ENHANCEMENT);
  const [showAdvancedEnhance, setShowAdvancedEnhance] = useState(false);

  // Exportación
  const [exportFormat, setExportFormat] = useState<
    "image/jpeg" | "image/png" | "image/webp"
  >("image/jpeg");
  const [exportQuality, setExportQuality] = useState<number>(0.95);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Vista Previa Modal
  const [previewBlob, setPreviewBlob] = useState<{
    url: string;
    size: number;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Drag & Drop y Carga por URL
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Manejo de archivo seleccionado
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("El archivo seleccionado no es una imagen válida.");
      return;
    }
    setErrorMsg(null);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setImageName(cleanName);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageSrc(result);
      // Obtener dimensiones originales
      const img = new Image();
      img.onload = () => {
        setOrigDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // 2. Manejo de Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // 3. Pegar directamente del portapapeles (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith("image/")) {
          e.preventDefault();
          handleFile(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // 4. Cargar imagen por URL
  const handleLoadFromUrl = async () => {
    if (!urlInput.trim()) return;
    setIsLoadingUrl(true);
    setErrorMsg(null);
    try {
      // Intentar cargar la imagen directamente
      const testImg = new Image();
      testImg.crossOrigin = "anonymous";
      testImg.onload = () => {
        setImageSrc(urlInput.trim());
        setOrigDimensions({
          width: testImg.naturalWidth,
          height: testImg.naturalHeight,
        });
        // Extraer nombre de la url
        try {
          const u = new URL(urlInput.trim());
          const pathname = u.pathname;
          const slugCandidate =
            pathname
              .split("/")
              .pop()
              ?.replace(/\.[^/.]+$/, "") || "anime-banner";
          setImageName(slugCandidate);
        } catch {
          setImageName("anime-url-crop");
        }
        setIsLoadingUrl(false);
      };
      testImg.onerror = async () => {
        // Si falla por CORS directo, intentar proxy fetch o aviso
        try {
          const res = await fetch(urlInput.trim());
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setImageSrc(objUrl);
          setImageName("anime-url-crop");
          setIsLoadingUrl(false);
        } catch {
          setErrorMsg(
            "La URL tiene restricciones de seguridad (CORS). Puedes hacer clic derecho en la imagen original, 'Copiar imagen' y presionar Ctrl+V aquí.",
          );
          setIsLoadingUrl(false);
        }
      };
      testImg.src = urlInput.trim();
    } catch {
      setErrorMsg("URL inválida.");
      setIsLoadingUrl(false);
    }
  };

  // 5. Callback de recorte de react-easy-crop
  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 6. Selección de preset de mejora
  const handleSelectEnhancePreset = (presetId: string) => {
    setSelectedEnhancePreset(presetId);
    const found = ENHANCEMENT_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setEnhancements({ ...found.options });
    }
  };

  // 7. Generar el Canvas recortado y procesado
  const generateFinalCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!imageSrc || !croppedAreaPixels) return null;
    const target =
      selectedPreset.width && selectedPreset.height
        ? { width: selectedPreset.width, height: selectedPreset.height }
        : undefined;

    const res = await getCroppedImg(
      imageSrc,
      croppedAreaPixels,
      target,
      enhancements,
    );
    return res.canvas;
  };

  // 8. Descargar Imagen
  const handleDownload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const canvas = await generateFinalCanvas();
      if (!canvas) return;

      const blob = await exportCanvasAsBlob(
        canvas,
        exportFormat,
        exportQuality,
      );
      const ext =
        exportFormat === "image/png"
          ? "png"
          : exportFormat === "image/webp"
            ? "webp"
            : "jpg";
      const filename = `${imageName}_${canvas.width}x${canvas.height}.${ext}`;

      downloadBlob(blob, filename);
    } catch (err: any) {
      console.error("Error descargando imagen:", err);
      setErrorMsg("Ocurrió un error al procesar el recorte.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 9. Copiar al Portapapeles
  const handleCopyClipboard = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const canvas = await generateFinalCanvas();
      if (!canvas) return;

      const blob = await exportCanvasAsBlob(canvas, "image/png", 1.0);
      const success = await copyBlobToClipboard(blob);
      if (success) {
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      } else {
        setErrorMsg("Tu navegador no permitió copiar la imagen directamente.");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 10. Abrir modal de vista previa
  const handleOpenPreview = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const canvas = await generateFinalCanvas();
      if (!canvas) return;

      const blob = await exportCanvasAsBlob(
        canvas,
        exportFormat,
        exportQuality,
      );
      const url = URL.createObjectURL(blob);
      setPreviewBlob({ url, size: blob.size });
      setShowPreviewModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/20">
      {/* ── BARRA SUPERIOR (HEADER) ── */}
      <header className="h-14 border-b border-white/8 bg-[#0c0d14]/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
            <ImageIcon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Cropflow
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                HD Studio
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Recorte panorámico y optimización de calidad sin pérdida para
              Aniflow
            </p>
          </div>
        </div>

        {imageSrc && (
          <div className="flex items-center gap-3">
            {origDimensions && (
              <span className="text-[11px] font-mono text-zinc-400 hidden md:inline-block bg-zinc-900/80 px-2 py-1 rounded border border-white/6">
                Fuente: {origDimensions.width} × {origDimensions.height} px
              </span>
            )}
            <button
              onClick={() => {
                setImageSrc(null);
                setOrigDimensions(null);
                setPreviewBlob(null);
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-rose-400 px-2.5 py-1.5 rounded-md hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="size-3.5" />
              <span>Cambiar imagen</span>
            </button>
          </div>
        )}
      </header>

      {/* ── ALERTA DE ERROR SI EXISTE ── */}
      {errorMsg && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!imageSrc ? (
          /* ── PANTALLA DE CARGA / DROP ZONE ── */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-xl w-full space-y-6">
              {/* Zona Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                    : "border-white/12 bg-[#0f1018] hover:border-white/25 hover:bg-[#12131d]"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/bmp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <Upload className="size-7" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Arrastra una imagen o haz clic para subir
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                  Soporta PNG, JPG, WebP o pega directamente desde tu
                  portapapeles con{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/1 text-[10px] font-mono">
                    Ctrl + V
                  </kbd>
                </p>
                <span className="inline-flex items-center text-xs text-indigo-400 font-medium">
                  Explorar archivos locales →
                </span>
              </div>

              {/* Separador */}
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <div className="h-px bg-white/8 flex-1" />
                <span>o carga directamente mediante URL</span>
                <div className="h-px bg-white/8 flex-1" />
              </div>

              {/* Input URL */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="size-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLoadFromUrl()}
                    placeholder="https://cdn.aniflow.net/banners/... o AniList URL"
                    className="w-full bg-[#10111a] border border-white/1 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <button
                  type="button"
                  disabled={isLoadingUrl || !urlInput.trim()}
                  onClick={handleLoadFromUrl}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
                >
                  {isLoadingUrl ? "Cargando..." : "Cargar URL"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── PANTALLA DE EDICIÓN Y RECORTE ── */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LADO IZQUIERDO: VISOR Y CROPPER */}
            <div className="flex-1 flex flex-col bg-[#06070a] relative overflow-hidden">
              {/* Barra de herramientas sobre el Cropper */}
              <div className="h-11 border-b border-white/6 bg-[#0c0d14]/70 backdrop-blur-sm px-4 flex items-center justify-between text-xs text-zinc-400 z-10">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <span>Recorte:</span>
                    <span className="text-indigo-400 font-semibold">
                      {selectedPreset.name}
                    </span>
                  </span>
                  {selectedPreset.width && selectedPreset.height && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      ({selectedPreset.width} × {selectedPreset.height} px)
                    </span>
                  )}
                </div>

                {/* Controles de Zoom y Rotación */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <ZoomIn className="size-3.5 text-zinc-500" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-24 accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[11px] font-mono w-8">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>

                  <button
                    title="Rotar 90°"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    <RotateCw className="size-3.5" />
                  </button>

                  <button
                    title="Restablecer vista"
                    onClick={() => {
                      setZoom(1);
                      setRotation(0);
                    }}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Área del Cropper */}
              <div className="flex-1 relative crop-container">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={selectedPreset.aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={true}
                />
              </div>

              {/* Barra inferior informativa */}
              <div className="h-9 border-t border-white/6 bg-[#0c0d14]/70 px-4 flex items-center justify-between text-[11px] text-zinc-500">
                <span>
                  Usa la rueda del ratón o el pellizco táctil para hacer zoom
                </span>
                {croppedAreaPixels && (
                  <span className="font-mono text-zinc-400">
                    Área seleccionada: {Math.round(croppedAreaPixels.width)} ×{" "}
                    {Math.round(croppedAreaPixels.height)} px
                  </span>
                )}
              </div>
            </div>

            {/* LADO DERECHO: PANEL DE PRESETS, FILTROS Y EXPORTACIÓN */}
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0b0c13] flex flex-col overflow-y-auto">
              <div className="p-5 space-y-6 flex-1">
                {/* 1. SELECCIÓN DE FORMATO / PRESET */}
                <div>
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2.5">
                    1. Formato de Recorte
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CROP_PRESETS.map((p) => {
                      const isSelected = selectedPreset.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedPreset(p);
                            setZoom(1);
                          }}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600/15 border-indigo-500 text-white shadow-sm"
                              : "bg-[#11121b] border-white/[0.06] text-zinc-400 hover:border-white/[0.15] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">
                              {p.name}
                            </span>
                            {p.badge && (
                              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
                                {p.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block leading-tight">
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. MEJORA Y NITIDEZ DE IMAGEN (HD UPGRADE) */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0f1019] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Sparkles className="size-3.5 text-indigo-400" />
                      <span>Mejora de Imagen HD</span>
                    </div>
                    <button
                      onClick={() =>
                        setShowAdvancedEnhance(!showAdvancedEnhance)
                      }
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="size-3" />
                      <span>
                        {showAdvancedEnhance
                          ? "Ocultar sliders"
                          : "Ajustes finos"}
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Aplica filtros de convolución matemática para restaurar
                    bordes nítidos y colores vivos en capturas de tráilers.
                  </p>

                  {/* Botones de presets de mejora */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {ENHANCEMENT_PRESETS.map((ep) => {
                      const isActive = selectedEnhancePreset === ep.id;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => handleSelectEnhancePreset(ep.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                            isActive
                              ? "bg-indigo-600/20 border-indigo-500/60 text-white font-medium"
                              : "bg-[#141522] border-white/[0.04] text-zinc-400 hover:text-white"
                          }`}
                        >
                          <div className="font-medium text-[11px]">
                            {ep.name}
                          </div>
                          <div className="text-[9px] text-zinc-500 truncate">
                            {ep.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sliders manuales expandibles */}
                  {showAdvancedEnhance && (
                    <div className="pt-3 border-t border-white/[0.06] space-y-3">
                      {/* Nitidez */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Nitidez (Unsharp Mask)</span>
                          <span className="font-mono text-indigo-400">
                            {Math.round(enhancements.sharpen * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={0.8}
                          step={0.05}
                          value={enhancements.sharpen}
                          onChange={(e) => {
                            setSelectedEnhancePreset("custom");
                            setEnhancements((prev) => ({
                              ...prev,
                              sharpen: Number(e.target.value),
                            }));
                          }}
                          className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Vibrancia */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Vibrancia (Anime Colors)</span>
                          <span className="font-mono text-indigo-400">
                            {enhancements.vibrance > 0
                              ? `+${enhancements.vibrance}`
                              : enhancements.vibrance}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={40}
                          step={5}
                          value={enhancements.vibrance}
                          onChange={(e) => {
                            setSelectedEnhancePreset("custom");
                            setEnhancements((prev) => ({
                              ...prev,
                              vibrance: Number(e.target.value),
                            }));
                          }}
                          className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Contraste */}
                      <div>
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Contraste</span>
                          <span className="font-mono text-indigo-400">
                            {enhancements.contrast > 0
                              ? `+${enhancements.contrast}`
                              : enhancements.contrast}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-30}
                          max={40}
                          step={5}
                          value={enhancements.contrast}
                          onChange={(e) => {
                            setSelectedEnhancePreset("custom");
                            setEnhancements((prev) => ({
                              ...prev,
                              contrast: Number(e.target.value),
                            }));
                          }}
                          className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. FORMATO Y CALIDAD DE SALIDA */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-white uppercase tracking-wider">
                    2. Formato de Exportación
                  </label>

                  <div className="grid grid-cols-3 gap-1.5 bg-[#12131e] p-1 rounded-xl border border-white/[0.06]">
                    <button
                      onClick={() => setExportFormat("image/jpeg")}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        exportFormat === "image/jpeg"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      JPG (95%)
                    </button>
                    <button
                      onClick={() => setExportFormat("image/png")}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        exportFormat === "image/png"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      PNG (Sin pérdida)
                    </button>
                    <button
                      onClick={() => setExportFormat("image/webp")}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        exportFormat === "image/webp"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      WebP
                    </button>
                  </div>

                  {exportFormat !== "image/png" && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Calidad de compresión</span>
                        <span className="font-mono text-zinc-300">
                          {Math.round(exportQuality * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.8}
                        max={1.0}
                        step={0.02}
                        value={exportQuality}
                        onChange={(e) =>
                          setExportQuality(Number(e.target.value))
                        }
                        className="w-full accent-indigo-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Nombre sugerido del archivo */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nombre del archivo de descarga:
                  </label>
                  <input
                    type="text"
                    value={imageName}
                    onChange={(e) => setImageName(e.target.value)}
                    className="w-full bg-[#11121d] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* BOTONES DE ACCIÓN FIJADOS AL FONDO */}
              <div className="p-4 border-t border-white/[0.08] bg-[#0c0d15] space-y-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDownload}
                  className="w-full h-11 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.99]"
                >
                  <Download className="size-4" />
                  <span>
                    {isProcessing
                      ? "Procesando recorte..."
                      : "Descargar Imagen Recortada"}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleCopyClipboard}
                    className="h-9 bg-[#171825] hover:bg-[#1d1f30] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copiar imagen</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleOpenPreview}
                    className="h-9 bg-[#171825] hover:bg-[#1d1f30] border border-white/[0.08] text-zinc-300 hover:text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Vista Previa HD</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DE VISTA PREVIA HD ── */}
      {showPreviewModal && previewBlob && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f1019] border border-white/[0.1] rounded-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">
                  Vista Previa de Exportación
                </span>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                  {formatFileSize(previewBlob.size)}
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-zinc-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-[#07080b]">
              <img
                src={previewBlob.url}
                alt="Vista previa HD"
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-white/[0.06] shadow-2xl"
              />
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#0c0d15] flex justify-end gap-2">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  setShowPreviewModal(false);
                }}
                className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Descargar ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
