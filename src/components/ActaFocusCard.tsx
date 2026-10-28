import React from 'react'
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { ActResult, FinancialReport } from '../lib/model'

interface ActaFocusCardProps {
  report: FinancialReport
  selectedActNumber: number
  onSelectAct: (actNumber: number) => void
}

export const ActaFocusCard: React.FC<ActaFocusCardProps> = ({
  report,
  selectedActNumber,
  onSelectAct,
}) => {
  const currentAct =
    report.acts.find((a) => a.number === selectedActNumber) ??
    report.acts[report.acts.length - 1]

  if (!currentAct) return null

  const currentIndex = report.acts.findIndex((a) => a.number === currentAct.number)
  const prevAct = currentIndex > 0 ? report.acts[currentIndex - 1] : null
  const nextAct = currentIndex < report.acts.length - 1 ? report.acts[currentIndex + 1] : null

  const hasDiscrepancy =
    currentAct.control !== null && Math.abs(currentAct.control) > 10

  const totalAiu =
    currentAct.administration +
    currentAct.contingencies +
    currentAct.utility +
    currentAct.ivaUtility

  return (
    <article className="bg-[#0b1724] text-white rounded-xl p-5 sm:p-6 shadow-md border border-[#1b2b3d] flex flex-col justify-between relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e5a83b]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-[#1f3144] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#98abb8] font-medium">
              Corte Financiero Detallado
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="font-display font-bold text-xl text-white">
                Acta No. {String(currentAct.number).padStart(2, '0')}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#e5a83b]/20 text-[#f8c866] border border-[#e5a83b]/30">
                <ArrowUpRight size={11} /> {formatPercent(currentAct.grossCumulativePct)} Acum.
              </span>
            </div>
          </div>

          {/* Prev / Next controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!prevAct}
              onClick={() => prevAct && onSelectAct(prevAct.number)}
              className="p-1.5 rounded-md text-[#9bb0bf] hover:text-white hover:bg-[#182838] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Acta anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono text-[#8fa3b3] px-1">
              {currentIndex + 1}/{report.acts.length}
            </span>
            <button
              type="button"
              disabled={!nextAct}
              onClick={() => nextAct && onSelectAct(nextAct.number)}
              className="p-1.5 rounded-md text-[#9bb0bf] hover:text-white hover:bg-[#182838] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Acta siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Main Highlight: Factura Neta del Corte */}
        <div className="mt-5">
          <span className="text-xs font-mono text-[#9bb0bf] block">
            Factura Neta Girada en este Corte
          </span>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-[#f8c866] tracking-tight mt-1 truncate" title={formatCurrency(currentAct.netInvoice)}>
            {formatCurrency(currentAct.netInvoice)}
          </div>
          <div className="text-xs font-mono text-[#879dab] mt-1 flex items-center gap-3">
            <span>Bruto: {formatCompact(currentAct.grossBilled)} COP</span>
            <span>·</span>
            <span>{formatPercent(currentAct.grossPct)} del contrato</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-[#1f3144]">
          <div className="p-2.5 rounded-lg bg-[#122131] border border-[#1d3348]">
            <span className="text-[10px] font-mono text-[#8ca0b0] block">Costo Directo</span>
            <strong className="text-sm sm:text-base font-display text-white font-semibold mt-0.5 block truncate" title={formatCurrency(currentAct.directCost)}>
              {formatCompact(currentAct.directCost)} COP
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-[#122131] border border-[#1d3348]">
            <span className="text-[10px] font-mono text-[#8ca0b0] block">AIU Total (+{((totalAiu / (currentAct.directCost || 1)) * 100).toFixed(1)}%)</span>
            <strong className="text-sm sm:text-base font-display text-[#7cb79e] font-semibold mt-0.5 block truncate" title={formatCurrency(totalAiu)}>
              +{formatCompact(totalAiu)} COP
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-[#122131] border border-[#1d3348]">
            <span className="text-[10px] font-mono text-[#8ca0b0] block">(-) Amortización Anticipo</span>
            <strong className="text-sm sm:text-base font-display text-[#e88277] font-semibold mt-0.5 block truncate" title={formatCurrency(currentAct.amortization)}>
              {formatCompact(currentAct.amortization)} COP
            </strong>
          </div>

          <div className="p-2.5 rounded-lg bg-[#122131] border border-[#1d3348]">
            <span className="text-[10px] font-mono text-[#8ca0b0] block">(-) Retención Garantía</span>
            <strong className="text-sm sm:text-base font-display text-[#e88277] font-semibold mt-0.5 block truncate" title={formatCurrency(currentAct.retention)}>
              {formatCompact(currentAct.retention)} COP
            </strong>
          </div>
        </div>

        {/* Explicit comparison: Ejecutado Acumulado vs Por Facturar */}
        {(() => {
          const cumulativeGross = report.acts.slice(0, currentIndex + 1).reduce((s, a) => s + a.grossBilled, 0)
          const balanceGross = Math.max(0, report.grossBudget - cumulativeGross)
          const balancePct = Math.max(0, 1 - currentAct.grossCumulativePct)

          return (
            <div className="mt-4 pt-3.5 border-t border-[#1f3144] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#a5b9c6]">Estado Contractual tras Acta {currentAct.number}:</span>
                <span className="text-[11px] text-[#718797]">Total: {formatCompact(report.grossBudget)} COP</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-[#152a3d] border border-[#233f5b]">
                  <span className="text-[10px] text-[#7ec2a8] uppercase font-bold block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b8f71]" />
                    Ejecutado Acumulado
                  </span>
                  <strong className="text-white font-semibold mt-0.5 block truncate" title={formatCurrency(cumulativeGross)}>
                    {formatCompact(cumulativeGross)} COP
                  </strong>
                  <span className="text-[11px] text-[#97d8c1]">
                    {formatPercent(currentAct.grossCumulativePct)} del contrato
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#27211b] border border-[#483726]">
                  <span className="text-[10px] text-[#f8c866] uppercase font-bold block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5a83b]" />
                    Por Facturar (Saldo)
                  </span>
                  <strong className="text-[#f8c866] font-semibold mt-0.5 block truncate" title={formatCurrency(balanceGross)}>
                    {formatCompact(balanceGross)} COP
                  </strong>
                  <span className="text-[11px] text-[#e0b769]">
                    {formatPercent(balancePct)} restante
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#182736] h-2 rounded-full overflow-hidden flex mt-1">
                <div
                  className="bg-[#3b8f71] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, currentAct.grossCumulativePct * 100))}%` }}
                />
                <div
                  className="bg-[#e5a83b] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, balancePct * 100))}%` }}
                />
              </div>
            </div>
          )
        })()}
      </div>

      {/* Audit control check pill */}
      <div className="mt-5 pt-3 border-t border-[#1f3144] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          {hasDiscrepancy ? (
            <>
              <AlertTriangle size={14} className="text-[#e5a83b]" />
              <span className="text-[#f8c866]">
                Diferencia con acta: {formatCurrency(currentAct.control)}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-[#3b8f71]" />
              <span className="text-[#7ec2a8]">
                {currentAct.reportedNet !== null
                  ? 'Cuadre verificado con valor reportado'
                  : 'Cálculo auditado'}
              </span>
            </>
          )}
        </div>
        <span className="text-[11px] text-[#8ca0b0]">
          {currentIndex === report.acts.length - 1 ? 'Última acta emitida' : 'Histórico'}
        </span>
      </div>
    </article>
  )
}
