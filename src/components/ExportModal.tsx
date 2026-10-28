import React from 'react'
import {
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Printer,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { exportReportXlsx, exportReportCsv, exportReportJson } from '../lib/exports'
import type { FinancialReport } from '../lib/model'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  report: FinancialReport
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#dfe5e4] p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f4f2] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold">
              Centro de Descargas
            </span>
            <h3 className="font-display font-bold text-xl text-[#0b1724]">
              Exportar Informe de Obra
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#657682] hover:bg-[#f0f4f2] hover:text-[#0b1724] transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Project summary */}
        <div className="p-3 bg-[#f7faf9] rounded-xl border border-[#d6e3df] text-xs font-mono text-[#4b5d67]">
          <div className="text-[10px] uppercase text-[#73828c]">Proyecto a exportar</div>
          <div className="font-sans font-bold text-[#0b1724] text-sm mt-0.5 truncate">
            {report.title}
          </div>
          <div className="text-[11px] mt-0.5">
            {report.contract} · {report.acts.length} actas · {report.chapters.length} capítulos
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* XLSX */}
          <button
            type="button"
            onClick={() => {
              exportReportXlsx(report)
            }}
            className="p-4 rounded-xl border border-[#dfe5e4] bg-[#fbfcfa] hover:border-[#2e8564] hover:bg-[#f5faf8] transition-all text-left flex flex-col justify-between group shadow-xs"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-lg bg-[#e5f5ee] text-[#2e8564] flex items-center justify-center">
                <FileSpreadsheet size={18} />
              </div>
              <Download size={15} className="text-[#8799a4] group-hover:text-[#2e8564] transition-colors" />
            </div>
            <div className="mt-3">
              <strong className="font-display font-semibold text-sm text-[#0b1724] block">
                Libro Excel (.XLSX)
              </strong>
              <p className="text-[11px] font-mono text-[#687a84] mt-1">
                Multi-pestaña: Resumen Ejecutivo, Capítulos y Matriz completa.
              </p>
            </div>
          </button>

          {/* CSV */}
          <button
            type="button"
            onClick={() => {
              exportReportCsv(report)
            }}
            className="p-4 rounded-xl border border-[#dfe5e4] bg-[#fbfcfa] hover:border-[#2c6ecb] hover:bg-[#f3f7fd] transition-all text-left flex flex-col justify-between group shadow-xs"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-lg bg-[#e8f1fc] text-[#2c6ecb] flex items-center justify-center">
                <FileText size={18} />
              </div>
              <Download size={15} className="text-[#8799a4] group-hover:text-[#2c6ecb] transition-colors" />
            </div>
            <div className="mt-3">
              <strong className="font-display font-semibold text-sm text-[#0b1724] block">
                Archivo CSV
              </strong>
              <p className="text-[11px] font-mono text-[#687a84] mt-1">
                Formato separado por punto y coma listo para importar en bases de datos o ERP.
              </p>
            </div>
          </button>

          {/* JSON */}
          <button
            type="button"
            onClick={() => {
              exportReportJson(report)
            }}
            className="p-4 rounded-xl border border-[#dfe5e4] bg-[#fbfcfa] hover:border-[#6b57a6] hover:bg-[#f7f4fc] transition-all text-left flex flex-col justify-between group shadow-xs"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-lg bg-[#efeaf8] text-[#6b57a6] flex items-center justify-center">
                <FileCode size={18} />
              </div>
              <Download size={15} className="text-[#8799a4] group-hover:text-[#6b57a6] transition-colors" />
            </div>
            <div className="mt-3">
              <strong className="font-display font-semibold text-sm text-[#0b1724] block">
                Datos JSON
              </strong>
              <p className="text-[11px] font-mono text-[#687a84] mt-1">
                Estructura completa del modelo financiero, validaciones y actas.
              </p>
            </div>
          </button>

          {/* Print / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-4 rounded-xl border border-[#dfe5e4] bg-[#fbfcfa] hover:border-[#e5a83b] hover:bg-[#fffcf5] transition-all text-left flex flex-col justify-between group shadow-xs"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-9 h-9 rounded-lg bg-[#fff2d8] text-[#b58128] flex items-center justify-center">
                <Printer size={18} />
              </div>
              <Download size={15} className="text-[#8799a4] group-hover:text-[#b58128] transition-colors" />
            </div>
            <div className="mt-3">
              <strong className="font-display font-semibold text-sm text-[#0b1724] block">
                Imprimir / PDF
              </strong>
              <p className="text-[11px] font-mono text-[#687a84] mt-1">
                Formato ejecutivo optimizado para comités de obra e interventoría.
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#f0f4f2] flex items-center justify-between text-xs font-mono text-[#74858f]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#2e8564]" /> Generado instantáneamente en navegador
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0b1724] text-white font-sans font-medium text-xs hover:bg-[#182a3c] transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
