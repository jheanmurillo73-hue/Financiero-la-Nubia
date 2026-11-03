import React, { useState, useMemo } from 'react'
import {
  Zap,
  HardHat,
  Lightbulb,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Table2,
  LayoutGrid,
  Download,
  Info,
  SlidersHorizontal,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  Coins,
  ArrowRight,
  Pin,
  PinOff,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import { DISCIPLINE_CONFIG } from '../lib/parseActa'
import type { DisciplineSummary, DisciplineType, FinancialReport, LineItem } from '../lib/model'

interface DisciplinesViewProps {
  report: FinancialReport
  selectedActNumber: number
  onUpdateDiscipline?: (rowNumber: number, newDiscipline: DisciplineType) => void
  onSelectAct?: (actNumber: number) => void
  onNavigateToPending?: () => void
}

export const DisciplinesView: React.FC<DisciplinesViewProps> = ({
  report,
  selectedActNumber,
  onUpdateDiscipline,
  onSelectAct,
  onNavigateToPending,
}) => {
  const [filterType, setFilterType] = useState<DisciplineType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [isStickyPinned, setIsStickyPinned] = useState<boolean>(true)
  const [sortBy, setSortBy] = useState<'default' | 'value' | 'accum' | 'balance' | 'cutValue'>('default')

  // Filter by Acta in the item classification section
  // 'all' = All actas accumulated; number = specific Acta (1, 2, 3, 4...)
  const [selectedActFilter, setSelectedActFilter] = useState<'all' | number>('all')

  // Execution status sub-filter for items: includes specific civil/electric unbilled focus
  const [executionFilter, setExecutionFilter] = useState<
    | 'all'
    | 'pending_balance'
    | 'pending_electric'
    | 'pending_civil'
    | 'billed_in_cut'
    | 'completed'
    | 'zero_in_cut'
  >('all')

  const disciplines = report.disciplines
  const electric = disciplines.Electrico
  const civil = disciplines.Civil
  const alumbrado = disciplines.Alumbrado

  const totalContractedDirect = report.directCostContracted || 1

  // Running totals across actas for the Trazabilidad table
  const actsWithRunningBalances = useMemo(() => {
    let runningDirect = 0
    return report.acts.map((act) => {
      const actNum = act.number
      const elVal = electric.acts.find((a) => a.actNumber === actNum)?.value ?? 0
      const civVal = civil.acts.find((a) => a.actNumber === actNum)?.value ?? 0
      const alumVal = alumbrado.acts.find((a) => a.actNumber === actNum)?.value ?? 0
      const totalCut = elVal + civVal + alumVal

      runningDirect += totalCut
      const progressPct = totalContractedDirect > 0 ? runningDirect / totalContractedDirect : 0
      const pendingDirect = Math.max(0, totalContractedDirect - runningDirect)
      const pendingPct = Math.max(0, 1 - progressPct)

      return {
        actNum,
        elVal,
        civVal,
        alumVal,
        totalCut,
        runningDirect,
        progressPct,
        pendingDirect,
        pendingPct,
      }
    })
  }, [report.acts, electric.acts, civil.acts, alumbrado.acts, totalContractedDirect])

  // Contextual metrics for the selected Acta filter
  const actFilterMetrics = useMemo(() => {
    if (selectedActFilter === 'all') {
      const totalContracted = report.items.reduce((s, it) => s + it.contractedTotal, 0)
      const totalAccum = report.items.reduce((s, it) => s + it.accumulatedValue, 0)
      const totalBalance = report.items.reduce((s, it) => s + it.balanceValue, 0)
      const billedItemsCount = report.items.filter((it) => it.accumulatedValue > 0).length

      return {
        isAll: true,
        title: 'Todas las Actas (Acumulado General)',
        billedInCut: totalAccum,
        electricInCut: electric.accumulatedValue,
        civilInCut: civil.accumulatedValue,
        alumbradoInCut: alumbrado.accumulatedValue,
        accumulatedToDate: totalAccum,
        accumulatedPct: totalContracted ? totalAccum / totalContracted : 0,
        pendingBalance: totalBalance,
        pendingPct: totalContracted ? totalBalance / totalContracted : 0,
        billedItemsCount,
        totalItemsCount: report.items.length,
      }
    }

    const actNum = selectedActFilter
    const elVal = electric.acts.find((a) => a.actNumber === actNum)?.value ?? 0
    const civVal = civil.acts.find((a) => a.actNumber === actNum)?.value ?? 0
    const alumVal = alumbrado.acts.find((a) => a.actNumber === actNum)?.value ?? 0
    const totalCut = elVal + civVal + alumVal

    // Running accumulated up to this act
    const matchingActs = actsWithRunningBalances.find((a) => a.actNum === actNum)
    const accumToDate = matchingActs?.runningDirect ?? totalCut
    const accumPct = matchingActs?.progressPct ?? (totalContractedDirect ? accumToDate / totalContractedDirect : 0)
    const pendingBalance = matchingActs?.pendingDirect ?? Math.max(0, totalContractedDirect - accumToDate)
    const pendingPct = matchingActs?.pendingPct ?? Math.max(0, 1 - accumPct)

    // Items that had non-zero billing in this act
    const billedItemsCount = report.items.filter((it) => {
      const actEntry = it.acts.find((a) => a.actNumber === actNum)
      return actEntry && actEntry.value > 0
    }).length

    return {
      isAll: false,
      title: `Acta No. ${actNum}`,
      billedInCut: totalCut,
      electricInCut: elVal,
      civilInCut: civVal,
      alumbradoInCut: alumVal,
      accumulatedToDate: accumToDate,
      accumulatedPct: accumPct,
      pendingBalance,
      pendingPct,
      billedItemsCount,
      totalItemsCount: report.items.length,
    }
  }, [selectedActFilter, report.items, electric, civil, alumbrado, actsWithRunningBalances, totalContractedDirect])

  // Filtered and sorted items based on discipline, text search, acta filter, and status filter
  const filteredItems = useMemo(() => {
    let result = report.items.map((it) => {
      // Calculate dynamic cut values and accum values based on selectedActFilter
      let valInCut = 0
      let qtyInCut = 0
      let accumAtCut = it.accumulatedValue
      let accumQtyAtCut = it.accumulatedQty
      let balanceAtCut = it.balanceValue
      let balanceQtyAtCut = it.balanceQty

      if (selectedActFilter !== 'all') {
        const found = it.acts.find((a) => a.actNumber === selectedActFilter)
        valInCut = found ? found.value : 0
        qtyInCut = found ? found.qty : 0

        // Accumulated up to this cut
        const filteredActs = it.acts.filter((a) => a.actNumber <= selectedActFilter)
        accumAtCut = filteredActs.reduce((s, a) => s + a.value, 0)
        accumQtyAtCut = filteredActs.reduce((s, a) => s + a.qty, 0)
        balanceAtCut = Math.max(0, it.contractedTotal - accumAtCut)
        balanceQtyAtCut = Math.max(0, it.contractedQty - accumQtyAtCut)
      } else {
        valInCut = it.accumulatedValue
        qtyInCut = it.accumulatedQty
      }

      const progressPctAtCut = it.contractedTotal > 0 ? accumAtCut / it.contractedTotal : 0
      const balancePctAtCut = Math.max(0, 1 - progressPctAtCut)

      return {
        ...it,
        valInCut,
        qtyInCut,
        accumAtCut,
        accumQtyAtCut,
        balanceAtCut,
        balanceQtyAtCut,
        progressPctAtCut,
        balancePctAtCut,
      }
    })

    // 1. Filter by discipline
    if (filterType !== 'all') {
      result = result.filter((it) => it.discipline === filterType)
    }

    // 2. Filter by text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (it) => it.description.toLowerCase().includes(q) || it.code.toLowerCase().includes(q)
      )
    }

    // 3. Filter by execution status in the selected cut
    if (executionFilter === 'billed_in_cut') {
      result = result.filter((it) => it.valInCut > 0)
    } else if (executionFilter === 'zero_in_cut') {
      result = result.filter((it) => it.valInCut === 0)
    } else if (executionFilter === 'pending_balance') {
      result = result.filter((it) => it.balanceAtCut > 0.01)
    } else if (executionFilter === 'pending_electric') {
      result = result.filter((it) => it.discipline === 'Electrico' && it.balanceAtCut > 0.01)
    } else if (executionFilter === 'pending_civil') {
      result = result.filter((it) => it.discipline === 'Civil' && it.balanceAtCut > 0.01)
    } else if (executionFilter === 'completed') {
      result = result.filter((it) => it.progressPctAtCut >= 0.999)
    }

    // 4. Sort
    if (sortBy === 'value') {
      result.sort((a, b) => b.contractedTotal - a.contractedTotal)
    } else if (sortBy === 'accum') {
      result.sort((a, b) => b.accumAtCut - a.accumAtCut)
    } else if (sortBy === 'balance') {
      result.sort((a, b) => b.balanceAtCut - a.balanceAtCut)
    } else if (sortBy === 'cutValue') {
      result.sort((a, b) => b.valInCut - a.valInCut)
    }

    return result
  }, [report.items, filterType, search, selectedActFilter, executionFilter, sortBy])

  return (
    <div className="space-y-6">
      {/* Executive Discipline KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Resumen por disciplinas">
        {/* 1. ELÉCTRICO */}
        <article className="p-5 rounded-2xl bg-white border-2 border-[#e5a83b] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#fff4db] text-[#b0791a] flex items-center justify-center font-bold">
                <Zap size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#a06800] font-bold block">
                  Actividades Eléctricas
                </span>
                <span className="text-xs font-mono text-[#76858e]">
                  {electric.itemCount} ítems · Cables, tableros, trafos, codos
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#fff4db] text-[#a06800] border border-[#f8d58a] rounded-full">
              {formatPercent(electric.contractedPct)} del total
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f7e8c9]">
            <span className="text-[10px] font-mono uppercase text-[#73828c] block">Presupuesto Contratado</span>
            <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] mt-0.5">
              {formatCurrency(electric.contractedTotal)}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#f7e8c9] text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#1f674e] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564]" />
                  Ejecutado Acum.
                </span>
                <strong className="text-[#2e8564] font-semibold block">
                  {formatCurrency(electric.accumulatedValue)}
                </strong>
                <span className="text-[10px] text-[#4d7866]">
                  {formatPercent(electric.accumulatedPct)} de su valor
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#a06800] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e5a83b]" />
                  Por Facturar (Saldo)
                </span>
                <strong className="text-[#b0791a] font-semibold block">
                  {formatCurrency(electric.balanceValue)}
                </strong>
                <span className="text-[10px] text-[#8c6b2b]">
                  {formatPercent(electric.balancePct)} por ejecutar
                </span>
              </div>
            </div>
          </div>

          <div className="w-full bg-[#f0f4f2] h-2 rounded-full mt-4 overflow-hidden flex">
            <div
              className="bg-[#e5a83b] h-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, electric.accumulatedPct * 100))}%` }}
              title={`Ejecutado: ${formatPercent(electric.accumulatedPct)}`}
            />
          </div>
        </article>

        {/* 2. CIVIL */}
        <article className="p-5 rounded-2xl bg-white border-2 border-[#4673a7] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e8eff8] text-[#235189] flex items-center justify-center font-bold">
                <HardHat size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#235189] font-bold block">
                  Obras Civiles
                </span>
                <span className="text-xs font-mono text-[#76858e]">
                  {civil.itemCount} ítems · Cajas, cámaras, tuberías PVC
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#e8eff8] text-[#235189] border border-[#c3d5ee] rounded-full">
              {formatPercent(civil.contractedPct)} del total
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-[#d8e4f3]">
            <span className="text-[10px] font-mono uppercase text-[#73828c] block">Presupuesto Contratado</span>
            <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] mt-0.5">
              {formatCurrency(civil.contractedTotal)}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#d8e4f3] text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#1f674e] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564]" />
                  Ejecutado Acum.
                </span>
                <strong className="text-[#2e8564] font-semibold block">
                  {formatCurrency(civil.accumulatedValue)}
                </strong>
                <span className="text-[10px] text-[#4d7866]">
                  {formatPercent(civil.accumulatedPct)} de su valor
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#235189] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4673a7]" />
                  Por Facturar (Saldo)
                </span>
                <strong className="text-[#235189] font-semibold block">
                  {formatCurrency(civil.balanceValue)}
                </strong>
                <span className="text-[10px] text-[#426b9e]">
                  {formatPercent(civil.balancePct)} por ejecutar
                </span>
              </div>
            </div>
          </div>

          <div className="w-full bg-[#f0f4f2] h-2 rounded-full mt-4 overflow-hidden flex">
            <div
              className="bg-[#4673a7] h-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, civil.accumulatedPct * 100))}%` }}
              title={`Ejecutado: ${formatPercent(civil.accumulatedPct)}`}
            />
          </div>
        </article>

        {/* 3. ALUMBRADO PÚBLICO */}
        <article className="p-5 rounded-2xl bg-white border-2 border-[#3b8f71] shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e5f3ee] text-[#1f674e] flex items-center justify-center font-bold">
                <Lightbulb size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f674e] font-bold block">
                  Alumbrado Público
                </span>
                <span className="text-xs font-mono text-[#76858e]">
                  {alumbrado.itemCount} ítems · Luminarias LED, postes 12m
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#e5f3ee] text-[#1f674e] border border-[#b9ded1] rounded-full">
              {formatPercent(alumbrado.contractedPct)} del total
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-[#d2e9e0]">
            <span className="text-[10px] font-mono uppercase text-[#73828c] block">Presupuesto Contratado</span>
            <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] mt-0.5">
              {formatCurrency(alumbrado.contractedTotal)}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#d2e9e0] text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#1f674e] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564]" />
                  Ejecutado Acum.
                </span>
                <strong className="text-[#2e8564] font-semibold block">
                  {formatCurrency(alumbrado.accumulatedValue)}
                </strong>
                <span className="text-[10px] text-[#4d7866]">
                  {formatPercent(alumbrado.accumulatedPct)} de su valor
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#1f674e] uppercase font-bold block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3b8f71]" />
                  Por Facturar (Saldo)
                </span>
                <strong className="text-[#1f674e] font-semibold block">
                  {formatCurrency(alumbrado.balanceValue)}
                </strong>
                <span className="text-[10px] text-[#4d7866]">
                  {formatPercent(alumbrado.balancePct)} por ejecutar
                </span>
              </div>
            </div>
          </div>

          <div className="w-full bg-[#f0f4f2] h-2 rounded-full mt-4 overflow-hidden flex">
            <div
              className="bg-[#3b8f71] h-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, alumbrado.accumulatedPct * 100))}%` }}
              title={`Ejecutado: ${formatPercent(alumbrado.accumulatedPct)}`}
            />
          </div>
        </article>
      </section>

      {/* Contract Composition Bar */}
      <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0f4f2] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold">
              Composición Presupuestal
            </span>
            <h3 className="font-display font-bold text-lg text-[#0b1724]">
              Distribución Eléctrica vs Civil vs Alumbrado
            </h3>
          </div>
          <span className="text-xs font-mono text-[#5f717d]">
            Total Costo Directo: <b>{formatCurrency(report.directCostContracted)}</b>
          </span>
        </div>

        {/* Triple bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2 text-[#5a6b76]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#e5a83b]" />
              Eléctrico ({formatPercent(electric.contractedPct)}) · {formatCompact(electric.contractedTotal)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#4673a7]" />
              Civil ({formatPercent(civil.contractedPct)}) · {formatCompact(civil.contractedTotal)}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-3 rounded-sm bg-[#3b8f71]" />
              Alumbrado ({formatPercent(alumbrado.contractedPct)}) · {formatCompact(alumbrado.contractedTotal)}
            </span>
          </div>

          <div className="relative w-full h-5 bg-[#e4edea] rounded-lg overflow-hidden flex p-0.5 gap-0.5">
            <div
              className="h-full bg-[#e5a83b] rounded-l-md transition-all duration-700"
              style={{ width: `${electric.contractedPct * 100}%` }}
              title={`Eléctrico: ${formatCurrency(electric.contractedTotal)} (${formatPercent(electric.contractedPct)})`}
            />
            <div
              className="h-full bg-[#4673a7] transition-all duration-700"
              style={{ width: `${civil.contractedPct * 100}%` }}
              title={`Civil: ${formatCurrency(civil.contractedTotal)} (${formatPercent(civil.contractedPct)})`}
            />
            <div
              className="h-full bg-[#3b8f71] rounded-r-md transition-all duration-700"
              style={{ width: `${alumbrado.contractedPct * 100}%` }}
              title={`Alumbrado: ${formatCurrency(alumbrado.contractedTotal)} (${formatPercent(alumbrado.contractedPct)})`}
            />
          </div>
        </div>

        {/* Guidance Note on Colors & Detection */}
        <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#e1e9e6] flex items-start gap-2.5 text-xs font-mono text-[#5b6e78]">
          <Info size={16} className="text-[#3b8f71] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#0b1724] font-semibold block">Reglas de Clasificación Oficiales:</strong>
            <span>
              • <b>Naranja (Color FFFFC000)</b>: Actividades eléctricas (cables, acometidas, tableros BT/MT, trafos, celdas, reconectador, malla a tierra).<br />
              • <b>Sin color / Blanco</b>: Obras civiles (cajas de inspección/paso, cámaras subterráneas, canalizaciones, tuberías PVC/TDP, excavaciones, rellenos, campamento).<br />
              • <b>Verde (Color FF92D050)</b>: Alumbrado público (luminarias LED Nano ST/Hiplane, postes de concreto de 12 m, circuitos exclusivos).
            </span>
          </div>
        </div>
      </section>

      {/* Execution by Acta Table: Desglose de Facturación por Acta y Especialidad */}
      <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0f4f2] pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#e5a83b]" />
              Trazabilidad por Corte
            </span>
            <h3 className="font-display font-bold text-lg text-[#0b1724] mt-0.5">
              Desglose de Facturación por Acta: Ejecutado por Especialidad vs Por Facturar
            </h3>
            <p className="text-xs font-mono text-[#62747f] mt-0.5">
              Permite auditar el valor exacto cobrado en cada acta (Eléctrico / Civil) y el saldo pendiente contractual que queda por ejecutar.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#e1e7e5]">
          <table className="w-full text-left text-xs font-mono border-collapse whitespace-nowrap">
            <thead>
              {/* Super headers */}
              <tr className="border-b border-[#cbd7d4] text-[10px] uppercase font-bold tracking-wider">
                <th colSpan={1} className="py-2 px-3 bg-[#f0f4f2] text-[#4d606d] border-r border-[#dfe5e4]">
                  Corte
                </th>
                <th colSpan={7} className="py-2 px-3 bg-[#f3f9f6] text-[#1f674e] text-center border-r border-[#cbd7d4]">
                  🟢 1. Facturado en el Periodo del Acta (Ejecutado por Especialidad)
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#f2f6fa] text-[#235189] text-center border-r border-[#cbd7d4]">
                  📈 2. Ejecutado Acumulado
                </th>
                <th colSpan={2} className="py-2 px-3 bg-[#fff9ed] text-[#a06800] text-center">
                  ⏳ 3. Por Facturar (Saldo al Corte)
                </th>
              </tr>
              <tr className="bg-[#f5f8f7] text-[#5e707b] border-b border-[#dfe5e4]">
                <th className="py-2.5 px-3 font-semibold border-r border-[#dfe5e4]">Acta</th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#a06800] bg-[#fffaf0]">
                  ⚡ Eléctrico ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#a06800] bg-[#fffaf0]">% en Acta</th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#235189] bg-[#f3f7fd]">
                  🏗️ Civil ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#235189] bg-[#f3f7fd]">% en Acta</th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#1f674e] bg-[#f0faf5]">
                  💡 Alumbrado ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right text-[#1f674e] bg-[#f0faf5]">% en Acta</th>
                <th className="py-2.5 px-3 font-semibold text-right font-bold text-[#0b1724] bg-[#eef6f3] border-r border-[#cbd7d4]">
                  Total Corte ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#f8fbfe] text-[#0b1724]">
                  Acumulado ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#f2f6fa] text-[#235189] font-bold border-r border-[#cbd7d4]">
                  % Avance
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#fffdf7] text-[#a06800]">
                  Saldo Restante ($)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right bg-[#fff9ed] text-[#a06800] font-bold">
                  % Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {actsWithRunningBalances.map((act) => {
                const isSelected = act.actNum === selectedActNumber

                return (
                  <tr
                    key={act.actNum}
                    onClick={() => onSelectAct && onSelectAct(act.actNum)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#edf6f3] font-medium' : 'hover:bg-[#f8faf9]'
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-[#dfe5e4]">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#0b1724] text-[#f8c866] font-bold text-[11px]">
                        {String(act.actNum).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#a06800] bg-[#fffdfa]">
                      {formatCurrency(act.elVal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#a06800] bg-[#fffdfa]">
                      {formatPercent(act.totalCut ? act.elVal / act.totalCut : 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#235189] bg-[#f7faff]">
                      {formatCurrency(act.civVal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#235189] bg-[#f7faff]">
                      {formatPercent(act.totalCut ? act.civVal / act.totalCut : 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#1f674e] bg-[#f5fbf8]">
                      {formatCurrency(act.alumVal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#1f674e] bg-[#f5fbf8]">
                      {formatPercent(act.totalCut ? act.alumVal / act.totalCut : 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0b1724] bg-[#f2f8f5] border-r border-[#cbd7d4]">
                      {formatCurrency(act.totalCut)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0b1724] bg-[#fafcfe]">
                      {formatCurrency(act.runningDirect)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#235189] font-bold bg-[#f2f6fa] border-r border-[#cbd7d4]">
                      {formatPercent(act.progressPct)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#a06800] bg-[#fffdf7]">
                      {formatCurrency(act.pendingDirect)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#a06800] bg-[#fff9ed]">
                      {formatPercent(act.pendingPct)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#eef3f1] font-bold text-[#0b1724] border-t-2 border-[#cbd7d4]">
                <td className="py-3 px-3 border-r border-[#cbd7d4]">ACUMULADO</td>
                <td className="py-3 px-3 text-right text-[#a06800]">
                  {formatCurrency(electric.accumulatedValue)}
                </td>
                <td className="py-3 px-3 text-right text-[#a06800]">
                  {formatPercent(electric.shareOfTotalExecuted)}
                </td>
                <td className="py-3 px-3 text-right text-[#235189]">
                  {formatCurrency(civil.accumulatedValue)}
                </td>
                <td className="py-3 px-3 text-right text-[#235189]">
                  {formatPercent(civil.shareOfTotalExecuted)}
                </td>
                <td className="py-3 px-3 text-right text-[#1f674e]">
                  {formatCurrency(alumbrado.accumulatedValue)}
                </td>
                <td className="py-3 px-3 text-right text-[#1f674e]">
                  {formatPercent(alumbrado.shareOfTotalExecuted)}
                </td>
                <td className="py-3 px-3 text-right text-[#0b1724] border-r border-[#cbd7d4]">
                  {formatCurrency(
                    electric.accumulatedValue + civil.accumulatedValue + alumbrado.accumulatedValue
                  )}
                </td>
                <td className="py-3 px-3 text-right text-[#0b1724]">
                  {formatCurrency(
                    electric.accumulatedValue + civil.accumulatedValue + alumbrado.accumulatedValue
                  )}
                </td>
                <td className="py-3 px-3 text-right text-[#235189] border-r border-[#cbd7d4]">
                  {formatPercent(
                    totalContractedDirect
                      ? (electric.accumulatedValue + civil.accumulatedValue + alumbrado.accumulatedValue) /
                          totalContractedDirect
                      : 0
                  )}
                </td>
                <td className="py-3 px-3 text-right text-[#a06800]">
                  {formatCurrency(
                    electric.balanceValue + civil.balanceValue + alumbrado.balanceValue
                  )}
                </td>
                <td className="py-3 px-3 text-right text-[#a06800]">
                  {formatPercent(
                    totalContractedDirect
                      ? (electric.balanceValue + civil.balanceValue + alumbrado.balanceValue) /
                          totalContractedDirect
                      : 0
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* BANNER DE ACCESO DIRECTO AL FILTRO ENFOCADO EN ACTIVIDADES POR FACTURAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#fff9ed] via-[#fdf7ea] to-[#f4f7fb] border-2 border-[#e5a83b] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#e5a83b] text-[#0b1724] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-display font-bold text-[#0b1724]">
                Filtro Enfocado: Actividades por Facturar (Civiles y Eléctricas en Detalle)
              </strong>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#e5a83b] text-[#0b1724] rounded-full">
                Filtro Específico
              </span>
            </div>
            <p className="text-xs font-mono text-[#6c5828] mt-1 max-w-2xl">
              Filtra exclusivamente las partidas que tienen saldo pendiente de cobro. Compara en detalle el saldo eléctrico ({formatCompact(electric.balanceValue)}) frente al saldo civil ({formatCompact(civil.balanceValue)}) con cantidades faltantes y valores con AIU.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setExecutionFilter('pending_electric')
                  setFilterType('all')
                }}
                className={`px-3 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  executionFilter === 'pending_electric'
                    ? 'bg-[#e5a83b] text-[#0b1724] border-[#e5a83b] shadow-xs ring-2 ring-[#e5a83b]/30'
                    : 'bg-white text-[#a06800] border-[#f8d58a] hover:bg-[#fff6e3]'
                }`}
              >
                <Zap size={13} />
                <span>⚡ Solo Eléctricas con Saldo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExecutionFilter('pending_civil')
                  setFilterType('all')
                }}
                className={`px-3 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  executionFilter === 'pending_civil'
                    ? 'bg-[#4673a7] text-white border-[#4673a7] shadow-xs ring-2 ring-[#4673a7]/30'
                    : 'bg-white text-[#235189] border-[#c3d5ee] hover:bg-[#eff4fb]'
                }`}
              >
                <HardHat size={13} />
                <span>🏗️ Solo Civiles con Saldo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExecutionFilter('pending_balance')
                  setFilterType('all')
                }}
                className={`px-3 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                  executionFilter === 'pending_balance'
                    ? 'bg-[#0b1724] text-white border-[#0b1724] shadow-xs ring-2 ring-[#0b1724]/30'
                    : 'bg-white text-[#4d5f6b] border-[#cbd8d4] hover:bg-[#fafcfb]'
                }`}
              >
                <Clock size={13} />
                <span>⏳ Todas con Saldo</span>
              </button>
            </div>
          </div>
        </div>
        {onNavigateToPending && (
          <button
            type="button"
            onClick={onNavigateToPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold bg-[#0b1724] text-[#f8c866] hover:bg-[#1a2d3e] rounded-xl transition-all shadow-sm shrink-0"
          >
            <span>Ver Informe Detallado de Saldos</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* SECTION: CLASIFICACIÓN ÍTEM POR ÍTEM CON FILTRO POR ACTA */}
      <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0b1724]" />
              Inventario de Partidas Contractuales
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
              Clasificación Ítem por Ítem ({filteredItems.length} de {report.items.length} partidas)
            </h3>
            <p className="text-xs font-mono text-[#667882] mt-0.5">
              Filtra por acta individual para inspeccionar qué partidas específicas se cobraron en ese corte y su saldo pendiente.
            </p>
          </div>

          {/* View mode and sticky toggle */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {viewMode === 'table' && (
              <button
                type="button"
                onClick={() => setIsStickyPinned(!isStickyPinned)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                  isStickyPinned
                    ? 'bg-[#0b1724] text-[#f8c866] border-[#0b1724] shadow-xs'
                    : 'bg-white text-[#526470] border-[#d4dedb] hover:bg-[#fafcfb]'
                }`}
                title={
                  isStickyPinned
                    ? 'Desactivar inmovilización de columnas de Ítem y Descripción'
                    : 'Inmovilizar columnas de Ítem y Descripción'
                }
              >
                <Pin size={13} className={isStickyPinned ? 'rotate-45 text-[#f8c866]' : 'text-[#7e909a]'} />
                <span>{isStickyPinned ? 'Ítem y Desc. Inmovilizados' : 'Inmovilizar Ítem y Desc.'}</span>
              </button>
            )}

            <div className="inline-flex p-0.5 rounded-lg bg-[#f0f4f2] border border-[#e1e7e5] text-xs font-mono">
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
                <span>Vista Tabla</span>
              </button>
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
                <span>Vista Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        {/* 1. FILTRO PRINCIPAL POR ACTA */}
        <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dce6e2] space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-[#0b1724] flex items-center gap-1.5">
              <Calendar size={14} className="text-[#2e8564]" />
              <span>Filtrar por Acta de Obra:</span>
            </span>
            <span className="text-[11px] font-mono text-[#627580]">
              {selectedActFilter === 'all'
                ? 'Visualizando valores acumulados históricos'
                : `Auditando ejecución puntual de Acta No. ${selectedActFilter}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setSelectedActFilter('all')
                setExecutionFilter('all')
              }}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                selectedActFilter === 'all'
                  ? 'bg-[#0b1724] text-white border-[#0b1724] shadow-xs'
                  : 'bg-white text-[#556772] border-[#d6e0dd] hover:border-[#a1b7b0] hover:bg-[#fafcfb]'
              }`}
            >
              🌐 Todas las Actas (Acumulado)
            </button>

            {report.acts.map((act) => {
              const isCurrent = selectedActFilter === act.number
              const countInAct = report.items.filter((it) => {
                const a = it.acts.find((entry) => entry.actNumber === act.number)
                return a && a.value > 0
              }).length

              return (
                <button
                  key={act.number}
                  type="button"
                  onClick={() => {
                    setSelectedActFilter(act.number)
                    if (onSelectAct) onSelectAct(act.number)
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-[#2e8564] text-white border-[#2e8564] shadow-xs'
                      : 'bg-white text-[#3f535e] border-[#d6e0dd] hover:border-[#2e8564] hover:bg-[#f3faf6]'
                  }`}
                >
                  <span>Acta No. {act.number}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-white/20 text-white' : 'bg-[#eef3f1] text-[#346b57]'
                    }`}
                  >
                    {countInAct} ítems
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9c99]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descripción, código o partida (ej: 3.59, cable, caja, PVC)..."
                className="w-full pl-9 pr-8 py-2 text-xs font-mono rounded-lg border border-[#d6e0dd] bg-[#fbfcfa] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2e8564]/30 focus:border-[#2e8564] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#8c9c99] hover:text-[#0b1724]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Discipline Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[11px] text-[#71828d] mr-1 hidden sm:inline">Especialidad:</span>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  filterType === 'all'
                    ? 'bg-[#0b1724] text-white border-[#0b1724]'
                    : 'bg-white text-[#647580] border-[#d6e0dd] hover:border-[#a3b8b3]'
                }`}
              >
                Todas ({report.items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Electrico')}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  filterType === 'Electrico'
                    ? 'bg-[#e5a83b] text-[#0b1724] font-bold border-[#e5a83b]'
                    : 'bg-[#fffaf0] text-[#a06800] border-[#f8d58a] hover:bg-[#fff3db]'
                }`}
              >
                ⚡ Eléctrico ({electric.itemCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Civil')}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  filterType === 'Civil'
                    ? 'bg-[#4673a7] text-white font-bold border-[#4673a7]'
                    : 'bg-[#f3f7fd] text-[#235189] border-[#c3d5ee] hover:bg-[#e8eff8]'
                }`}
              >
                🏗️ Civil ({civil.itemCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Alumbrado')}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  filterType === 'Alumbrado'
                    ? 'bg-[#3b8f71] text-white font-bold border-[#3b8f71]'
                    : 'bg-[#f0faf5] text-[#1f674e] border-[#b9ded1] hover:bg-[#e5f3ee]'
                }`}
              >
                💡 Alumbrado ({alumbrado.itemCount})
              </button>
            </div>
          </div>

          {/* Status in Cut Subfilter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono pt-1">
            <span className="text-[11px] text-[#71828d] mr-1">Estado de Facturación:</span>
            <button
              type="button"
              onClick={() => setExecutionFilter('all')}
              className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                executionFilter === 'all'
                  ? 'bg-[#4a5e69] text-white border-[#4a5e69] font-semibold'
                  : 'bg-[#f5f8f7] text-[#596d79] border-[#d8e2df] hover:bg-[#edf2f0]'
              }`}
            >
              Todos ({filteredItems.length})
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('billed_in_cut')}
              className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                executionFilter === 'billed_in_cut'
                  ? 'bg-[#2e8564] text-white border-[#2e8564] font-semibold'
                  : 'bg-[#eef8f3] text-[#1f674e] border-[#b9e0ce] hover:bg-[#dff0e7]'
              }`}
            >
              🟢 Cobrados en {selectedActFilter === 'all' ? 'el proyecto' : `Acta ${selectedActFilter}`}
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('pending_electric')}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all ${
                executionFilter === 'pending_electric'
                  ? 'bg-[#e5a83b] text-[#0b1724] border-[#e5a83b] shadow-2xs'
                  : 'bg-[#fffaf0] text-[#a06800] border-[#f8d58a] hover:bg-[#fff2d6]'
              }`}
            >
              ⚡ Eléctricas por facturar
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('pending_civil')}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all ${
                executionFilter === 'pending_civil'
                  ? 'bg-[#4673a7] text-white border-[#4673a7] shadow-2xs'
                  : 'bg-[#f3f7fd] text-[#235189] border-[#c3d5ee] hover:bg-[#e6effa]'
              }`}
            >
              🏗️ Civiles por facturar
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('pending_balance')}
              className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-all ${
                executionFilter === 'pending_balance'
                  ? 'bg-[#b0791a] text-white border-[#b0791a] shadow-2xs'
                  : 'bg-[#fffaf0] text-[#a06800] border-[#f8d58a] hover:bg-[#fff2d6]'
              }`}
            >
              ⏳ Todas por facturar
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('completed')}
              className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                executionFilter === 'completed'
                  ? 'bg-[#235189] text-white border-[#235189] font-semibold'
                  : 'bg-[#f3f7fd] text-[#235189] border-[#c3d5ee] hover:bg-[#e4effc]'
              }`}
            >
              ✅ 100% Ejecutadas
            </button>
            <button
              type="button"
              onClick={() => setExecutionFilter('zero_in_cut')}
              className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                executionFilter === 'zero_in_cut'
                  ? 'bg-[#6b7280] text-white border-[#6b7280] font-semibold'
                  : 'bg-[#f3f4f6] text-[#6b7280] border-[#d1d5db] hover:bg-[#e5e7eb]'
              }`}
            >
              ⚪ Sin cobro en {selectedActFilter === 'all' ? 'el proyecto' : `Acta ${selectedActFilter}`}
            </button>
          </div>

          {/* Contextual Alert for Unbilled Filtering */}
          {(executionFilter === 'pending_electric' ||
            executionFilter === 'pending_civil' ||
            executionFilter === 'pending_balance') && (
            <div className="p-3 rounded-lg bg-[#fffaf0] border border-[#f8d58a] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e5a83b] shrink-0" />
                <span className="text-[#a06800]">
                  Filtro enfocado activo:{' '}
                  <b>
                    {executionFilter === 'pending_electric'
                      ? '⚡ Actividades Eléctricas con Saldo por Facturar'
                      : executionFilter === 'pending_civil'
                      ? '🏗️ Obras Civiles con Saldo por Facturar'
                      : '⏳ Todas las Actividades con Saldo por Facturar'}
                  </b>{' '}
                  ({filteredItems.length} partidas)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#0b1724]">
                  Saldo Directo Filtrado:{' '}
                  <b>{formatCurrency(filteredItems.reduce((s, it) => s + it.balanceAtCut, 0))}</b>
                </span>
                {onNavigateToPending && (
                  <button
                    type="button"
                    onClick={onNavigateToPending}
                    className="underline text-[#a06800] font-bold hover:text-[#0b1724]"
                  >
                    Ver análisis completo de saldos →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. DYNAMIC EXECUTIVE SUMMARY BANNER FOR THE SELECTED ACTA */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#f7fbf9] via-[#fffdf8] to-[#f5f8fb] border border-[#d6e3df] text-xs font-mono shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#0b1724] text-[#f8c866] font-bold text-[11px]">
                  {actFilterMetrics.title}
                </span>
                <span className="text-[#596e7a]">
                  <b>{actFilterMetrics.billedItemsCount}</b> de {actFilterMetrics.totalItemsCount} partidas facturaron en este corte
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs">
                <span className="text-[#1f674e] font-bold flex items-center gap-1">
                  🟢 Total Cobrado en Corte: <span>{formatCurrency(actFilterMetrics.billedInCut)}</span>
                </span>
                <span className="text-[#a06800] font-semibold">
                  ⚡ Eléctrico: {formatCurrency(actFilterMetrics.electricInCut)} ({formatPercent(actFilterMetrics.billedInCut ? actFilterMetrics.electricInCut / actFilterMetrics.billedInCut : 0)})
                </span>
                <span className="text-[#235189] font-semibold">
                  🏗️ Civil: {formatCurrency(actFilterMetrics.civilInCut)} ({formatPercent(actFilterMetrics.billedInCut ? actFilterMetrics.civilInCut / actFilterMetrics.billedInCut : 0)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#dbe6e2] pt-2 md:pt-0 md:pl-4 shrink-0 text-right">
              <div>
                <span className="text-[10px] text-[#556975] uppercase block">Acumulado a este corte:</span>
                <strong className="text-[#2e8564] font-bold block text-sm">
                  {formatCompact(actFilterMetrics.accumulatedToDate)} COP ({formatPercent(actFilterMetrics.accumulatedPct)})
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-[#556975] uppercase block">Por Facturar (Saldo):</span>
                <strong className="text-[#a06800] font-bold block text-sm">
                  {formatCompact(actFilterMetrics.pendingBalance)} COP ({formatPercent(actFilterMetrics.pendingPct)})
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4. CONTENT TABLE OR CARDS */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-xl border border-[#e1e7e5] shadow-xs overflow-hidden">
            {/* Table Header Controls & Freeze Guidance Banner */}
            <div className="p-3 bg-[#f7faf8] border-b border-[#dfe5e4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#0b1724]">Clasificación y Trazabilidad por Partida</span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    isStickyPinned
                      ? 'bg-[#0b1724] text-[#f8c866] border-[#0b1724]'
                      : 'bg-[#f0f4f2] text-[#556772] border-[#d8e2df]'
                  }`}
                >
                  <Pin size={11} className={isStickyPinned ? 'rotate-45 text-[#f8c866]' : ''} />
                  <span>
                    {isStickyPinned
                      ? 'Ítem y Descripción Inmovilizados'
                      : 'Inmovilización desactivada'}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStickyPinned(!isStickyPinned)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${
                    isStickyPinned
                      ? 'bg-[#e5a83b] text-[#0b1724] border-[#d4992f] shadow-2xs hover:bg-[#dba032]'
                      : 'bg-white text-[#4b5e69] border-[#cbd7d4] hover:bg-[#f0f4f2]'
                  }`}
                >
                  {isStickyPinned ? <PinOff size={12} /> : <Pin size={12} className="rotate-45 text-[#a06800]" />}
                  <span>{isStickyPinned ? 'Liberar Columnas' : 'Inmovilizar Columnas'}</span>
                </button>

                {isStickyPinned && (
                  <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#5c6e7a] bg-white px-2 py-0.5 rounded-md border border-[#dfe5e4]">
                    <span>Desplaza a la derecha</span>
                    <span className="text-[#a06800] font-bold">👉</span>
                    <span>para ver columnas en corte y saldos</span>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto max-h-[620px] overflow-y-auto relative">
              <table
                className={`w-full text-left text-xs font-mono whitespace-nowrap ${
                  isStickyPinned ? 'border-separate border-spacing-0' : 'border-collapse'
                }`}
              >
                <thead className="sticky top-0 z-20 bg-[#f5f8f7] text-[#5e707b] border-b border-[#dfe5e4]">
                  {/* Super-headers */}
                  <tr className="border-b border-[#cbd7d4] text-[10px] uppercase font-bold tracking-wider">
                    {isStickyPinned ? (
                      <>
                        <th
                          colSpan={2}
                          className="py-2 px-3 sticky left-0 z-30 bg-[#e4ede9] text-[#0b1724] font-bold border-r-2 border-[#b9c9c5] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)] border-b border-[#cbd7d4]"
                        >
                          <div className="flex items-center gap-1.5">
                            <Pin size={11} className="rotate-45 text-[#a06800]" />
                            <span>Partida Inmovilizada (Ítem / Obra)</span>
                          </div>
                        </th>
                        <th
                          colSpan={3}
                          className="py-2 px-3 bg-[#f0f4f2] text-[#4d606d] text-center border-r border-[#dfe5e4] border-b border-[#cbd7d4]"
                        >
                          Clasificación y P.U.
                        </th>
                      </>
                    ) : (
                      <th
                        colSpan={5}
                        className="py-2 px-3 bg-[#f0f4f2] text-[#4d606d] border-r border-[#dfe5e4] border-b border-[#cbd7d4]"
                      >
                        Especificación de la Partida
                      </th>
                    )}
                    <th
                      colSpan={2}
                      className="py-2 px-3 bg-[#eef3f6] text-[#2b4c68] text-center border-r border-[#cbd7d4] border-b border-[#cbd7d4]"
                    >
                      Contrato Base
                    </th>
                    <th
                      colSpan={2}
                      className="py-2 px-3 bg-[#e8f4ee] text-[#1f674e] text-center border-r border-[#cbd7d4] border-b border-[#cbd7d4]"
                    >
                      🟢 {selectedActFilter === 'all' ? '1. Total Facturado' : `1. Cobrado en Acta ${selectedActFilter}`}
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 bg-[#f2f6fa] text-[#235189] text-center border-r border-[#cbd7d4] border-b border-[#cbd7d4]"
                    >
                      📈 2. Ejecutado Acumulado
                    </th>
                    <th
                      colSpan={3}
                      className="py-2 px-3 bg-[#fff9ed] text-[#a06800] text-center border-b border-[#cbd7d4]"
                    >
                      ⏳ 3. Por Facturar (Saldo Pendiente)
                    </th>
                  </tr>
                  {/* Columns */}
                  <tr>
                    <th
                      className={`py-2.5 px-3 font-semibold border-b border-[#dfe5e4] w-20 min-w-[5rem] max-w-[5rem] ${
                        isStickyPinned ? 'sticky left-0 z-30 bg-[#f5f8f7] border-r border-[#dfe5e4]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>Ítem</span>
                        {isStickyPinned && <Pin size={10} className="text-[#a06800] rotate-45 shrink-0" />}
                      </div>
                    </th>
                    <th
                      className={`py-2.5 px-3 font-semibold border-b border-[#dfe5e4] min-w-[240px] sm:min-w-[300px] max-w-[320px] sm:max-w-md ${
                        isStickyPinned
                          ? 'sticky left-20 z-30 bg-[#f5f8f7] border-r-2 border-[#b9c9c5] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)]'
                          : ''
                      }`}
                    >
                      Descripción
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center border-b border-[#dfe5e4]">Especialidad</th>
                    <th className="py-2.5 px-3 font-semibold text-center border-b border-[#dfe5e4]">UND</th>
                    <th className="py-2.5 px-3 font-semibold text-right border-r border-[#dfe5e4] border-b border-[#dfe5e4]">
                      P. Unitario
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#f8fafc] border-b border-[#dfe5e4]">
                      Cant. Cont.
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#eef3f6] text-[#0b1724] border-r border-[#cbd7d4] border-b border-[#dfe5e4]">
                      Total Contratado
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-[#1f674e] bg-[#f2faf5] border-b border-[#dfe5e4]">
                      Cant. en Corte
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-[#1f674e] font-bold bg-[#e8f4ee] border-r border-[#cbd7d4] border-b border-[#dfe5e4]">
                      Valor en Corte ($)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#f8fbfe] border-b border-[#dfe5e4]">
                      Cant. Acum.
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#f2f6fa] text-[#235189] font-medium border-b border-[#dfe5e4]">
                      Valor Acum. ($)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#f2f6fa] text-[#235189] font-bold border-r border-[#cbd7d4] border-b border-[#dfe5e4]">
                      % Avance
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#fffdfa] border-b border-[#dfe5e4]">
                      Cant. Saldo
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#fff9ed] text-[#a06800] font-medium border-b border-[#dfe5e4]">
                      Saldo Restante ($)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right bg-[#fff9ed] text-[#a06800] font-bold border-b border-[#dfe5e4]">
                      % Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {filteredItems.map((item) => {
                    const conf = DISCIPLINE_CONFIG[item.discipline]
                    const hasBillingInCut = item.valInCut > 0
                    const stickyBg = hasBillingInCut ? 'bg-[#fcfefd]' : 'bg-white'

                    return (
                      <tr
                        key={item.row}
                        className={`group hover:bg-[#f8faf9] transition-colors ${
                          hasBillingInCut ? 'bg-[#fcfefd]' : ''
                        }`}
                      >
                        {/* Col 1: Ítem (Frozen) */}
                        <td
                          className={`py-2 px-3 font-bold text-[#0b1724] w-20 min-w-[5rem] max-w-[5rem] border-b border-[#edf1ef] ${
                            isStickyPinned
                              ? `sticky left-0 z-10 ${stickyBg} group-hover:bg-[#f8faf9] border-r border-[#dfe5e4]`
                              : ''
                          }`}
                        >
                          <span className="truncate block">{item.code || `R${item.row}`}</span>
                        </td>

                        {/* Col 2: Descripción (Frozen with shadow divider) */}
                        <td
                          className={`py-2 px-3 whitespace-normal font-sans text-xs text-[#253745] min-w-[240px] sm:min-w-[300px] max-w-[280px] sm:max-w-md border-b border-[#edf1ef] ${
                            isStickyPinned
                              ? `sticky left-20 z-10 ${stickyBg} group-hover:bg-[#f8faf9] border-r-2 border-[#b9c9c5] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]`
                              : ''
                          }`}
                        >
                          <div className="line-clamp-2 sm:line-clamp-none">{item.description}</div>
                        </td>

                        {/* Col 3: Especialidad */}
                        <td className="py-2 px-3 text-center border-b border-[#edf1ef]">
                          {onUpdateDiscipline ? (
                            <select
                              value={item.discipline}
                              onChange={(e) => onUpdateDiscipline(item.row, e.target.value as DisciplineType)}
                              className="text-[11px] font-mono font-semibold py-0.5 px-1.5 rounded-md border focus:outline-hidden cursor-pointer"
                              style={{
                                backgroundColor: conf.badgeBg,
                                borderColor: conf.badgeBorder,
                                color: conf.badgeText,
                              }}
                            >
                              <option value="Electrico">⚡ Eléctrico</option>
                              <option value="Civil">🏗️ Civil</option>
                              <option value="Alumbrado">💡 Alumbrado</option>
                            </select>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: conf.badgeBg,
                                borderColor: conf.badgeBorder,
                                color: conf.badgeText,
                              }}
                            >
                              {conf.shortLabel}
                            </span>
                          )}
                        </td>

                        {/* Col 4: Unidad */}
                        <td className="py-2 px-3 text-center text-[#677984] border-b border-[#edf1ef]">{item.unit}</td>

                        {/* Col 5: Precio Unitario */}
                        <td className="py-2 px-3 text-right text-[#576974] border-r border-[#dfe5e4] border-b border-[#edf1ef]">
                          {formatCurrency(item.unitPrice)}
                        </td>

                        {/* Col 6: Cantidad Contratada */}
                        <td className="py-2 px-3 text-right bg-[#fafcfd] border-b border-[#edf1ef]">{item.contractedQty}</td>

                        {/* Col 7: Total Contratado */}
                        <td className="py-2 px-3 text-right font-medium text-[#0b1724] bg-[#f4f7f9] border-r border-[#cbd7d4] border-b border-[#edf1ef]">
                          {formatCurrency(item.contractedTotal)}
                        </td>

                        {/* Facturado en este corte */}
                        <td className="py-2 px-3 text-right bg-[#fafdfb] text-[#1f674e] border-b border-[#edf1ef]">
                          {item.qtyInCut > 0 ? item.qtyInCut : '0'}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold border-r border-[#cbd7d4] border-b border-[#edf1ef] ${
                            hasBillingInCut ? 'text-[#1f674e] bg-[#eef7f3]' : 'text-[#8799a5] bg-[#fafdfb]'
                          }`}
                        >
                          {formatCurrency(item.valInCut)}
                        </td>

                        {/* Ejecutado Acumulado */}
                        <td className="py-2 px-3 text-right bg-[#fafcfe] border-b border-[#edf1ef]">{item.accumQtyAtCut}</td>
                        <td className="py-2 px-3 text-right text-[#0b1724] bg-[#f5f8fc] border-b border-[#edf1ef]">
                          {formatCurrency(item.accumAtCut)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#235189] bg-[#f0f4f9] border-r border-[#cbd7d4] border-b border-[#edf1ef]">
                          {formatPercent(item.progressPctAtCut)}
                        </td>

                        {/* Por Facturar / Saldo */}
                        <td className="py-2 px-3 text-right bg-[#fffefa] border-b border-[#edf1ef]">{item.balanceQtyAtCut}</td>
                        <td className="py-2 px-3 text-right font-medium text-[#a06800] bg-[#fffdf7] border-b border-[#edf1ef]">
                          {formatCurrency(item.balanceAtCut)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#a06800] bg-[#fff9ed] border-b border-[#edf1ef]">
                          {formatPercent(item.balancePctAtCut)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const conf = DISCIPLINE_CONFIG[item.discipline]
              const hasBillingInCut = item.valInCut > 0

              return (
                <div
                  key={item.row}
                  className={`p-4 rounded-xl border-2 transition-all shadow-xs flex flex-col justify-between ${
                    hasBillingInCut
                      ? 'border-[#2e8564]/50 bg-[#fbfdfc]'
                      : 'border-[#dfe5e4] bg-[#fbfcfa] hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 bg-[#0b1724] text-[#f8c866] rounded-md">
                          {item.code || `R${item.row}`}
                        </span>
                        <span
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: conf.badgeBg,
                            borderColor: conf.badgeBorder,
                            color: conf.badgeText,
                          }}
                        >
                          {conf.shortLabel}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#0b1724]">
                        {formatPercent(item.progressPctAtCut)} Avance
                      </span>
                    </div>

                    <h4 className="font-sans font-semibold text-xs sm:text-sm text-[#0b1724] mt-2 leading-snug">
                      {item.description}
                    </h4>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#e8edeb] h-1.5 rounded-full mt-3 overflow-hidden flex">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          backgroundColor: conf.color,
                          width: `${Math.min(100, Math.max(0, item.progressPctAtCut * 100))}%`,
                        }}
                      />
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#edf1ef] text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[#73828c] uppercase block">Contratado</span>
                        <strong className="text-[#0b1724] font-semibold block mt-0.5 truncate" title={formatCurrency(item.contractedTotal)}>
                          {formatCompact(item.contractedTotal)} COP
                        </strong>
                        <span className="text-[10px] text-[#697984]">
                          {item.contractedQty} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#1f674e] uppercase font-bold block flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2e8564]" />
                          Ejecutado
                        </span>
                        <strong className="text-[#2e8564] font-semibold block mt-0.5 truncate" title={formatCurrency(item.accumAtCut)}>
                          {formatCompact(item.accumAtCut)} COP
                        </strong>
                        <span className="text-[10px] text-[#4d7866]">
                          {formatPercent(item.progressPctAtCut)} avance
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#a06800] uppercase font-bold block flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e5a83b]" />
                          Por Facturar
                        </span>
                        <strong className="text-[#b0791a] font-semibold block mt-0.5 truncate" title={formatCurrency(item.balanceAtCut)}>
                          {formatCompact(item.balanceAtCut)} COP
                        </strong>
                        <span className="text-[10px] text-[#8c6b2b]">
                          {formatPercent(item.balancePctAtCut)} saldo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Cobro específico en el corte */}
                  <div className="mt-3 pt-2.5 border-t border-[#edf1ef] flex items-center justify-between text-[11px] font-mono">
                    <span className={hasBillingInCut ? 'text-[#1f674e] font-bold' : 'text-[#6c7d87]'}>
                      Cobro en {selectedActFilter === 'all' ? 'el proyecto' : `Acta ${selectedActFilter}`}:{' '}
                      <b>{formatCurrency(item.valInCut)}</b> ({item.qtyInCut} {item.unit})
                    </span>
                    <span className="text-[#72838e]">
                      P.U: {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
