import React from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Calculator,
  LockKeyhole,
} from 'lucide-react'
import { formatCurrency, formatPercent } from '../lib/formatters'
import type { FinancialReport } from '../lib/model'

interface AuditViewProps {
  report: FinancialReport
}

export const AuditView: React.FC<AuditViewProps> = ({ report }) => {
  const errors = report.validation.filter((v) => v.level === 'error')
  const warnings = report.validation.filter((v) => v.level === 'warning')
  const infos = report.validation.filter((v) => v.level === 'info')

  const aiuMultiplier =
    1 +
    report.params.administration +
    report.params.contingencies +
    report.params.utility +
    report.params.utility * report.params.ivaUtility

  const totalDiscrepancies = report.acts.filter(
    (a) => a.control !== null && Math.abs(a.control) > 5
  ).length

  return (
    <div className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="border-b border-[#f0f4f2] pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#2e8564]" />
            Auditoría de Integridad y Consistencia
          </span>
        </div>
        <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
          Diagnóstico y Verificación Matemática
        </h3>
        <p className="text-xs font-mono text-[#6c7d87] mt-0.5">
          Control automático de cuadre de capítulos, AIU contractual, deducciones y correlación de actas.
        </p>
      </div>

      {/* Summary status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-[#f0faf5] border border-[#caeade] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2e8564] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#1f5943]">
              {report.acts.length} Actas Consecutivas
            </div>
            <div className="text-[11px] font-mono text-[#4b7a67] mt-0.5">
              Cortes desde Acta 1 hasta Acta {report.acts.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#f0f6ff] border border-[#d6e4f9] flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#2c6ecb] text-white flex items-center justify-center shrink-0">
            <Calculator size={18} />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#1c4885]">
              Factor AIU: {(aiuMultiplier * 100 - 100).toFixed(2)}%
            </div>
            <div className="text-[11px] font-mono text-[#4e6f99] mt-0.5">
              Multiplicador: x{aiuMultiplier.toFixed(4)}
            </div>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-lg border flex items-center gap-3 ${
            totalDiscrepancies > 0
              ? 'bg-[#fff9eb] border-[#f5dc9f]'
              : 'bg-[#f7faf9] border-[#d6e3df]'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              totalDiscrepancies > 0
                ? 'bg-[#e5a83b] text-[#0b1724]'
                : 'bg-[#2e8564] text-white'
            }`}
          >
            {totalDiscrepancies > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-[#0b1724]">
              {totalDiscrepancies > 0
                ? `${totalDiscrepancies} Discrepancia(s) detectadas`
                : '100% Cuadre con Valores Reportados'}
            </div>
            <div className="text-[11px] font-mono text-[#667780] mt-0.5">
              {totalDiscrepancies > 0
                ? 'Revisa el detalle de control por acta'
                : 'Sin diferencias en factura neta'}
            </div>
          </div>
        </div>
      </div>

      {/* Mathematical Breakdown of Formula */}
      <div className="p-4 rounded-xl bg-[#f8faf9] border border-[#dfe5e4]">
        <h4 className="font-display font-semibold text-sm text-[#0b1724] flex items-center gap-2">
          <Calculator size={15} className="text-[#3b8f71]" />
          Estructura de Fórmulas y Reglas de Liquidación
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs font-mono text-[#455762]">
          <div className="space-y-2 bg-white p-3 rounded-lg border border-[#e1e7e5]">
            <strong className="text-[#0b1724] block font-sans">1. Presupuesto Bruto con AIU</strong>
            <p className="text-[11px] text-[#697982]">
              <code>Bruto = Costo Directo × (1 + A + I + U + (U × IVA_U))</code>
            </p>
            <div className="text-[11px] text-[#556975] pt-1">
              • A (Admin): {formatPercent(report.params.administration)}<br />
              • I (Imprevistos): {formatPercent(report.params.contingencies)}<br />
              • U (Utilidad): {formatPercent(report.params.utility)}<br />
              • IVA s/Utilidad: {formatPercent(report.params.ivaUtility)} sobre {formatPercent(report.params.utility)} = {formatPercent(report.params.utility * report.params.ivaUtility)}
            </div>
          </div>

          <div className="space-y-2 bg-white p-3 rounded-lg border border-[#e1e7e5]">
            <strong className="text-[#0b1724] block font-sans">2. Deducciones de Cada Acta</strong>
            <p className="text-[11px] text-[#697982]">
              <code>Factura Neta = Bruto + Amortización + Retención</code>
            </p>
            <div className="text-[11px] text-[#556975] pt-1">
              • Amortización: -{formatPercent(report.params.advanceAmortization)} aplicado al costo directo ejecutado<br />
              • Retención Garantía: -{formatPercent(report.params.warrantyRetention)} aplicado al total facturado bruto
            </div>
          </div>
        </div>
      </div>

      {/* Validation Messages List */}
      <div>
        <h4 className="font-display font-semibold text-sm text-[#0b1724] mb-3">
          Historial de Validaciones del Archivo
        </h4>
        <div className="space-y-2">
          {errors.map((item, idx) => (
            <div
              key={`err-${idx}`}
              className="p-3 rounded-lg bg-[#fff5f5] border border-[#f5c6c6] text-xs font-mono text-[#a83232] flex items-start gap-2.5"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{item.message}</span>
            </div>
          ))}

          {warnings.map((item, idx) => (
            <div
              key={`warn-${idx}`}
              className="p-3 rounded-lg bg-[#fffaf0] border border-[#f5e3ba] text-xs font-mono text-[#9b6f12] flex items-start gap-2.5"
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{item.message}</span>
            </div>
          ))}

          {infos.map((item, idx) => (
            <div
              key={`info-${idx}`}
              className="p-3 rounded-lg bg-[#f0faf5] border border-[#cbeade] text-xs font-mono text-[#24674e] flex items-start gap-2.5"
            >
              <Info size={15} className="shrink-0 mt-0.5" />
              <span>{item.message}</span>
            </div>
          ))}

          {report.validation.length === 0 && (
            <div className="p-3 rounded-lg bg-[#f0faf5] border border-[#cbeade] text-xs font-mono text-[#24674e] flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Todas las validaciones pasaron satisfactoriamente sin advertencias ni errores.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
