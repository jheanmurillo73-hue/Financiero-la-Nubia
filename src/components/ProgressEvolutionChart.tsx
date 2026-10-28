import React, { useState } from 'react'
import { BarChart3, TrendingUp, Layers, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { FinancialReport } from '../lib/model'

interface ProgressEvolutionChartProps {
  report: FinancialReport
  selectedAct: number
  onSelectAct: (actNumber: number) => void
}

export const ProgressEvolutionChart: React.FC<ProgressEvolutionChartProps> = ({
  report,
  selectedAct,
  onSelectAct,
}) => {
  const [metricMode, setMetricMode] = useState<'cumulative' | 'individual'>('cumulative')

  const maxCumulative = Math.max(report.grossProgressPct, 0.05)
  const maxIndividualGross = Math.max(...report.acts.map((a) => a.grossBilled), 1000)

  return (
    <article className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs flex flex-col justify-between">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold">
              Evolución Temporal
            </span>
          </div>
          <h3 className="font-display font-bold text-lg text-[#0b1724] mt-0.5">
            Avance por Acta de Obra
          </h3>
        </div>

        {/* View toggle */}
        <div className="inline-flex p-0.5 rounded-lg bg-[#f0f4f2] border border-[#e1e7e5] text-xs font-mono self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('cumulative')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricMode === 'cumulative'
                ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                : 'text-[#687a84] hover:text-[#0b1724]'
            }`}
          >
            % Acumulado
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('individual')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricMode === 'individual'
                ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                : 'text-[#687a84] hover:text-[#0b1724]'
            }`}
          >
            $ Monto por Acta
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-mono text-[#687882] mt-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#e5a83b]" />
          {metricMode === 'cumulative' ? 'Avance Bruto Acumulado' : 'Facturado Bruto'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2e8564]" />
          {metricMode === 'cumulative' ? 'Avance Neto Acumulado' : 'Factura Neta Girada'}
        </span>
      </div>

      {/* Bars container */}
      <div className="mt-4 pt-2 overflow-x-auto pb-2">
        <div className="min-w-[320px] h-48 flex items-end justify-around gap-2 sm:gap-4 border-b border-[#dce5e3] relative bg-[repeating-linear-gradient(to_top,#fbfcfc_0,#fbfcfc_47px,#eef3f1_48px)]">
          {report.acts.map((act) => {
            const isSelected = act.number === selectedAct

            const grossHeightPct =
              metricMode === 'cumulative'
                ? Math.max(10, (act.grossCumulativePct / maxCumulative) * 100)
                : Math.max(10, (act.grossBilled / maxIndividualGross) * 100)

            const netHeightPct =
              metricMode === 'cumulative'
                ? Math.max(8, (act.netCumulativePct / maxCumulative) * 100)
                : Math.max(8, (Math.max(0, act.netInvoice) / maxIndividualGross) * 100)

            return (
              <button
                key={act.number}
                type="button"
                onClick={() => onSelectAct(act.number)}
                className={`group flex-1 flex flex-col items-center justify-end h-full p-1 rounded-lg transition-all focus:outline-hidden ${
                  isSelected
                    ? 'bg-[#e7f1ee] ring-2 ring-[#2e8564]'
                    : 'hover:bg-[#f3f7f6]'
                }`}
                title={`Acta ${act.number}: Bruto ${formatCurrency(act.grossBilled)}, Neto ${formatCurrency(act.netInvoice)}`}
              >
                {/* Visual pair */}
                <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-[calc(100%-28px)] relative">
                  {/* Gross bar */}
                  <div
                    className={`w-3.5 sm:w-5 rounded-t-sm transition-all duration-300 relative ${
                      isSelected ? 'bg-[#d89726]' : 'bg-[#e5a83b] group-hover:brightness-95'
                    }`}
                    style={{ height: `${grossHeightPct}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0b1724] text-white text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap z-20 pointer-events-none">
                      {metricMode === 'cumulative'
                        ? formatPercent(act.grossCumulativePct)
                        : formatCompact(act.grossBilled)}
                    </span>
                  </div>

                  {/* Net bar */}
                  <div
                    className={`w-3.5 sm:w-5 rounded-t-sm transition-all duration-300 relative ${
                      isSelected ? 'bg-[#21674c]' : 'bg-[#2e8564] group-hover:brightness-95'
                    }`}
                    style={{ height: `${netHeightPct}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0b1724] text-white text-[9px] font-mono px-1 py-0.5 rounded whitespace-nowrap z-20 pointer-events-none">
                      {metricMode === 'cumulative'
                        ? formatPercent(act.netCumulativePct)
                        : formatCompact(act.netInvoice)}
                    </span>
                  </div>
                </div>

                {/* X-axis label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[10px] sm:text-xs font-mono block whitespace-nowrap ${
                      isSelected
                        ? 'font-bold text-[#0b1724]'
                        : 'text-[#687a84] group-hover:text-[#0b1724]'
                    }`}
                  >
                    Acta {act.number}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Baseline info */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#8a989f] mt-3 pt-2 border-t border-[#f0f4f2]">
        <span>0%</span>
        <span>Haz clic en una columna para inspeccionar el corte</span>
        <span>{formatPercent(report.grossProgressPct)} alcanzado</span>
      </div>
    </article>
  )
}
