import React from 'react'
import {
  TrendingUp,
  Receipt,
  Building2,
  Hourglass,
  Zap,
  Building,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { FinancialReport } from '../lib/model'

interface ExecutiveKpisProps {
  report: FinancialReport
  onViewDisciplines?: () => void
}

export const ExecutiveKpis: React.FC<ExecutiveKpisProps> = ({
  report,
  onViewDisciplines,
}) => {
  const pendingPct = Math.max(0, 1 - report.grossProgressPct)
  const pendingAmount = Math.max(0, report.billedBalance)

  const electrico = report.disciplines?.Electrico
  const civil = report.disciplines?.Civil

  return (
    <div className="space-y-3.5">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Indicadores ejecutivos">
        {/* 1. Avance Bruto */}
        <article className="p-4 sm:p-5 rounded-xl bg-white border border-[#dfe5e4] border-t-4 border-t-[#e5a83b] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-[#687882]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-medium">
              Avance Bruto
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#fff4db] text-[#b0791a] flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-bold text-[#0b1724] tracking-tight">
              {formatPercent(report.grossProgressPct)}
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs font-mono text-[#586a76]">
              <span>Facturado:</span>
              <strong className="text-[#0b1724] font-medium">{formatCompact(report.totalGrossBilled)} COP</strong>
            </div>
          </div>
          <div className="w-full bg-[#f0f4f2] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#e5a83b] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, report.grossProgressPct * 100))}%` }}
            />
          </div>
        </article>

        {/* 2. Facturación Neta Pagada */}
        <article className="p-4 sm:p-5 rounded-xl bg-white border border-[#dfe5e4] border-t-4 border-t-[#2e8564] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-[#687882]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-medium">
              Factura Neta
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#e5f5ee] text-[#2e8564] flex items-center justify-center">
              <Receipt size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-bold text-[#0b1724] tracking-tight">
              {formatPercent(report.netProgressPct)}
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs font-mono text-[#586a76]">
              <span>Girado neto:</span>
              <strong className="text-[#2e8564] font-semibold">{formatCompact(report.totalNetInvoice)} COP</strong>
            </div>
          </div>
          <div className="w-full bg-[#f0f4f2] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#2e8564] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, report.netProgressPct * 100))}%` }}
            />
          </div>
        </article>

        {/* 3. Presupuesto Bruto */}
        <article className="p-4 sm:p-5 rounded-xl bg-white border border-[#dfe5e4] border-t-4 border-t-[#2c6ecb] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-[#687882]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-medium">
              Presupuesto Bruto
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#e8f1fc] text-[#2c6ecb] flex items-center justify-center">
              <Building2 size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] tracking-tight truncate" title={formatCurrency(report.grossBudget)}>
              {formatCompact(report.grossBudget)} COP
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs font-mono text-[#586a76]">
              <span>Costo Directo:</span>
              <strong className="text-[#0b1724] font-medium">{formatCompact(report.directCostContracted)} COP</strong>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#71828c] flex items-center justify-between border-t border-[#f0f4f2] pt-2">
            <span>AIU Total:</span>
            <span className="font-mono font-medium text-[#2c6ecb]">
              +{((report.grossBudget / (report.directCostContracted || 1) - 1) * 100).toFixed(2)}%
            </span>
          </div>
        </article>

        {/* 4. Saldo por Facturar */}
        <article className="p-4 sm:p-5 rounded-xl bg-white border border-[#dfe5e4] border-t-4 border-t-[#6b57a6] shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between text-[#687882]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-medium">
              Saldo por Facturar
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#efeaf8] text-[#6b57a6] flex items-center justify-center">
              <Hourglass size={15} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] tracking-tight truncate" title={formatCurrency(pendingAmount)}>
              {formatCompact(pendingAmount)} COP
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs font-mono text-[#586a76]">
              <span>Pendiente:</span>
              <strong className="text-[#6b57a6] font-semibold">{formatPercent(pendingPct)}</strong>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#71828c] flex items-center justify-between border-t border-[#f0f4f2] pt-2">
            <span>Actas cargadas:</span>
            <span className="font-mono font-medium text-[#0b1724]">
              {report.acts.length} actas emitidas
            </span>
          </div>
        </article>
      </section>

      {/* Specialty Quick Highlight Banner: Eléctrico vs Civil */}
      {electrico && civil && (
        <section
          onClick={onViewDisciplines}
          className="p-3.5 sm:p-4 rounded-xl bg-[#f8faf9] border border-[#d6e3df] hover:border-[#2e8564] transition-all cursor-pointer shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0b1724] text-[#f8c866] flex items-center justify-center shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#6a7d88] font-semibold">
                Separación de Especialidades (Eléctrico vs Civil)
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-xs font-mono">
                <span className="text-[#24674e] font-semibold flex items-center gap-1">
                  ⚡ <strong>Eléctrico:</strong> {formatCompact(electrico.contractedTotal)} COP ({formatPercent(electrico.contractedPct)}) · Avance {formatPercent(electrico.accumulatedPct)}
                </span>
                <span className="text-[#966710] font-semibold flex items-center gap-1">
                  🏗️ <strong>Civil (Cajas/Cámaras/Tub):</strong> {formatCompact(civil.contractedTotal)} COP ({formatPercent(civil.contractedPct)}) · Avance {formatPercent(civil.accumulatedPct)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-[#2e8564] group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>Ver desglose y actividades</span>
            <ArrowRight size={13} />
          </div>
        </section>
      )}
    </div>
  )
}
