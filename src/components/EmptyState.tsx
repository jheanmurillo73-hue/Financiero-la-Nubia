import React, { useRef, useState } from 'react'
import {
  Upload,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Zap,
  HardHat,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'

interface EmptyStateProps {
  onFileSelect: (file: File) => void
  onLoadDemo: () => void
  onLoadRealConexo: () => void
  isReading: boolean
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onFileSelect,
  onLoadDemo,
  onLoadRealConexo,
  isReading,
}) => {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4 sm:py-8">
      {/* Hero Header */}
      <section className="text-center sm:text-left space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#72838c] bg-[#e6edea] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e5a83b]" />
          Separación Financiera: Obras Eléctricas vs Civiles
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-5xl text-[#0b1724] tracking-tight leading-tight">
          Control de actas con <em className="text-[#e5a83b] not-italic">desglose eléctrico</em> y <em className="text-[#4673a7] not-italic">civil</em>.
        </h1>
        <p className="text-sm sm:text-base font-sans text-[#546571] max-w-2xl leading-relaxed">
          Analiza el valor en dinero y porcentaje de las actividades <strong>Eléctricas (Naranja)</strong>, <strong>Obras Civiles (Sin color)</strong> y <strong>Alumbrado Público (Verde)</strong> en cada acta de obra.
        </p>
      </section>

      {/* Featured Callout: Cargar Acta 4 - Conexo La Nubia (Proyecto Real) */}
      <section className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0b1724] to-[#172b3c] text-white shadow-lg border border-[#273e54] flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#e5a83b]/20 text-[#f8c866] text-xs font-mono font-semibold border border-[#e5a83b]/30">
            <Zap size={13} /> Archivo del Proyecto Adjunto
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            Acta 4 · Conexo La Nubia (INELCO)
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[#b3c5d3] leading-relaxed">
            Contrato No. -001-2026: <b>$2.891 Millones COP</b> en costo directo, 4 actas ejecutadas y 107 partidas clasificadas en <b>Eléctrico ($1.432M)</b>, <b>Civil ($1.208M)</b> y <b>Alumbrado ($250M)</b>.
          </p>
        </div>

        <button
          type="button"
          onClick={onLoadRealConexo}
          disabled={isReading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#e5a83b] text-[#0b1724] font-sans font-bold text-sm hover:bg-[#f3b544] transition-all shadow-md active:scale-95 shrink-0"
        >
          <Zap size={18} />
          <span>Cargar Acta 4 Conexo La Nubia</span>
          <ArrowRight size={16} />
        </button>
      </section>

      {/* Main Upload / Drag and Drop Card */}
      <section
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all duration-300 text-center ${
          dragging
            ? 'border-[#2e8564] bg-[#f0faf5] scale-[1.01]'
            : 'border-[#c5d5cf] bg-white/80 hover:border-[#96b8ad] hover:bg-white shadow-sm'
        }`}
      >
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#fff2d8] text-[#b58128] mx-auto flex items-center justify-center shadow-inner">
            <Upload size={24} />
          </div>

          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-[#0b1724]">
              {isReading ? 'Procesando archivo localmente…' : 'O carga tu propio archivo XLSM / XLSX'}
            </h2>
            <p className="text-xs font-sans text-[#637582] mt-1">
              Arrastra tu libro aquí. Detecta automáticamente celdas con color naranja, verde y sin color.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isReading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b1724] text-white font-sans font-semibold text-xs hover:bg-[#192b3c] transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              <FolderOpen size={15} className="text-[#f8c866]" />
              <span>Seleccionar Archivo</span>
            </button>

            <button
              type="button"
              onClick={onLoadDemo}
              disabled={isReading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#f0f4f2] text-[#425460] border border-[#d6e0dd] font-sans font-semibold text-xs hover:bg-[#e4edea] transition-all shadow-xs active:scale-95"
            >
              <Sparkles size={15} />
              <span>Demo General (La Floresta)</span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleInputChange}
              className="sr-only"
            />
          </div>

          <div className="pt-4 border-t border-[#edf2f0] flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-[#768792]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#2e8564]" /> 100% Local y privado
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-[#2c6ecb]" /> Compatible con XLSM / XLSX
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw size={14} className="text-[#e5a83b]" /> Detección de Colores y Palabras Clave
            </span>
          </div>
        </div>
      </section>

      {/* 3 Discipline Pillars Explaining Criteria */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* Electrico */}
        <div className="p-5 rounded-xl bg-white border border-[#f8d58a] border-t-4 border-t-[#e5a83b] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#fff4db] text-[#b0791a] flex items-center justify-center mb-2.5 font-bold">
            <Zap size={17} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-[#0b1724]">
              Actividades Eléctricas
            </h3>
            <span className="w-3 h-3 rounded-full bg-[#e5a83b]" title="Color Naranja en Excel" />
          </div>
          <span className="text-[10px] font-mono text-[#a06800] uppercase font-bold block mt-0.5">
            Color Naranja en Excel
          </span>
          <p className="text-xs font-mono text-[#637582] mt-2 leading-relaxed">
            Cables monopolares THHN/XLPE, tableros de distribución y contadores, transformadores padmounted, reconectadores, celdas de medida, bornas, codos y terminales.
          </p>
        </div>

        {/* Civil */}
        <div className="p-5 rounded-xl bg-white border border-[#c3d5ee] border-t-4 border-t-[#4673a7] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#e8eff8] text-[#235189] flex items-center justify-center mb-2.5 font-bold">
            <HardHat size={17} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-[#0b1724]">
              Obras Civiles
            </h3>
            <span className="w-3 h-3 rounded-full bg-[#4673a7]" title="Sin color en Excel" />
          </div>
          <span className="text-[10px] font-mono text-[#235189] uppercase font-bold block mt-0.5">
            Sin Color en Excel
          </span>
          <p className="text-xs font-mono text-[#637582] mt-2 leading-relaxed">
            Cajas con marco y tapa subterráneas (tipo A SB850, tipo B SB851, tipo 1 SB853 Celsia), canalizaciones, tuberías PVC 4" y 6", curvas, campanas, excavación, relleno y campamento.
          </p>
        </div>

        {/* Alumbrado */}
        <div className="p-5 rounded-xl bg-white border border-[#b9ded1] border-t-4 border-t-[#3b8f71] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#e5f3ee] text-[#1f674e] flex items-center justify-center mb-2.5 font-bold">
            <Lightbulb size={17} />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-[#0b1724]">
              Alumbrado Público
            </h3>
            <span className="w-3 h-3 rounded-full bg-[#3b8f71]" title="Color Verde en Excel" />
          </div>
          <span className="text-[10px] font-mono text-[#1f674e] uppercase font-bold block mt-0.5">
            Color Verde en Excel
          </span>
          <p className="text-xs font-mono text-[#637582] mt-2 leading-relaxed">
            Luminarias LED (Nano ST 60W, Hiplane G2 75W), instalación con carro canasta, postes de concreto de 12 metros x 510kgf y circuitos dedicados.
          </p>
        </div>
      </section>
    </div>
  )
}
