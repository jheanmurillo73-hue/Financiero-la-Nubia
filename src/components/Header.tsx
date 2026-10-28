import React, { useState } from 'react'
import {
  FileSpreadsheet,
  LockKeyhole,
  Sparkles,
  Upload,
  RotateCcw,
  Menu,
  X,
  Download,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import type { FinancialReport } from '../lib/model'

interface HeaderProps {
  report: FinancialReport | null
  fileName: string
  onLoadDemo: () => void
  onLoadRealConexo: () => void
  onReset: () => void
  onOpenUpload: () => void
  onOpenExport: () => void
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  report,
  fileName,
  onLoadDemo,
  onLoadRealConexo,
  onReset,
  onOpenUpload,
  onOpenExport,
  activeTab,
  setActiveTab,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-[#fbfcfa]/90 backdrop-blur-md border-b border-[#dfe5e4] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0b1724] text-[#f8c866] flex items-center justify-center font-display font-bold text-sm tracking-tight shadow-md shadow-[#e5a83b]/20 transform -rotate-2">
              AF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg sm:text-xl text-[#0b1724] tracking-tight">
                  ActaFin
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide uppercase bg-[#e4f3ed] text-[#27795b] rounded-full border border-[#b9ded1]">
                  Eléctrico · Civil
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#76848e] hidden sm:block">
                Control financiero y separación de actividades
              </p>
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            {report?.isSimulation && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold bg-[#fff3dc] text-[#a06800] border border-[#f5d796] rounded-full animate-pulse">
                <Sparkles size={13} /> Simulación
              </span>
            )}

            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#5f707a] bg-[#f0f4f2] px-2.5 py-1 rounded-md border border-[#e1e7e5]">
              <LockKeyhole size={13} className="text-[#3b8f71]" />
              <span>Local</span>
            </div>

            {report ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-white border border-[#cbd7d5] text-[#2c3d4a] hover:bg-[#f4f8f6] hover:border-[#3b8f71] transition-all shadow-sm"
                >
                  <Download size={14} className="text-[#3b8f71]" />
                  <span>Exportar</span>
                </button>

                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0b1724] text-white hover:bg-[#1a2c3d] transition-all shadow-sm"
                >
                  <Upload size={14} className="text-[#f8c866]" />
                  <span>Cargar Otro</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLoadRealConexo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-[#e5a83b] text-[#0b1724] hover:bg-[#d89726] transition-all shadow-sm"
                  title="Cargar Acta 4 - Conexo La Nubia (Archivo Real del Proyecto)"
                >
                  <Zap size={14} />
                  <span>Acta 4 Conexo La Nubia</span>
                </button>

                <button
                  type="button"
                  onClick={onLoadDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#0b1724] text-[#f8c866] hover:bg-[#172b3c] transition-all shadow-sm"
                >
                  <Sparkles size={14} />
                  <span>Demo General</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Quick Action & Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!report ? (
              <button
                type="button"
                onClick={onLoadRealConexo}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#e5a83b] text-[#0b1724] rounded-md shadow-sm"
              >
                <Zap size={12} />
                <span>Acta 4 Real</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenExport}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-[#cbd7d5] text-[#2c3d4a] rounded-md shadow-sm"
              >
                <Download size={13} className="text-[#3b8f71]" />
                <span>Exportar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#465764] hover:text-[#0b1724] rounded-md hover:bg-[#eaf0ee] transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#dfe5e4] bg-[#fbfcfa] px-4 py-4 space-y-3 shadow-lg">
          {report && (
            <div className="p-3 bg-[#f0f5f3] rounded-lg border border-[#d6e3df]">
              <div className="text-[10px] font-mono uppercase text-[#76858e]">Proyecto actual</div>
              <div className="font-display font-semibold text-sm text-[#0b1724] mt-0.5 line-clamp-1">
                {report.title}
              </div>
              <div className="text-xs font-mono text-[#5b6e79] mt-0.5">
                {report.contract} · {report.acts.length} actas · {report.items.length} partidas
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {report ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onReset()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-md bg-[#0b1724] text-white"
                >
                  <Upload size={15} />
                  <span>Subir otro archivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoadRealConexo()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md bg-[#fffaf0] border border-[#f8d58a] text-[#a06800]"
                >
                  <Zap size={15} />
                  <span>Cargar Acta 4 Conexo La Nubia</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoadRealConexo()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-md bg-[#e5a83b] text-[#0b1724]"
                >
                  <Zap size={15} />
                  <span>Cargar Acta 4 Conexo La Nubia (Real)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onLoadDemo()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md bg-white border border-[#cbd7d5] text-[#344654]"
                >
                  <Sparkles size={15} />
                  <span>Obra Demo General</span>
                </button>
              </>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#e2e8e6] text-xs font-mono text-[#677780]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#3b8f71]" /> Clasificación Eléctrico / Civil
              </span>
              <span>v1.3</span>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
