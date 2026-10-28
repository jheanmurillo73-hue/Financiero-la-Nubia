import React, { useState } from 'react'
import {
  Table2,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Coins,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { ActResult } from '../lib/model'

interface ActasTableProps {
  acts: ActResult[]
  selectedActNumber: number
  onSelectAct: (actNumber: number) => void
  grossBudget?: number
  directCostContracted?: number
}

export const ActasTable: React.FC<ActasTableProps> = ({
  acts,
  selectedActNumber,
  onSelectAct,
  grossBudget = 0,
  directCostContracted = 0,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Derive running totals up to each act
  const actsWithBalances = acts.map((act, index) => {
    const cumulativeGross = acts.slice(0, index + 1).reduce((s, a) => s + a.grossBilled, 0)
    const cumulativeDirect = acts.slice(0, index + 1).reduce((s, a) => s + a.directCost, 0)
    const balanceGross = grossBudget > 0 ? Math.max(0, grossBudget - cumulativeGross) : 0
    const balanceDirect = directCostContracted > 0 ? Math.max(0, directCostContracted - cumulativeDirect) : 0
    const balancePct = Math.max(0, 1 - act.grossCumulativePct)

    return {
      ...act,
      cumulativeGross,
      cumulativeDirect,
      balanceGross,
      balanceDirect,
      balancePct,
    }
  })

  return (
    <div className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2e8564]" />
              Control de Facturación por Corte
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
            Desglose de Facturación por Acta: Ejecutado vs Por Facturar
          </h3>
          <p className="text-xs font-mono text-[#667782] mt-0.5">
            Distingue el valor facturado en cada periodo, el acumulado a la fecha y el saldo restante por facturar.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex p-0.5 rounded-lg bg-[#f0f4f2] border border-[#e1e7e5] text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                  : 'text-[#687a84] hover:text-[#0b1724]'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Tarjetas Detalladas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                  : 'text-[#687a84] hover:text-[#0b1724]'
              }`}
            >
              <Table2 size={13} />
              <span>Matriz Comparativa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explanatory Legend Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#f8faf9] rounded-xl border border-[#e2e9e6] text-xs font-mono">
        <div className="flex items-start gap-2">
          <span className="w-3 h-3 rounded-full bg-[#2e8564] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#1f674e] font-bold block">🟢 EJECUTADO EN CORTE:</strong>
            <span className="text-[#596d79]">
              Valor producido y facturado únicamente dentro del periodo del acta correspondiente.
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-3 h-3 rounded-full bg-[#0b1724] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#0b1724] font-bold block">📈 EJECUTADO ACUMULADO:</strong>
            <span className="text-[#596d79]">
              Suma histórica de todas las actas cobradas hasta dicho corte contractual (% de avance).
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-3 h-3 rounded-full bg-[#b0791a] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#a06800] font-bold block">⏳ POR FACTURAR (SALDO):</strong>
            <span className="text-[#596d79]">
              Valor restante por cobrar del contrato total tras descontar el acumulado de ese corte.
            </span>
          </div>
        </div>
      </div>

      {/* Cards View (Superior on Mobile & Responsive) */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
          {actsWithBalances.map((act) => {
            const isSelected = act.number === selectedActNumber
            const hasDiscrepancy = act.control !== null && Math.abs(act.control) > 5

            return (
              <div
                key={act.number}
                onClick={() => onSelectAct(act.number)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-[#2e8564] bg-[#f7fbf9] ring-2 ring-[#2e8564]/20 shadow-md'
                    : 'border-[#dfe5e4] bg-[#fbfcfa] hover:border-[#b4c9c3] hover:bg-white shadow-xs'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#e9efec]">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-[#0b1724] text-[#f8c866] font-mono font-bold text-xs flex items-center justify-center">
                        {String(act.number).padStart(2, '0')}
                      </span>
                      <div>
                        <span className="font-display font-bold text-base text-[#0b1724] block leading-tight">
                          Acta No. {act.number}
                        </span>
                        <span className="text-[10px] font-mono text-[#6d7e89]">
                          Corte de obra
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#e5f3ee] text-[#1f674e] border border-[#b9ded1]">
                      +{formatPercent(act.grossPct)} periodo
                    </span>
                  </div>

                  {/* Section 1: EJECUTADO EN ESTE CORTE */}
                  <div className="mt-3.5 p-3 rounded-lg bg-white border border-[#e2eae7]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f674e] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564]" />
                        1. Ejecutado en Corte
                      </span>
                      <span className="text-[10px] font-mono text-[#657682]">
                        Bruto + AIU
                      </span>
                    </div>
                    <div className="text-lg font-display font-bold text-[#0b1724] mt-1 truncate" title={formatCurrency(act.grossBilled)}>
                      {formatCurrency(act.grossBilled)}
                    </div>
                    <div className="text-[11px] font-mono text-[#5b6e79] mt-1 flex justify-between">
                      <span>Costo Directo:</span>
                      <strong className="text-[#0b1724]">{formatCompact(act.directCost)} COP</strong>
                    </div>
                  </div>

                  {/* Section 2: DEDUCCIONES & NETO GIRADO */}
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#fcfdfe] border border-[#e7eded] text-xs font-mono space-y-1">
                    <div className="flex justify-between text-[#8b4343]">
                      <span>(-) Amortización anticipo:</span>
                      <strong>{formatCompact(act.amortization)} COP</strong>
                    </div>
                    <div className="flex justify-between text-[#8b4343]">
                      <span>(-) Retención garantía:</span>
                      <strong>{formatCompact(act.retention)} COP</strong>
                    </div>
                    <div className="flex justify-between text-[#0b1724] pt-1 border-t border-[#edf1f0] font-bold">
                      <span>(=) Factura Neta Pagada:</span>
                      <span className="text-[#2e8564]">{formatCompact(act.netInvoice)} COP</span>
                    </div>
                  </div>

                  {/* Section 3: EJECUTADO ACUMULADO VS POR FACTURAR */}
                  <div className="mt-3 pt-3 border-t border-[#e8edeb] space-y-2">
                    {/* Ejecutado Acumulado */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1 text-[#0b1724] font-medium">
                        <TrendingUp size={12} className="text-[#2e8564]" />
                        <span>Ejecutado Acumulado:</span>
                      </span>
                      <span className="font-bold text-[#0b1724]">
                        {formatCompact(act.cumulativeGross)} ({formatPercent(act.grossCumulativePct)})
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-full bg-[#e8edeb] h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-[#2e8564] h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, act.grossCumulativePct * 100))}%` }}
                        title={`Ejecutado Acumulado: ${formatPercent(act.grossCumulativePct)}`}
                      />
                      <div
                        className="bg-[#e5a83b] h-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, act.balancePct * 100))}%` }}
                        title={`Por Facturar: ${formatPercent(act.balancePct)}`}
                      />
                    </div>

                    {/* Por Facturar / Saldo Restante */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1 text-[#a06800] font-medium">
                        <Clock size={12} className="text-[#e5a83b]" />
                        <span>Por Facturar (Saldo):</span>
                      </span>
                      <span className="font-bold text-[#a06800]">
                        {formatCompact(act.balanceGross)} ({formatPercent(act.balancePct)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Auditoría */}
                <div className="mt-3.5 pt-2.5 border-t border-[#ebf0ee] flex items-center justify-between text-[11px] font-mono">
                  {hasDiscrepancy ? (
                    <span className="text-[#b0791a] flex items-center gap-1 font-semibold">
                      <AlertCircle size={13} /> Control: {formatCurrency(act.control)}
                    </span>
                  ) : (
                    <span className="text-[#2e8564] flex items-center gap-1 font-semibold">
                      <CheckCircle2 size={13} /> {act.reportedNet !== null ? 'Cuadrada' : 'Auditada'}
                    </span>
                  )}
                  <span className="text-[#72828b] flex items-center gap-0.5 hover:text-[#0b1724]">
                    <span>{isSelected ? 'Seleccionada' : 'Ver detalle'}</span>
                    <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Full Data Table View with explicit grouping */
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#dfe5e4]">
          <table className="w-full text-left text-xs font-mono border-collapse whitespace-nowrap">
            <thead>
              {/* Super Headers */}
              <tr className="border-b border-[#cbd7d4] text-[10px] uppercase font-bold tracking-wider">
                <th colSpan={1} className="py-2 px-3 bg-[#f0f4f2] text-[#4d606d] border-r border-[#dfe5e4]">
                  Identificación
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#e8f4ee] text-[#1f674e] text-center border-r border-[#cbd7d4]">
                  🟢 1. Facturado en este Corte (Ejecutado)
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#fdf2f2] text-[#8b4343] text-center border-r border-[#f0d4d4]">
                  2. Deducciones de Ley
                </th>
                <th colSpan={1} className="py-2 px-3 bg-[#edf6f3] text-[#1f674e] text-center border-r border-[#cbd7d4]">
                  3. Pago Neto
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#f2f6fa] text-[#235189] text-center border-r border-[#cbd7d4]">
                  📈 4. Ejecutado Acumulado a la Fecha
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#fff9ed] text-[#a06800] text-center border-r border-[#f7e4be]">
                  ⏳ 5. Por Facturar (Saldo Pendiente)
                </th>
                <th colSpan={1} className="py-2 px-3 bg-[#f0f4f2] text-[#4d606d] text-center">
                  Auditoría
                </th>
              </tr>
              {/* Column Headers */}
              <tr className="bg-[#f5f8f7] text-[#5e707b] border-b border-[#dfe5e4]">
                <th className="py-2.5 px-3 font-semibold border-r border-[#dfe5e4]">Acta</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#f2faf5]">Costo Directo</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#e8f4ee] text-[#0b1724] border-r border-[#cbd7d4]">
                  Facturación Bruta
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#c24343] bg-[#fdf5f5]">
                  (-) Amortización
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#c24343] bg-[#fdf5f5] border-r border-[#f0d4d4]">
                  (-) Retención
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#1f674e] font-bold bg-[#edf6f3] border-r border-[#cbd7d4]">
                  Factura Neta
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#f6f9fc]">Bruto Acumulado</th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#f2f6fa] text-[#235189] font-bold border-r border-[#cbd7d4]">
                  % Avance Acum.
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#fffbf2] text-[#a06800]">
                  Saldo por Facturar ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#fff9ed] text-[#a06800] font-bold border-r border-[#f7e4be]">
                  % Pendiente
                </th>
                <th className="py-2.5 px-3 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {actsWithBalances.map((act) => {
                const isSelected = act.number === selectedActNumber
                const hasDiscrepancy = act.control !== null && Math.abs(act.control) > 5

                return (
                  <tr
                    key={act.number}
                    onClick={() => onSelectAct(act.number)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#eef6f3] font-medium'
                        : 'hover:bg-[#f8faf9]'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-[#dfe5e4]">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#0b1724] text-[#f8c866] font-bold text-[11px]">
                        {String(act.number).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right bg-[#fafdfb]">
                      {formatCurrency(act.directCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0b1724] bg-[#f0faf4] border-r border-[#cbd7d4]">
                      {formatCurrency(act.grossBilled)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#c24343] bg-[#fff8f8]">
                      {formatCurrency(act.amortization)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#c24343] bg-[#fff8f8] border-r border-[#f0d4d4]">
                      {formatCurrency(act.retention)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#1f674e] bg-[#f2f8f5] border-r border-[#cbd7d4]">
                      {formatCurrency(act.netInvoice)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0b1724] bg-[#f9fbfe]">
                      {formatCurrency(act.cumulativeGross)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#235189] font-bold bg-[#f2f6fa] border-r border-[#cbd7d4]">
                      {formatPercent(act.grossCumulativePct)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#a06800] bg-[#fffdf7]">
                      {formatCurrency(act.balanceGross)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#a06800] bg-[#fff9ed] border-r border-[#f7e4be]">
                      {formatPercent(act.balancePct)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasDiscrepancy ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#b0791a] bg-[#fff6e5] px-2 py-0.5 rounded-full border border-[#f3ddb3]">
                          <AlertCircle size={11} /> {formatCurrency(act.control)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#2e8564] bg-[#e7f5ee] px-2 py-0.5 rounded-full border border-[#caeade]">
                          <CheckCircle2 size={11} /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              {actsWithBalances.length > 0 && (
                <tr className="bg-[#eef3f1] font-bold text-[#0b1724] border-t-2 border-[#cbd7d4]">
                  <td className="py-3 px-3 border-r border-[#cbd7d4]">TOTALES</td>
                  <td className="py-3 px-3 text-right">
                    {formatCurrency(acts.reduce((s, a) => s + a.directCost, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-[#2e8564] border-r border-[#cbd7d4]">
                    {formatCurrency(acts.reduce((s, a) => s + a.grossBilled, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-[#c24343]">
                    {formatCurrency(acts.reduce((s, a) => s + a.amortization, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-[#c24343] border-r border-[#cbd7d4]">
                    {formatCurrency(acts.reduce((s, a) => s + a.retention, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-[#1f674e] border-r border-[#cbd7d4]">
                    {formatCurrency(acts.reduce((s, a) => s + a.netInvoice, 0))}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatCurrency(actsWithBalances[actsWithBalances.length - 1].cumulativeGross)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#235189] border-r border-[#cbd7d4]">
                    {formatPercent(actsWithBalances[actsWithBalances.length - 1].grossCumulativePct)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#a06800]">
                    {formatCurrency(actsWithBalances[actsWithBalances.length - 1].balanceGross)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#a06800] border-r border-[#cbd7d4]">
                    {formatPercent(actsWithBalances[actsWithBalances.length - 1].balancePct)}
                  </td>
                  <td className="py-3 px-3 text-center text-[#2e8564]">Auditoría OK</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
