"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Crop } from "lucide-react"

export type AspectRatio = "free" | "3:4" | "1:1" | "16:9" | "4:3"

interface ImageCropperDialogProps {
  open: boolean
  imageFile: File | null
  aspectRatio?: AspectRatio
  onConfirm: (croppedBlob: Blob, previewUrl: string) => void
  onCancel: () => void
}

const RATIOS: { label: string; value: AspectRatio; ratio: number | null }[] = [
  { label: "Free",   value: "free",  ratio: null },
  { label: "3 : 4",  value: "3:4",   ratio: 3 / 4 },
  { label: "1 : 1",  value: "1:1",   ratio: 1 },
  { label: "4 : 3",  value: "4:3",   ratio: 4 / 3 },
  { label: "16 : 9", value: "16:9",  ratio: 16 / 9 },
]

interface CropBox { x: number; y: number; w: number; h: number }

const MIN_SIZE = 40
// Zoom slider range expressed as a multiplier of fitScale
const ZOOM_STEP = 0.12
const ZOOM_MAX_MULTIPLIER = 5   // user can zoom up to 5× the fit scale

export default function ImageCropperDialog({
  open,
  imageFile,
  aspectRatio = "free",
  onConfirm,
  onCancel,
}: ImageCropperDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)
  const imgElRef     = useRef<HTMLImageElement | null>(null)

  const [imgSrc,    setImgSrc]    = useState<string>("")
  const [imgLoaded, setImgLoaded] = useState(false)
  // fitScale: the scale that makes the image exactly fit (contain) inside the container
  const [fitScale,  setFitScale]  = useState(1)
  // zoom is the current scale; never goes below fitScale
  const [zoom,      setZoom]      = useState(1)
  const [panX,      setPanX]      = useState(0)
  const [panY,      setPanY]      = useState(0)
  const [ratio,     setRatio]     = useState<AspectRatio>(aspectRatio)
  const [cropBox,   setCropBox]   = useState<CropBox>({ x: 0, y: 0, w: 200, h: 200 })
  const [confirming, setConfirming] = useState(false)

  const numericRatio = RATIOS.find(r => r.value === ratio)?.ratio ?? null

  // ── Compute the scale that fits the full image inside the container ────────
  const computeFitScale = useCallback((img: HTMLImageElement): number => {
    const c = containerRef.current
    if (!c) return 1
    const scaleX = c.clientWidth  / img.naturalWidth
    const scaleY = c.clientHeight / img.naturalHeight
    return Math.min(scaleX, scaleY, 1) // never upscale; cap at 1
  }, [])

  // ── Load image ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !imageFile) { setImgLoaded(false); return }
    setImgLoaded(false)
    setPanX(0); setPanY(0)
    const url = URL.createObjectURL(imageFile)
    setImgSrc(url)
    const img = new Image()
    img.onload = () => {
      imgElRef.current = img
      // We need the container to have rendered, so defer one frame
      requestAnimationFrame(() => {
        const fs = computeFitScale(img)
        setFitScale(fs)
        setZoom(fs)
        setImgLoaded(true)
      })
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [open, imageFile, computeFitScale])

  // ── Initialise crop box (centred, 82% of container) ───────────────────────
  const initCropBox = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const W = c.clientWidth
    const H = c.clientHeight
    let w: number, h: number

    if (numericRatio) {
      if (W / H > numericRatio) { h = H * 0.82; w = h * numericRatio }
      else                      { w = W * 0.82; h = w / numericRatio }
    } else {
      w = W * 0.82; h = H * 0.82
    }
    w = Math.round(w); h = Math.round(h)
    setCropBox({ x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h })
  }, [numericRatio])

  useEffect(() => { if (imgLoaded) initCropBox() }, [imgLoaded, initCropBox])

  // Reset zoom + pan when aspect ratio changes
  useEffect(() => {
    if (!imgLoaded) return
    setPanX(0)
    setPanY(0)
    if (imgElRef.current) {
      const fs = computeFitScale(imgElRef.current)
      setFitScale(fs)
      setZoom(fs)
    }
    initCropBox()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio])

  // ── Clamp crop box inside container ───────────────────────────────────────
  const clampBox = useCallback((b: CropBox): CropBox => {
    const c = containerRef.current
    if (!c) return b
    const CW = c.clientWidth, CH = c.clientHeight
    let { x, y, w, h } = b
    w = Math.max(MIN_SIZE, w); h = Math.max(MIN_SIZE, h)
    if (numericRatio) h = Math.round(w / numericRatio)
    if (w > CW) { w = CW; if (numericRatio) h = Math.round(w / numericRatio) }
    if (h > CH) { h = CH; if (numericRatio) w = Math.round(h * numericRatio) }
    x = Math.max(0, Math.min(x, CW - w))
    y = Math.max(0, Math.min(y, CH - h))
    return { x, y, w, h }
  }, [numericRatio])

  // ── Image panning ──────────────────────────────────────────────────────────
  const panDrag  = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  const onImgPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    panDrag.current = true
    panStart.current = { x: e.clientX - panX, y: e.clientY - panY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onImgPointerMove = (e: React.PointerEvent) => {
    if (!panDrag.current) return
    setPanX(e.clientX - panStart.current.x)
    setPanY(e.clientY - panStart.current.y)
  }
  const onImgPointerUp = () => { panDrag.current = false }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(fitScale, Math.min(fitScale * ZOOM_MAX_MULTIPLIER, z - e.deltaY * 0.001)))
  }

  // ── Crop box dragging ──────────────────────────────────────────────────────
  const boxDrag  = useRef(false)
  const boxStart = useRef({ x: 0, y: 0, bx: 0, by: 0 })

  const onBoxPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    boxDrag.current = true
    boxStart.current = { x: e.clientX, y: e.clientY, bx: cropBox.x, by: cropBox.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onBoxPointerMove = (e: React.PointerEvent) => {
    if (!boxDrag.current) return
    const dx = e.clientX - boxStart.current.x
    const dy = e.clientY - boxStart.current.y
    setCropBox(prev => clampBox({ ...prev, x: boxStart.current.bx + dx, y: boxStart.current.by + dy }))
  }
  const onBoxPointerUp = () => { boxDrag.current = false }

  // ── Corner / edge handles ──────────────────────────────────────────────────
  type HandleId = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
  const handleDrag  = useRef<HandleId | null>(null)
  const handleStart = useRef({ x: 0, y: 0, box: { x: 0, y: 0, w: 0, h: 0 } })

  const onHandlePointerDown = (e: React.PointerEvent, id: HandleId) => {
    e.stopPropagation(); e.preventDefault()
    handleDrag.current  = id
    handleStart.current = { x: e.clientX, y: e.clientY, box: { ...cropBox } }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const id = handleDrag.current
    if (!id) return
    const dx = e.clientX - handleStart.current.x
    const dy = e.clientY - handleStart.current.y
    const { x: ox, y: oy, w: ow, h: oh } = handleStart.current.box
    let x = ox, y = oy, w = ow, h = oh

    if (id.includes("e")) w = ow + dx
    if (id.includes("s")) h = oh + dy
    if (id.includes("w")) { x = ox + dx; w = ow - dx }
    if (id.includes("n")) { y = oy + dy; h = oh - dy }

    if (numericRatio) {
      h = Math.round(w / numericRatio)
      if (id.includes("n")) y = oy + oh - h
    }

    setCropBox(clampBox({ x, y, w, h }))
  }

  const onHandlePointerUp = () => { handleDrag.current = null }

  // ── Confirm: render crop via canvas ───────────────────────────────────────
  const handleConfirm = async () => {
    const img = imgElRef.current
    const c   = containerRef.current
    if (!img || !c) return
    setConfirming(true)

    const CW = c.clientWidth, CH = c.clientHeight

    // Image display size inside container (natural size × zoom, centred + panned)
    const displayW = img.naturalWidth  * zoom
    const displayH = img.naturalHeight * zoom
    const imgLeft  = (CW - displayW) / 2 + panX
    const imgTop   = (CH - displayH) / 2 + panY

    const scaleX = img.naturalWidth  / displayW
    const scaleY = img.naturalHeight / displayH
    const sx = Math.max(0, (cropBox.x - imgLeft) * scaleX)
    const sy = Math.max(0, (cropBox.y - imgTop)  * scaleY)
    const sw = Math.min(img.naturalWidth  - sx, cropBox.w * scaleX)
    const sh = Math.min(img.naturalHeight - sy, cropBox.h * scaleY)

    if (sw <= 0 || sh <= 0) { setConfirming(false); return }

    const canvas = document.createElement("canvas")
    canvas.width  = Math.round(sw)
    canvas.height = Math.round(sh)
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(blob => {
      if (!blob) { setConfirming(false); return }
      onConfirm(blob, URL.createObjectURL(blob))
      setConfirming(false)
    }, "image/jpeg", 0.92)
  }

  if (!open) return null

  const { x: bx, y: by, w: bw, h: bh } = cropBox

  const cornerCursor: Record<HandleId, string> = {
    nw: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", se: "nwse-resize",
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  }

  // Zoom slider: map fitScale…(fitScale × ZOOM_MAX_MULTIPLIER) to 0…1
  const zoomMin = fitScale
  const zoomMax = fitScale * ZOOM_MAX_MULTIPLIER
  const zoomPct = Math.max(0, Math.min(1, (zoom - zoomMin) / (zoomMax - zoomMin)))

  const handleReset = () => {
    setPanX(0); setPanY(0)
    if (imgElRef.current) {
      const fs = computeFitScale(imgElRef.current)
      setFitScale(fs)
      setZoom(fs)
    }
    initCropBox()
  }

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="bg-[#050505] border-white/10 text-white max-w-3xl w-full p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-8 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <Crop size={14} className="text-gray-500" />
            <DialogTitle className="font-serif text-lg uppercase tracking-widest font-light">Crop &amp; Edit</DialogTitle>
          </div>
        </DialogHeader>

        {/* Aspect ratio selector */}
        <div className="flex gap-2 px-8 pt-4 flex-wrap">
          {RATIOS.map(r => (
            <button
              key={r.value}
              onClick={() => setRatio(r.value)}
              className={`px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-all ${
                ratio === r.value
                  ? "bg-white text-black border-white"
                  : "border-white/15 text-gray-500 hover:border-white/40 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* ── CANVAS AREA ─────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative mx-8 mt-4 bg-[#0a0a0a] overflow-hidden select-none"
          style={{ height: 390 }}
          onWheel={onWheel}
        >
          {/* Loading spinner */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="w-6 h-6 border border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}

          {/* Image layer */}
          {imgLoaded && (
            <div
              className="absolute inset-0 z-0 cursor-move"
              onPointerDown={onImgPointerDown}
              onPointerMove={onImgPointerMove}
              onPointerUp={onImgPointerUp}
              onPointerLeave={onImgPointerUp}
            >
              <img
                ref={imgRef}
                src={imgSrc}
                alt="crop preview"
                draggable={false}
                className="absolute pointer-events-none"
                style={{
                  transformOrigin: "center center",
                  transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${zoom})`,
                  top: "50%", left: "50%",
                  maxWidth: "none",
                  userSelect: "none",
                }}
              />
            </div>
          )}

          {/* Overlay: 4 dimming panels */}
          {imgLoaded && (() => {
            const cW = containerRef.current?.clientWidth  || 0
            const cH = containerRef.current?.clientHeight || 0
            return (
              <>
                <div className="absolute pointer-events-none z-10 bg-black/45"
                  style={{ top: 0, left: 0, right: 0, height: by }} />
                <div className="absolute pointer-events-none z-10 bg-black/45"
                  style={{ top: by + bh, left: 0, right: 0, bottom: 0 }} />
                <div className="absolute pointer-events-none z-10 bg-black/45"
                  style={{ top: by, left: 0, width: bx, height: bh }} />
                <div className="absolute pointer-events-none z-10 bg-black/45"
                  style={{ top: by, left: bx + bw, right: 0, height: bh }} />
              </>
            )
          })()}

          {/* Crop box */}
          {imgLoaded && (
            <div
              className="absolute z-20 cursor-move box-border"
              style={{
                left: bx, top: by, width: bw, height: bh,
                border: "1px solid rgba(255,255,255,0.8)",
              }}
              onPointerDown={onBoxPointerDown}
              onPointerMove={onBoxPointerMove}
              onPointerUp={onBoxPointerUp}
              onPointerLeave={onBoxPointerUp}
            >
              {/* Rule of thirds grid */}
              {[1, 2].map(n => (
                <div key={`rv${n}`} className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${(n / 3) * 100}%`, width: 1, background: "rgba(255,255,255,0.18)" }} />
              ))}
              {[1, 2].map(n => (
                <div key={`rh${n}`} className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${(n / 3) * 100}%`, height: 1, background: "rgba(255,255,255,0.18)" }} />
              ))}

              {/* Corner handles */}
              {(["nw", "ne", "sw", "se"] as HandleId[]).map(id => {
                const isN = id.includes("n"), isW = id.includes("w")
                return (
                  <div
                    key={id}
                    className="absolute z-30"
                    style={{
                      width: 18, height: 18,
                      top:    isN ? -2 : undefined,
                      bottom: !isN ? -2 : undefined,
                      left:   isW ? -2 : undefined,
                      right:  !isW ? -2 : undefined,
                      cursor: cornerCursor[id],
                      background: "transparent",
                    }}
                    onPointerDown={e => onHandlePointerDown(e, id)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                      style={{ transform: isN ? (isW ? "none" : "scaleX(-1)") : (isW ? "scaleY(-1)" : "scale(-1,-1)") }}>
                      <path d="M2 2 L2 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M2 2 L10 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )
              })}

              {/* Edge handles N/S */}
              {(["n", "s"] as HandleId[]).map(id => (
                <div key={id} className="absolute z-30 flex items-center justify-center"
                  style={{
                    left: "50%", transform: "translateX(-50%)",
                    top:    id === "n" ? -5 : undefined,
                    bottom: id === "s" ? -5 : undefined,
                    width: 36, height: 10,
                    cursor: cornerCursor[id],
                  }}
                  onPointerDown={e => onHandlePointerDown(e, id)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                >
                  <div className="w-8 h-1 rounded-full bg-white/70" />
                </div>
              ))}

              {/* Edge handles E/W */}
              {(["e", "w"] as HandleId[]).map(id => (
                <div key={id} className="absolute z-30 flex items-center justify-center"
                  style={{
                    top: "50%", transform: "translateY(-50%)",
                    left:  id === "w" ? -5 : undefined,
                    right: id === "e" ? -5 : undefined,
                    width: 10, height: 36,
                    cursor: cornerCursor[id],
                  }}
                  onPointerDown={e => onHandlePointerDown(e, id)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                >
                  <div className="w-1 h-8 rounded-full bg-white/70" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-4 px-8 pt-3">
          <button
            onClick={() => setZoom(z => Math.max(zoomMin, +(z - ZOOM_STEP).toFixed(2)))}
            className="size-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          >
            <ZoomOut size={14} />
          </button>

          <div
            className="flex-1 max-w-44 relative h-1 bg-white/10 rounded-full cursor-pointer"
            onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              setZoom(+(zoomMin + pct * (zoomMax - zoomMin)).toFixed(3))
            }}
          >
            <div className="absolute h-full bg-white/40 rounded-full" style={{ width: `${zoomPct * 100}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 bg-white rounded-full shadow"
              style={{ left: `${zoomPct * 100}%` }} />
          </div>

          <button
            onClick={() => setZoom(z => Math.min(zoomMax, +(z + ZOOM_STEP).toFixed(2)))}
            className="size-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={handleReset}
            className="size-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
            title="Reset"
          >
            <RotateCcw size={14} />
          </button>

          <span className="text-[9px] uppercase tracking-widest text-gray-600 w-10 text-right tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <p className="text-center text-[8px] uppercase tracking-[0.3em] text-gray-700 mt-2 pb-0">
          Drag image to pan · Drag crop box to reposition · Drag corners to resize · Scroll to zoom
        </p>

        {/* Footer */}
        <DialogFooter className="px-8 py-5 border-t border-white/5 mt-3 flex gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="flex-1 rounded-none border border-white/10 uppercase tracking-widest text-[10px] text-gray-400 hover:text-white hover:bg-white/5 gap-2"
          >
            <X size={12} /> Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!imgLoaded || confirming}
            className="flex-1 bg-white text-black hover:bg-gray-100 rounded-none uppercase tracking-widest text-[10px] transition-all gap-2"
          >
            {confirming
              ? <div className="w-4 h-4 border border-black/30 border-t-black rounded-full animate-spin" />
              : <><Check size={12} /> Apply Crop</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
