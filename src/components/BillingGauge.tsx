import React from 'react'
import {
  PieChart,
  ShieldCheck,
  Wallet,
  Clock,
  Coins,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { FinancialReport } from '../lib/model'

interface BillingGaugeProps {
  report: FinancialReport
}

export const BillingGauge: React.FC<BillingGaugeProps> = ({ report }) => {
  const billedPct = Math.min(1, Math.max(0, report.grossProgressPct))
  const pendingPct = Math.max(0, 1 - billedPct)
  const billedAmount = report.totalGrossBilled
  const pendingAmount = Math.max(0, report.billedBalance)

  // Average billing per act
  const avgGrossPerAct = report.acts.length > 0 ? billedAmount / report.acts.length : 0
  const actsRemainingEstimated = avgGrossPerAct > 0 ? Math.ceil(pendingAmount / avgGrossPerAct) : 0

  return (
    <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs">
      {/* Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0f4f2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e5a83b]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#73828c] font-semibold">
              Control Global de Facturación
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-1">
            Estado de Avance vs Presupuesto Total
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-mono uppercase text-[#73828c] block">
            Presupuesto Bruto Total
          </span>
          <span className="font-display font-bold text-base sm:text-lg text-[#0b1724]">
            {formatCurrency(report.grossBudget)}
          </span>
        </div>
      </div>

      {/* Visual meter bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-mono font-medium text-[#5a6c77] mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#e5a83b]" />
            Facturado ({formatPercent(billedPct)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#cbd7d5]" />
            Pendiente ({formatPercent(pendingPct)})
          </span>
        </div>

        <div className="relative w-full h-4 sm:h-5 bg-[#e4edea] rounded-lg overflow-hidden flex p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#e5a83b] to-[#df9b24] rounded-md transition-all duration-700 relative group"
            style={{ width: `${billedPct * 100}%` }}
          />
          <div
            className="h-full bg-[#cad7d4] rounded-r-md transition-all duration-700"
            style={{ width: `${pendingPct * 100}%` }}
          />
        </div>
      </div>

      {/* Breakdown metrics in 4 responsive tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {/* Tile 1: Facturado */}
        <div className="p-3.5 rounded-lg bg-[#fffaf0] border border-[#f5e5c2]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e5a83b]" />
            <span className="text-xs font-mono text-[#8a6820] font-medium">Facturado Acumulado</span>
          </div>
          <div className="font-display font-bold text-xl text-[#0b1724] mt-1.5">
            {formatPercent(billedPct)}
          </div>
          <div className="text-xs font-mono text-[#62512f] mt-0.5 truncate" title={formatCurrency(billedAmount)}>
            {formatCurrency(billedAmount)}
          </div>
        </div>

        {/* Tile 2: Pendiente */}
        <div className="p-3.5 rounded-lg bg-[#f7f9f9] border border-[#e1e9e7]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8c9c99]" />
            <span className="text-xs font-mono text-[#637270] font-medium">Pendiente por Facturar</span>
          </div>
          <div className="font-display font-bold text-xl text-[#0b1724] mt-1.5">
            {formatPercent(pendingPct)}
          </div>
          <div className="text-xs font-mono text-[#5b6e6b] mt-0.5 truncate" title={formatCurrency(pendingAmount)}>
            {formatCurrency(pendingAmount)}
          </div>
        </div>

        {/* Tile 3: Anticipo Amortizado */}
        <div className="p-3.5 rounded-lg bg-[#f0f6ff] border border-[#d6e4f9]">
          <div className="flex items-center gap-2">
            <Wallet size={13} className="text-[#2c6ecb]" />
            <span className="text-xs font-mono text-[#24589f] font-medium">Anticipo Amortizado</span>
          </div>
          <div className="font-display font-bold text-xl text-[#24589f] mt-1.5">
            {formatCompact(Math.abs(report.totalAmortization))} COP
          </div>
          <div className="text-[11px] font-mono text-[#52729a] mt-0.5">
            Tasa: {(report.params.advanceAmortization * 100).toFixed(0)}% s/ costo directo
          </div>
        </div>

        {/* Tile 4: Fondo de Garantía */}
        <div className="p-3.5 rounded-lg bg-[#f0faf5] border border-[#caeade]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-[#2e8564]" />
            <span className="text-xs font-mono text-[#24674e] font-medium">Fondo de Garantía</span>
          </div>
          <div className="font-display font-bold text-xl text-[#24674e] mt-1.5">
            {formatCompact(Math.abs(report.totalRetention))} COP
          </div>
          <div className="text-[11px] font-mono text-[#4c7a67] mt-0.5">
            Retenido: {(report.params.warrantyRetention * 100).toFixed(0)}% s/ bruto
          </div>
        </div>
      </div>

      {/* Footer quick insight */}
      <div className="mt-4 pt-3 border-t border-[#f0f4f2] flex flex-wrap items-center justify-between text-xs font-mono text-[#71828c] gap-2">
        <span className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#96a5ac]" />
          Facturación promedio: <b>{formatCompact(avgGrossPerAct)} COP / corte</b>
        </span>
        {pendingAmount > 0 && (
          <span className="flex items-center gap-1 text-[#42615a]">
            <span>Estimado para cierre de obra: <b>~{actsRemainingEstimated} corte(s)</b> adicionales</span>
          </span>
        )}
      </div>
    </section>
  )
}
