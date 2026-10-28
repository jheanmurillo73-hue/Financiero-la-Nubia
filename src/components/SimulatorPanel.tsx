import React from 'react'
import {
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Wallet,
  Info,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import { PARAM_LABELS } from '../lib/parseActa'
import type { FinancialParams, FinancialReport, ParamKey } from '../lib/model'

interface SimulatorPanelProps {
  report: FinancialReport
  onUpdateParams: (newParams: FinancialParams) => void
  onResetParams: () => void
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  report,
  onUpdateParams,
  onResetParams,
}) => {
  const isModified = report.isSimulation

  const handleSliderChange = (key: ParamKey, percentValue: number) => {
    const fraction = percentValue / 100
    onUpdateParams({
      ...report.params,
      [key]: Number(fraction.toFixed(4)),
    })
  }

  // Differences vs original
  const grossDiff =
    report.grossBudget -
    report.directCostContracted *
      (1 +
        report.originalParams.administration +
        report.originalParams.contingencies +
        report.originalParams.utility +
        report.originalParams.utility * report.originalParams.ivaUtility)

  return (
    <div className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#e5a83b]" />
              Centro de Simulación de Escenarios
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
            Ajuste de Parámetros AIU y Deducciones
          </h3>
          <p className="text-xs font-mono text-[#6c7d87] mt-0.5">
            Modifica las tasas en tiempo real para evaluar el impacto en flujo de caja y liquidación final.
          </p>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={onResetParams}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-[#fff3dc] text-[#a06800] border border-[#f5d796] hover:bg-[#ffeac0] transition-colors self-start sm:self-auto"
          >
            <RotateCcw size={13} />
            <span>Restablecer Contractuales</span>
          </button>
        )}
      </div>

      {/* Live impact summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 p-3.5 rounded-xl bg-[#f7faf9] border border-[#d6e3df]">
        <div>
          <span className="text-[10px] font-mono text-[#74858f] uppercase block">
            Presupuesto Bruto Simulado
          </span>
          <div className="text-base sm:text-lg font-display font-bold text-[#0b1724] mt-0.5">
            {formatCurrency(report.grossBudget)}
          </div>
          <span className="text-[11px] font-mono text-[#5b6e79]">
            {grossDiff !== 0 ? (
              <span className={grossDiff > 0 ? 'text-[#2e8564]' : 'text-[#c24343]'}>
                {grossDiff > 0 ? '+' : ''}{formatCompact(grossDiff)} COP vs contrato
              </span>
            ) : (
              'Sin variación con contrato base'
            )}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono text-[#74858f] uppercase block">
            Factura Neta Girada Acumulada
          </span>
          <div className="text-base sm:text-lg font-display font-bold text-[#2e8564] mt-0.5">
            {formatCurrency(report.totalNetInvoice)}
          </div>
          <span className="text-[11px] font-mono text-[#5b6e79]">
            {(report.netProgressPct * 100).toFixed(1)}% del presupuesto bruto
          </span>
        </div>

        <div>
          <span className="text-[10px] font-mono text-[#74858f] uppercase block">
            Retención de Garantía en Fondo
          </span>
          <div className="text-base sm:text-lg font-display font-bold text-[#6b57a6] mt-0.5">
            {formatCurrency(Math.abs(report.totalRetention))}
          </div>
          <span className="text-[11px] font-mono text-[#5b6e79]">
            Tasa actual: {(report.params.warrantyRetention * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        {(Object.keys(PARAM_LABELS) as ParamKey[]).map((key) => {
          const info = PARAM_LABELS[key]
          const currentValue = report.params[key] * 100
          const originalValue = report.originalParams[key] * 100
          const isKeyModified = Math.abs(currentValue - originalValue) > 0.01

          // Limits for reasonable sliders
          const min = key === 'ivaUtility' ? 0 : 0
          const max = key === 'advanceAmortization' ? 100 : key === 'ivaUtility' ? 30 : 25
          const step = key === 'ivaUtility' ? 0.5 : 0.5

          return (
            <div
              key={key}
              className={`p-4 rounded-xl border transition-all ${
                isKeyModified
                  ? 'border-[#e5a83b] bg-[#fffdf9]'
                  : 'border-[#dfe5e4] bg-[#fbfcfa]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm text-[#0b1724]">
                      {info.label}
                    </span>
                    {isKeyModified && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-sm bg-[#e5a83b] text-[#0b1724]">
                        Modificado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-[#76858e] mt-0.5">
                    {info.desc}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono font-bold text-[#0b1724]">
                    {currentValue.toFixed(1)}%
                  </div>
                  <div className="text-[10px] font-mono text-[#8a99a2]">
                    Orig: {originalValue.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Slider input */}
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={currentValue}
                  onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                  className="w-full accent-[#0b1724] cursor-pointer"
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#91a0a8] mt-1">
                <span>{min}%</span>
                <span>{(max / 2).toFixed(0)}%</span>
                <span>{max}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preset shortcuts */}
      <div className="mt-5 pt-4 border-t border-[#f0f4f2] flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-[#72838d] font-medium">Escenarios rápidos:</span>
        <button
          type="button"
          onClick={() =>
            onUpdateParams({
              administration: 0.1,
              contingencies: 0.02,
              utility: 0.05,
              ivaUtility: 0.19,
              advanceAmortization: 0.3,
              warrantyRetention: 0.05,
            })
          }
          className="px-2.5 py-1 rounded-md bg-[#f0f4f2] hover:bg-[#e3eae7] text-[#344652] transition-colors"
        >
          AIU Estándar (10-2-5)
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateParams({
              ...report.params,
              advanceAmortization: 0,
            })
          }
          className="px-2.5 py-1 rounded-md bg-[#f0f4f2] hover:bg-[#e3eae7] text-[#344652] transition-colors"
        >
          Sin Amortización (0%)
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateParams({
              ...report.params,
              warrantyRetention: 0.1,
            })
          }
          className="px-2.5 py-1 rounded-md bg-[#f0f4f2] hover:bg-[#e3eae7] text-[#344652] transition-colors"
        >
          Retención Alta (10%)
        </button>
      </div>
    </div>
  )
}
