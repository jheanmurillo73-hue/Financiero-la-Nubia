import React, { useState, useMemo } from 'react'
import {
  Zap,
  HardHat,
  Lightbulb,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  Coins,
  CheckCircle2,
  Calendar,
  Layers,
  Table2,
  LayoutGrid,
  ChevronRight,
  TrendingDown,
  Info,
  Pin,
  PinOff,
  Calculator,
  Copy,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  X,
  ListFilter,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import { DISCIPLINE_CONFIG } from '../lib/parseActa'
import type { DisciplineType, FinancialReport, LineItem } from '../lib/model'

interface PendingActivitiesFocusViewProps {
  report: FinancialReport
  selectedActNumber: number
  onUpdateDiscipline?: (rowNumber: number, newDiscipline: DisciplineType) => void
  onSelectAct?: (actNumber: number) => void
  onNavigateToDisciplines?: () => void
}

type PendingDisciplineFilter = 'all' | 'Electrico' | 'Civil' | 'Alumbrado' | 'Electrico_Civil'
type PendingStageFilter = 'all' | 'not_started' | 'in_progress'
type PendingThresholdFilter = 'all' | 'gt_1m' | 'gt_5m'
type PendingSortBy = 'balance_desc' | 'balance_asc' | 'pct_desc' | 'contracted_desc' | 'code_asc'

export const PendingActivitiesFocusView: React.FC<PendingActivitiesFocusViewProps> = ({
  report,
  selectedActNumber,
  onUpdateDiscipline,
  onSelectAct,
  onNavigateToDisciplines,
}) => {
  // Primary Discipline filter focused on Civil & Eléctrico
  const [disciplineFilter, setDisciplineFilter] = useState<PendingDisciplineFilter>('all')
  // Stage filter: All unbilled vs completely unstarted (0% execution) vs partially billed
  const [stageFilter, setStageFilter] = useState<PendingStageFilter>('all')
  // Threshold filter: All balances vs >$1M COP vs >$5M COP (critical balances)
  const [thresholdFilter, setThresholdFilter] = useState<PendingThresholdFilter>('all')
  // Search query
  const [search, setSearch] = useState('')
  // Sort order
  const [sortBy, setSortBy] = useState<PendingSortBy>('balance_desc')
  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  // Frozen / Sticky columns toggle for Ítem & Descripción (enabled by default for optimal horizontal scrolling)
  const [isStickyPinned, setIsStickyPinned] = useState<boolean>(true)
  // Interactive activity selection for Partial Sums (Sumas Parciales)
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(new Set())
  const [showOnlySelected, setShowOnlySelected] = useState<boolean>(false)
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false)
  // Cutoff filter: calculate pending balances up to a specific Acta cut or overall project
  const [cutoffAct, setCutoffAct] = useState<'overall' | number>('overall')

  // Calculate AIU factor for direct -> gross conversion
  const aiuMultiplier = useMemo(() => {
    if (report.directCostContracted > 0 && report.grossBudget > 0) {
      return report.grossBudget / report.directCostContracted
    }
    const p = report.params
    return 1 + p.administration + p.contingencies + p.utility + (p.utility * p.ivaUtility)
  }, [report.directCostContracted, report.grossBudget, report.params])

  // Extract all items with pending balance according to the cutoff
  const itemsWithBalances = useMemo(() => {
    return report.items.map((item) => {
      let accumVal = item.accumulatedValue
      let accumQty = item.accumulatedQty

      if (cutoffAct !== 'overall') {
        const filteredActs = item.acts.filter((a) => a.actNumber <= cutoffAct)
        accumVal = filteredActs.reduce((s, a) => s + a.value, 0)
        accumQty = filteredActs.reduce((s, a) => s + a.qty, 0)
      }

      const balanceDirect = Math.max(0, item.contractedTotal - accumVal)
      const balanceQty = Math.max(0, item.contractedQty - accumQty)
      const balanceGrossWithAiu = balanceDirect * aiuMultiplier
      const progressPct = item.contractedTotal > 0 ? accumVal / item.contractedTotal : 0
      const balancePct = Math.max(0, 1 - progressPct)

      let stage: 'not_started' | 'in_progress' | 'completed' = 'completed'
      if (accumVal === 0 && item.contractedTotal > 0) {
        stage = 'not_started'
      } else if (balanceDirect > 0) {
        stage = 'in_progress'
      }

      return {
        ...item,
        accumValAtCut: accumVal,
        accumQtyAtCut: accumQty,
        balanceDirect,
        balanceQty,
        balanceGrossWithAiu,
        progressPct,
        balancePct,
        stage,
      }
    })
  }, [report.items, cutoffAct, aiuMultiplier])

  // Aggregate metrics by discipline specifically for unbilled balances
  const pendingMetrics = useMemo(() => {
    const electricItems = itemsWithBalances.filter((it) => it.discipline === 'Electrico')
    const civilItems = itemsWithBalances.filter((it) => it.discipline === 'Civil')
    const alumbradoItems = itemsWithBalances.filter((it) => it.discipline === 'Alumbrado')

    const electricPendingItems = electricItems.filter((it) => it.balanceDirect > 0)
    const civilPendingItems = civilItems.filter((it) => it.balanceDirect > 0)
    const alumbradoPendingItems = alumbradoItems.filter((it) => it.balanceDirect > 0)

    const electricBalanceDirect = electricPendingItems.reduce((s, it) => s + it.balanceDirect, 0)
    const civilBalanceDirect = civilPendingItems.reduce((s, it) => s + it.balanceDirect, 0)
    const alumbradoBalanceDirect = alumbradoPendingItems.reduce((s, it) => s + it.balanceDirect, 0)
    const totalBalanceDirect = electricBalanceDirect + civilBalanceDirect + alumbradoBalanceDirect

    const electricBalanceGross = electricBalanceDirect * aiuMultiplier
    const civilBalanceGross = civilBalanceDirect * aiuMultiplier
    const alumbradoBalanceGross = alumbradoBalanceDirect * aiuMultiplier
    const totalBalanceGross = totalBalanceDirect * aiuMultiplier

    // Top pending items
    const sortedElectric = [...electricPendingItems].sort((a, b) => b.balanceDirect - a.balanceDirect)
    const sortedCivil = [...civilPendingItems].sort((a, b) => b.balanceDirect - a.balanceDirect)

    return {
      electric: {
        balanceDirect: electricBalanceDirect,
        balanceGross: electricBalanceGross,
        totalItems: electricItems.length,
        pendingItemsCount: electricPendingItems.length,
        notStartedCount: electricPendingItems.filter((it) => it.stage === 'not_started').length,
        inProgressCount: electricPendingItems.filter((it) => it.stage === 'in_progress').length,
        shareOfTotalPending: totalBalanceDirect > 0 ? electricBalanceDirect / totalBalanceDirect : 0,
        topItem: sortedElectric[0] || null,
      },
      civil: {
        balanceDirect: civilBalanceDirect,
        balanceGross: civilBalanceGross,
        totalItems: civilItems.length,
        pendingItemsCount: civilPendingItems.length,
        notStartedCount: civilPendingItems.filter((it) => it.stage === 'not_started').length,
        inProgressCount: civilPendingItems.filter((it) => it.stage === 'in_progress').length,
        shareOfTotalPending: totalBalanceDirect > 0 ? civilBalanceDirect / totalBalanceDirect : 0,
        topItem: sortedCivil[0] || null,
      },
      alumbrado: {
        balanceDirect: alumbradoBalanceDirect,
        balanceGross: alumbradoBalanceGross,
        totalItems: alumbradoItems.length,
        pendingItemsCount: alumbradoPendingItems.length,
        shareOfTotalPending: totalBalanceDirect > 0 ? alumbradoBalanceDirect / totalBalanceDirect : 0,
      },
      total: {
        balanceDirect: totalBalanceDirect,
        balanceGross: totalBalanceGross,
        totalItems: report.items.length,
        pendingItemsCount:
          electricPendingItems.length + civilPendingItems.length + alumbradoPendingItems.length,
        notStartedCount: itemsWithBalances.filter((it) => it.balanceDirect > 0 && it.stage === 'not_started').length,
        inProgressCount: itemsWithBalances.filter((it) => it.balanceDirect > 0 && it.stage === 'in_progress').length,
      },
    }
  }, [itemsWithBalances, aiuMultiplier, report.items.length])

  // Filter and sort items with pending balance
  const filteredPendingItems = useMemo(() => {
    // 1. Only items with positive remaining balance (> $0.01)
    let list = itemsWithBalances.filter((it) => it.balanceDirect > 0.01)

    // 2. Discipline filter
    if (disciplineFilter === 'Electrico') {
      list = list.filter((it) => it.discipline === 'Electrico')
    } else if (disciplineFilter === 'Civil') {
      list = list.filter((it) => it.discipline === 'Civil')
    } else if (disciplineFilter === 'Alumbrado') {
      list = list.filter((it) => it.discipline === 'Alumbrado')
    } else if (disciplineFilter === 'Electrico_Civil') {
      list = list.filter((it) => it.discipline === 'Electrico' || it.discipline === 'Civil')
    }

    // 3. Stage filter
    if (stageFilter === 'not_started') {
      list = list.filter((it) => it.stage === 'not_started')
    } else if (stageFilter === 'in_progress') {
      list = list.filter((it) => it.stage === 'in_progress')
    }

    // 4. Threshold filter
    if (thresholdFilter === 'gt_1m') {
      list = list.filter((it) => it.balanceDirect >= 1_000_000)
    } else if (thresholdFilter === 'gt_5m') {
      list = list.filter((it) => it.balanceDirect >= 5_000_000)
    }

    // 5. Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (it) => it.description.toLowerCase().includes(q) || it.code.toLowerCase().includes(q)
      )
    }

    // 6. Sorting
    if (sortBy === 'balance_desc') {
      list.sort((a, b) => b.balanceDirect - a.balanceDirect)
    } else if (sortBy === 'balance_asc') {
      list.sort((a, b) => a.balanceDirect - b.balanceDirect)
    } else if (sortBy === 'pct_desc') {
      list.sort((a, b) => b.balancePct - a.balancePct)
    } else if (sortBy === 'contracted_desc') {
      list.sort((a, b) => b.contractedTotal - a.contractedTotal)
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) => a.code.localeCompare(b.code))
    }

    return list
  }, [itemsWithBalances, disciplineFilter, stageFilter, thresholdFilter, search, sortBy])

  // Filtered totals for the currently displayed table/cards
  const filteredTotals = useMemo(() => {
    const directTotal = filteredPendingItems.reduce((s, it) => s + it.balanceDirect, 0)
    const grossTotal = directTotal * aiuMultiplier
    const contractedTotal = filteredPendingItems.reduce((s, it) => s + it.contractedTotal, 0)
    const electricInFilter = filteredPendingItems
      .filter((it) => it.discipline === 'Electrico')
      .reduce((s, it) => s + it.balanceDirect, 0)
    const civilInFilter = filteredPendingItems
      .filter((it) => it.discipline === 'Civil')
      .reduce((s, it) => s + it.balanceDirect, 0)

    return {
      directTotal,
      grossTotal,
      contractedTotal,
      electricInFilter,
      civilInFilter,
      count: filteredPendingItems.length,
    }
  }, [filteredPendingItems, aiuMultiplier])

  // Filtered list to display (supports toggling "show only selected")
  const displayedItems = useMemo(() => {
    if (showOnlySelected) {
      return filteredPendingItems.filter((it) => selectedRowNumbers.has(it.row))
    }
    return filteredPendingItems
  }, [filteredPendingItems, showOnlySelected, selectedRowNumbers])

  // Selected items list
  const selectedItems = useMemo(() => {
    return itemsWithBalances.filter((it) => selectedRowNumbers.has(it.row))
  }, [itemsWithBalances, selectedRowNumbers])

  // Partial sum computation of all selected activities
  const partialSum = useMemo(() => {
    if (selectedItems.length === 0) return null

    const count = selectedItems.length
    const directBalance = selectedItems.reduce((s, it) => s + it.balanceDirect, 0)
    const grossBalance = directBalance * aiuMultiplier
    const contractedTotal = selectedItems.reduce((s, it) => s + it.contractedTotal, 0)
    const billedAccum = selectedItems.reduce((s, it) => s + it.accumValAtCut, 0)

    const electricItems = selectedItems.filter((it) => it.discipline === 'Electrico')
    const civilItems = selectedItems.filter((it) => it.discipline === 'Civil')
    const alumbradoItems = selectedItems.filter((it) => it.discipline === 'Alumbrado')

    const electricDirect = electricItems.reduce((s, it) => s + it.balanceDirect, 0)
    const civilDirect = civilItems.reduce((s, it) => s + it.balanceDirect, 0)
    const alumbradoDirect = alumbradoItems.reduce((s, it) => s + it.balanceDirect, 0)

    const electricGross = electricDirect * aiuMultiplier
    const civilGross = civilDirect * aiuMultiplier
    const alumbradoGross = alumbradoDirect * aiuMultiplier

    const pctOfFilteredPending =
      filteredTotals.directTotal > 0 ? directBalance / filteredTotals.directTotal : 0
    const progressOfSelected = contractedTotal > 0 ? billedAccum / contractedTotal : 0
    const pendingPctOfSelected = contractedTotal > 0 ? directBalance / contractedTotal : 0

    return {
      count,
      directBalance,
      grossBalance,
      contractedTotal,
      billedAccum,
      progressOfSelected,
      pendingPctOfSelected,
      pctOfFilteredPending,
      electric: {
        count: electricItems.length,
        direct: electricDirect,
        gross: electricGross,
        pctOfSum: directBalance > 0 ? electricDirect / directBalance : 0,
      },
      civil: {
        count: civilItems.length,
        direct: civilDirect,
        gross: civilGross,
        pctOfSum: directBalance > 0 ? civilDirect / directBalance : 0,
      },
      alumbrado: {
        count: alumbradoItems.length,
        direct: alumbradoDirect,
        gross: alumbradoGross,
        pctOfSum: directBalance > 0 ? alumbradoDirect / directBalance : 0,
      },
    }
  }, [selectedItems, aiuMultiplier, filteredTotals.directTotal])

  // Selection action handlers
  const toggleItemSelection = (rowNumber: number) => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev)
      if (next.has(rowNumber)) {
        next.delete(rowNumber)
      } else {
        next.add(rowNumber)
      }
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev)
      displayedItems.forEach((it) => next.add(it.row))
      return next
    })
  }

  const clearSelection = () => {
    setSelectedRowNumbers(new Set())
    setShowOnlySelected(false)
  }

  const selectOnlyElectric = () => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev)
      filteredPendingItems
        .filter((it) => it.discipline === 'Electrico')
        .forEach((it) => next.add(it.row))
      return next
    })
  }

  const selectOnlyCivil = () => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev)
      filteredPendingItems
        .filter((it) => it.discipline === 'Civil')
        .forEach((it) => next.add(it.row))
      return next
    })
  }

  const selectCriticalItems = () => {
    setSelectedRowNumbers((prev) => {
      const next = new Set(prev)
      filteredPendingItems
        .filter((it) => it.balanceDirect >= 5_000_000)
        .forEach((it) => next.add(it.row))
      return next
    })
  }

  const handleCopyPartialSummary = () => {
    if (!partialSum || selectedItems.length === 0) return

    const lines = [
      `RESUMEN DE SUMA PARCIAL DE ACTIVIDADES POR FACTURAR`,
      `Proyecto: ${report.title}`,
      `Contrato: ${report.contract}`,
      `Fecha: ${new Date().toLocaleDateString('es-CO')}`,
      `----------------------------------------------------`,
      `Total actividades seleccionadas: ${partialSum.count}`,
      `SALDO DIRECTO PENDIENTE: ${formatCurrency(partialSum.directBalance)} COP`,
      `SALDO CON AIU (1.2793): ${formatCurrency(partialSum.grossBalance)} COP`,
      `Presupuesto Contratado Base: ${formatCurrency(partialSum.contractedTotal)} COP`,
      `Ya Facturado Acumulado: ${formatCurrency(partialSum.billedAccum)} COP (${(partialSum.progressOfSelected * 100).toFixed(1)}%)`,
      `Representa el ${(partialSum.pctOfFilteredPending * 100).toFixed(1)}% del saldo pendiente filtrado`,
      `----------------------------------------------------`,
      `DESGLOSE POR ESPECIALIDAD SELECCIONADA:`,
      `- Eléctrico (${partialSum.electric.count} actividades): ${formatCurrency(partialSum.electric.direct)} COP Directo | ${formatCurrency(partialSum.electric.gross)} COP con AIU (${(partialSum.electric.pctOfSum * 100).toFixed(1)}%)`,
      `- Civil (${partialSum.civil.count} actividades): ${formatCurrency(partialSum.civil.direct)} COP Directo | ${formatCurrency(partialSum.civil.gross)} COP con AIU (${(partialSum.civil.pctOfSum * 100).toFixed(1)}%)`,
      partialSum.alumbrado.count > 0 ? `- Alumbrado (${partialSum.alumbrado.count} actividades): ${formatCurrency(partialSum.alumbrado.direct)} COP Directo` : '',
      `----------------------------------------------------`,
      `DETALLE DE PARTIDAS SELECCIONADAS:`,
      ...selectedItems.map(
        (it) =>
          `• [${it.code || `R${it.row}`}] ${it.description} | Saldo Directo: ${formatCurrency(it.balanceDirect)} COP | Con AIU: ${formatCurrency(it.balanceGrossWithAiu)} COP | Faltante: ${formatPercent(it.balancePct)} [${it.discipline}]`
      ),
    ].filter(Boolean)

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSummary(true)
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  // Export pending activities to CSV
  const handleExportPendingCsv = () => {
    const headers = [
      'Item',
      'Descripcion',
      'Especialidad',
      'Unidad',
      'Precio_Unitario_COP',
      'Cantidad_Contratada',
      'Cantidad_Facturada',
      'Cantidad_Por_Facturar',
      'Saldo_Directo_COP',
      'Saldo_Con_AIU_COP',
      'Porcentaje_Pendiente',
      'Estado_Ejecucion',
    ]

    const rows = filteredPendingItems.map((it) => [
      `"${it.code || `R${it.row}`}"`,
      `"${it.description.replace(/"/g, '""')}"`,
      `"${DISCIPLINE_CONFIG[it.discipline].shortLabel}"`,
      `"${it.unit}"`,
      Math.round(it.unitPrice),
      it.contractedQty,
      it.accumQtyAtCut,
      it.balanceQty,
      Math.round(it.balanceDirect),
      Math.round(it.balanceGrossWithAiu),
      `${(it.balancePct * 100).toFixed(2)}%`,
      it.stage === 'not_started' ? 'Sin Iniciar' : 'En Ejecución',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Actividades_Por_Facturar_${disciplineFilter}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: ENFOCADO EN ACTIVIDADES POR FACTURAR */}
      <section className="bg-gradient-to-r from-[#0b1724] via-[#122435] to-[#1a334a] text-white p-5 sm:p-6 rounded-2xl border border-[#233a4f] shadow-md relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#e5a83b] text-[#0b1724] rounded-full shadow-xs">
                Filtro Especializado
              </span>
              <span className="text-xs font-mono text-[#a5bad0]">
                {report.contract} · {report.title}
              </span>
            </div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-white mt-1.5 flex items-center gap-2">
              <Clock className="text-[#e5a83b]" size={24} />
              <span>Actividades por Facturar: Detalle Eléctrico vs Civil</span>
            </h2>
            <p className="text-xs sm:text-sm font-mono text-[#cbd9e6] mt-1 max-w-3xl leading-relaxed">
              Auditoría financiera exclusiva de las partidas con saldo pendiente de cobro. Visualiza cantidades faltantes, saldos directos, saldos con AIU (1.2793) y estado de avance ítem a ítem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportPendingCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold bg-[#e5a83b] text-[#0b1724] hover:bg-[#d89725] rounded-xl transition-all shadow-sm"
              title="Descargar listado filtrado de partidas por facturar en formato CSV"
            >
              <Download size={14} />
              <span>Exportar Saldo Faltante (CSV)</span>
            </button>
            {onNavigateToDisciplines && (
              <button
                type="button"
                onClick={onNavigateToDisciplines}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium bg-white/10 text-white hover:bg-white/20 rounded-xl transition-all border border-white/20"
              >
                <span>Ver Matriz General</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Decorative ambient shape */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#e5a83b]/10 to-transparent pointer-events-none" />
      </section>

      {/* 2. DEDICATED FINANCIAL KPI CARDS FOR PENDING ACTIVITIES */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Saldos por facturar por disciplina">
        {/* ELÉCTRICO PENDIENTE */}
        <article
          onClick={() => setDisciplineFilter('Electrico')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-xs flex flex-col justify-between relative overflow-hidden ${
            disciplineFilter === 'Electrico'
              ? 'border-[#e5a83b] ring-3 ring-[#e5a83b]/30 bg-[#fffdfa]'
              : 'border-[#f2d9a3] hover:border-[#e5a83b]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#fff4db] text-[#b0791a] flex items-center justify-center font-bold">
                  <Zap size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#a06800] font-bold block">
                    Por Facturar Eléctrico
                  </span>
                  <span className="text-xs font-mono text-[#76858e]">
                    {pendingMetrics.electric.pendingItemsCount} partidas pendientes (de {pendingMetrics.electric.totalItems})
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#fff4db] text-[#a06800] border border-[#f8d58a] rounded-full">
                {formatPercent(pendingMetrics.electric.shareOfTotalPending)} del saldo
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-[#f7e8c9]">
              <span className="text-[10px] font-mono uppercase text-[#73828c] block">Saldo Directo Faltante</span>
              <div className="text-xl sm:text-2xl font-display font-bold text-[#b0791a] mt-0.5">
                {formatCurrency(pendingMetrics.electric.balanceDirect)}
              </div>
              <div className="text-xs font-mono text-[#8a6828] mt-0.5">
                Con AIU (Bruto): <b>{formatCurrency(pendingMetrics.electric.balanceGross)}</b>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f7e8c9] text-xs font-mono flex items-center justify-between">
            <span className="text-[11px] text-[#697984]">
              {pendingMetrics.electric.notStartedCount} sin iniciar · {pendingMetrics.electric.inProgressCount} en proceso
            </span>
            <span className="text-[11px] font-bold text-[#b0791a] flex items-center gap-1">
              <span>Filtrar</span>
              <ChevronRight size={12} />
            </span>
          </div>
        </article>

        {/* CIVIL PENDIENTE */}
        <article
          onClick={() => setDisciplineFilter('Civil')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-xs flex flex-col justify-between relative overflow-hidden ${
            disciplineFilter === 'Civil'
              ? 'border-[#4673a7] ring-3 ring-[#4673a7]/30 bg-[#fbfdff]'
              : 'border-[#c6d7ed] hover:border-[#4673a7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e8eff8] text-[#235189] flex items-center justify-center font-bold">
                  <HardHat size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#235189] font-bold block">
                    Por Facturar Civil
                  </span>
                  <span className="text-xs font-mono text-[#76858e]">
                    {pendingMetrics.civil.pendingItemsCount} partidas pendientes (de {pendingMetrics.civil.totalItems})
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#e8eff8] text-[#235189] border border-[#c3d5ee] rounded-full">
                {formatPercent(pendingMetrics.civil.shareOfTotalPending)} del saldo
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-[#d8e4f3]">
              <span className="text-[10px] font-mono uppercase text-[#73828c] block">Saldo Directo Faltante</span>
              <div className="text-xl sm:text-2xl font-display font-bold text-[#235189] mt-0.5">
                {formatCurrency(pendingMetrics.civil.balanceDirect)}
              </div>
              <div className="text-xs font-mono text-[#325a8a] mt-0.5">
                Con AIU (Bruto): <b>{formatCurrency(pendingMetrics.civil.balanceGross)}</b>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#d8e4f3] text-xs font-mono flex items-center justify-between">
            <span className="text-[11px] text-[#697984]">
              {pendingMetrics.civil.notStartedCount} sin iniciar · {pendingMetrics.civil.inProgressCount} en proceso
            </span>
            <span className="text-[11px] font-bold text-[#235189] flex items-center gap-1">
              <span>Filtrar</span>
              <ChevronRight size={12} />
            </span>
          </div>
        </article>

        {/* TOTAL CONTRATO PENDIENTE */}
        <article
          onClick={() => setDisciplineFilter('all')}
          className={`p-5 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-xs flex flex-col justify-between relative overflow-hidden ${
            disciplineFilter === 'all'
              ? 'border-[#0b1724] ring-3 ring-[#0b1724]/20 bg-[#fafbfa]'
              : 'border-[#dfe5e4] hover:border-[#0b1724]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#f0f4f2] text-[#0b1724] flex items-center justify-center font-bold">
                  <Coins size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#0b1724] font-bold block">
                    Saldo Total a Facturar
                  </span>
                  <span className="text-xs font-mono text-[#76858e]">
                    {pendingMetrics.total.pendingItemsCount} partidas totales pendientes
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#f0f4f2] text-[#0b1724] border border-[#d6e0dd] rounded-full">
                {formatPercent(
                  report.directCostContracted > 0
                    ? pendingMetrics.total.balanceDirect / report.directCostContracted
                    : 0
                )}{' '}
                por cobrar
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-[#dfe5e4]">
              <span className="text-[10px] font-mono uppercase text-[#73828c] block">Saldo Directo Total</span>
              <div className="text-xl sm:text-2xl font-display font-bold text-[#0b1724] mt-0.5">
                {formatCurrency(pendingMetrics.total.balanceDirect)}
              </div>
              <div className="text-xs font-mono text-[#3e5361] mt-0.5">
                Con AIU (Bruto): <b>{formatCurrency(pendingMetrics.total.balanceGross)}</b>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#dfe5e4] text-xs font-mono flex items-center justify-between">
            <span className="text-[11px] text-[#697984]">
              {pendingMetrics.total.notStartedCount} sin iniciar · {pendingMetrics.total.inProgressCount} en proceso
            </span>
            <span className="text-[11px] font-bold text-[#0b1724] flex items-center gap-1">
              <span>Ver Todas</span>
              <ChevronRight size={12} />
            </span>
          </div>
        </article>
      </section>

      {/* 3. FOCUSED FILTER CONTROLS BAR */}
      <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-5 shadow-xs space-y-4">
        {/* Cutoff selection and primary filter pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#e5a83b]" />
              Filtro Enfocado en Actividades por Facturar
            </span>
            <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
              Listado Detallado de Partidas con Saldo Pendiente
            </h3>
            <p className="text-xs font-mono text-[#667882] mt-0.5">
              Mostrando <b>{filteredPendingItems.length}</b> actividades con saldo por cobrar (Total Directo:{' '}
              <b className="text-[#0b1724]">{formatCurrency(filteredTotals.directTotal)}</b> · Con AIU:{' '}
              <b className="text-[#a06800]">{formatCurrency(filteredTotals.grossTotal)}</b>)
            </p>
          </div>

          {/* View Mode & Sticky Toggle */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
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
                    : 'Inmovilizar columnas de Ítem y Descripción de la obra'
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

        {/* 3A. PRIMARY DISCIPLINE FOCUS TABS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#0b1724] mr-1">Especialidad por Facturar:</span>
          
          <button
            type="button"
            onClick={() => setDisciplineFilter('all')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              disciplineFilter === 'all'
                ? 'bg-[#0b1724] text-white border-[#0b1724] shadow-xs'
                : 'bg-white text-[#556772] border-[#d6e0dd] hover:bg-[#fafcfb]'
            }`}
          >
            <span>Todas con Saldo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {pendingMetrics.total.pendingItemsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDisciplineFilter('Electrico')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              disciplineFilter === 'Electrico'
                ? 'bg-[#e5a83b] text-[#0b1724] border-[#e5a83b] shadow-xs'
                : 'bg-[#fffaf0] text-[#a06800] border-[#f8d58a] hover:bg-[#fff2d6]'
            }`}
          >
            <Zap size={14} />
            <span>⚡ Solo Eléctricas por Facturar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0b1724] text-[#f8c866]">
              {pendingMetrics.electric.pendingItemsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDisciplineFilter('Civil')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              disciplineFilter === 'Civil'
                ? 'bg-[#4673a7] text-white border-[#4673a7] shadow-xs'
                : 'bg-[#f3f7fd] text-[#235189] border-[#c3d5ee] hover:bg-[#e6effa]'
            }`}
          >
            <HardHat size={14} />
            <span>🏗️ Solo Civiles por Facturar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {pendingMetrics.civil.pendingItemsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDisciplineFilter('Electrico_Civil')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              disciplineFilter === 'Electrico_Civil'
                ? 'bg-[#1b382b] text-[#f8c866] border-[#1b382b] shadow-xs'
                : 'bg-[#f4faf7] text-[#1f674e] border-[#b9e0ce] hover:bg-[#ebf6f1]'
            }`}
          >
            <span>⚡+🏗️ Eléctrico + Civil</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/30">
              {pendingMetrics.electric.pendingItemsCount + pendingMetrics.civil.pendingItemsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDisciplineFilter('Alumbrado')}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
              disciplineFilter === 'Alumbrado'
                ? 'bg-[#3b8f71] text-white border-[#3b8f71] shadow-xs'
                : 'bg-white text-[#556772] border-[#d6e0dd] hover:bg-[#fafcfb]'
            }`}
          >
            <Lightbulb size={13} />
            <span>💡 Alumbrado</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f0f4f2] text-[#4d5f6b]">
              {pendingMetrics.alumbrado.pendingItemsCount}
            </span>
          </button>
        </div>

        {/* 3B. SECONDARY GRANULAR CONTROLS: SEARCH, STAGE, THRESHOLD & SORT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2">
          {/* Search */}
          <div className="lg:col-span-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9c99]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar actividad pendiente (ej: cable, cámara, tubería, transformador)..."
              className="w-full pl-9 pr-7 py-2 text-xs font-mono rounded-lg border border-[#d6e0dd] bg-[#fbfcfa] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#e5a83b]/40 focus:border-[#e5a83b] transition-all"
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

          {/* Stage Filter */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#6c7d87] shrink-0">Estado:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as PendingStageFilter)}
              className="w-full text-xs font-mono py-2 px-2.5 rounded-lg border border-[#d6e0dd] bg-white text-[#0b1724] focus:outline-hidden focus:border-[#0b1724] cursor-pointer"
            >
              <option value="all">Todas con Saldo Pendiente</option>
              <option value="not_started">🔴 Sin Iniciar (100% por facturar)</option>
              <option value="in_progress">🟡 En Ejecución (Saldo parcial restante)</option>
            </select>
          </div>

          {/* Threshold Filter */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#6c7d87] shrink-0">Impacto:</span>
            <select
              value={thresholdFilter}
              onChange={(e) => setThresholdFilter(e.target.value as PendingThresholdFilter)}
              className="w-full text-xs font-mono py-2 px-2.5 rounded-lg border border-[#d6e0dd] bg-white text-[#0b1724] focus:outline-hidden focus:border-[#0b1724] cursor-pointer"
            >
              <option value="all">Cualquier Saldo (&gt; $0)</option>
              <option value="gt_1m">💵 Saldo &gt; $1.000.000 COP</option>
              <option value="gt_5m">🔥 Saldo Crítico &gt; $5.000.000 COP</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#6c7d87] shrink-0">Orden:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as PendingSortBy)}
              className="w-full text-xs font-mono py-2 px-2.5 rounded-lg border border-[#d6e0dd] bg-white text-[#0b1724] focus:outline-hidden focus:border-[#0b1724] cursor-pointer"
            >
              <option value="balance_desc">Mayor Saldo ($)</option>
              <option value="balance_asc">Menor Saldo ($)</option>
              <option value="pct_desc">Mayor % Pendiente</option>
              <option value="contracted_desc">Mayor Contrato Base</option>
              <option value="code_asc">Código Ítem</option>
            </select>
          </div>
        </div>

        {/* 3C. ACTIVE FILTER SUMMARY BADGES */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs font-mono border-t border-[#f0f4f2]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#71828d]">Distribución del saldo filtrado:</span>
            <span className="px-2 py-0.5 rounded-md bg-[#fffaf0] text-[#a06800] border border-[#f8d58a] font-semibold">
              ⚡ Eléctrico: {formatCurrency(filteredTotals.electricInFilter)}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#f3f7fd] text-[#235189] border border-[#c3d5ee] font-semibold">
              🏗️ Civil: {formatCurrency(filteredTotals.civilInFilter)}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#0b1724] text-[#f8c866] font-bold">
              Total Directo: {formatCurrency(filteredTotals.directTotal)}
            </span>
            <span className="text-[11px] text-[#5b6e79]">
              (Con AIU: <b>{formatCurrency(filteredTotals.grossTotal)}</b>)
            </span>
          </div>

          {/* Quick Reset Filters */}
          {(disciplineFilter !== 'all' || stageFilter !== 'all' || thresholdFilter !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setDisciplineFilter('all')
                setStageFilter('all')
                setThresholdFilter('all')
                setSearch('')
              }}
              className="text-[11px] font-mono text-[#a83232] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {/* 3D. PANEL DE SUMATORIA PARCIAL DE ACTIVIDADES SELECCIONADAS */}
      <section className="transition-all duration-300">
        {partialSum ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#fffdf5] via-[#fff8ea] to-[#fcfbf7] border-2 border-[#e5a83b] shadow-sm space-y-4">
            {/* Header: Title, Counts and Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3dfba] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#e5a83b] text-[#0b1724] flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Calculator size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-[#0b1724] text-[#f8c866] font-bold px-2 py-0.5 rounded-full">
                      Sumatoria Parcial Activa
                    </span>
                    <span className="text-xs font-mono font-bold text-[#8c5800]">
                      {partialSum.count} {partialSum.count === 1 ? 'partida seleccionada' : 'partidas seleccionadas'} (de {filteredPendingItems.length})
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#0b1724] mt-0.5">
                    Suma Parcial: <span className="text-[#a06800]">{formatCurrency(partialSum.directBalance)} COP</span>
                    <span className="text-xs font-mono font-normal text-[#5c6e7a] ml-2">
                      (Con AIU: <b className="text-[#0b1724]">{formatCurrency(partialSum.grossBalance)} COP</b>)
                    </span>
                  </h3>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleCopyPartialSummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#d6c29b] text-xs font-mono font-bold text-[#0b1724] hover:bg-[#fff5e0] transition-all shadow-2xs"
                  title="Copiar desglose completo de la selección al portapapeles"
                >
                  {copiedSummary ? (
                    <>
                      <Check size={13} className="text-[#2e8564]" />
                      <span className="text-[#2e8564]">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-[#a06800]" />
                      <span>Copiar Resumen</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlySelected(!showOnlySelected)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all shadow-2xs ${
                    showOnlySelected
                      ? 'bg-[#0b1724] text-[#f8c866] border-[#0b1724] font-bold'
                      : 'bg-white text-[#526470] border-[#d6c29b] hover:bg-[#fff5e0]'
                  }`}
                  title={showOnlySelected ? 'Mostrar todas las partidas' : 'Filtrar la tabla para mostrar únicamente las seleccionadas'}
                >
                  <ListFilter size={13} />
                  <span>{showOnlySelected ? 'Ver Todas' : 'Ver Solo Seleccionadas'}</span>
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 border border-[#e2d5bd] text-xs font-mono text-[#a83232] hover:bg-[#ffebeb] transition-all"
                  title="Deseleccionar todas las actividades"
                >
                  <X size={13} />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* 4 Financial KPI Cards of the Selection */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              {/* Direct Pending */}
              <div className="p-3 bg-white rounded-xl border border-[#ecd5a8] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#a06800] block">
                  Saldo Directo Seleccionado
                </span>
                <div className="text-base sm:text-xl font-display font-bold text-[#0b1724] mt-0.5">
                  {formatCurrency(partialSum.directBalance)}
                </div>
                <div className="text-[11px] text-[#6d7f8b] mt-0.5">
                  <b>{formatPercent(partialSum.pctOfFilteredPending)}</b> del saldo filtrado
                </div>
              </div>

              {/* Gross Pending with AIU */}
              <div className="p-3 bg-white rounded-xl border border-[#ecd5a8] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#0b1724] block">
                  Saldo con AIU Seleccionado
                </span>
                <div className="text-base sm:text-xl font-display font-bold text-[#8c5800] mt-0.5">
                  {formatCurrency(partialSum.grossBalance)}
                </div>
                <div className="text-[11px] text-[#6d7f8b] mt-0.5">
                  Factor AIU: <b>{aiuMultiplier.toFixed(4)}</b>
                </div>
              </div>

              {/* Total Contracted of Selection */}
              <div className="p-3 bg-white rounded-xl border border-[#ecd5a8] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#4a5f6e] block">
                  Presupuesto Base Contratado
                </span>
                <div className="text-base sm:text-xl font-display font-bold text-[#0b1724] mt-0.5">
                  {formatCurrency(partialSum.contractedTotal)}
                </div>
                <div className="text-[11px] text-[#6d7f8b] mt-0.5">
                  Faltante: <b>{formatPercent(partialSum.pendingPctOfSelected)}</b>
                </div>
              </div>

              {/* Already Billed of Selection */}
              <div className="p-3 bg-white rounded-xl border border-[#ecd5a8] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#1f674e] block">
                  Ya Facturado Acumulado
                </span>
                <div className="text-base sm:text-xl font-display font-bold text-[#1f674e] mt-0.5">
                  {formatCurrency(partialSum.billedAccum)}
                </div>
                <div className="text-[11px] text-[#6d7f8b] mt-0.5">
                  Avance: <b>{formatPercent(partialSum.progressOfSelected)}</b> cobrado
                </div>
              </div>
            </div>

            {/* Discipline Breakdown & Quick Selector Shortcuts */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-[#f3dfba] text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-[#0b1724]">Composición de la suma:</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#fffaf0] border border-[#f8d58a] font-semibold text-[#a06800] flex items-center gap-1.5">
                  <Zap size={12} />
                  <span>⚡ Eléctrico: <b>{formatCurrency(partialSum.electric.direct)}</b> ({partialSum.electric.count} part. · {formatPercent(partialSum.electric.pctOfSum)})</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#f3f7fd] border border-[#c3d5ee] font-semibold text-[#235189] flex items-center gap-1.5">
                  <HardHat size={12} />
                  <span>🏗️ Civil: <b>{formatCurrency(partialSum.civil.direct)}</b> ({partialSum.civil.count} part. · {formatPercent(partialSum.civil.pctOfSum)})</span>
                </span>
                {partialSum.alumbrado.count > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-[#f4faf7] border border-[#b9e0ce] font-semibold text-[#1f674e]">
                    💡 Alumbrado: <b>{formatCurrency(partialSum.alumbrado.direct)}</b> ({partialSum.alumbrado.count})
                  </span>
                )}
              </div>

              {/* Quick Select Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#687a84]">
                <span>Selección rápida:</span>
                <button
                  type="button"
                  onClick={selectOnlyElectric}
                  className="px-2 py-0.5 rounded bg-white border border-[#d6c29b] text-[#8c5800] font-semibold hover:bg-[#fff5e0] transition-colors"
                >
                  ⚡ Todas Eléctricas
                </button>
                <button
                  type="button"
                  onClick={selectOnlyCivil}
                  className="px-2 py-0.5 rounded bg-white border border-[#d6c29b] text-[#235189] font-semibold hover:bg-[#f3f7fd] transition-colors"
                >
                  🏗️ Todas Civiles
                </button>
                <button
                  type="button"
                  onClick={selectCriticalItems}
                  className="px-2 py-0.5 rounded bg-white border border-[#d6c29b] text-[#0b1724] font-semibold hover:bg-[#f0f4f2] transition-colors"
                >
                  🔥 Críticas (&gt; $5M)
                </button>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-2 py-0.5 rounded bg-[#0b1724] text-white font-semibold hover:bg-[#1a2c3d] transition-colors"
                >
                  Todas ({displayedItems.length})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-white border border-[#dfe5e4] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#fff8ea] text-[#a06800] border border-[#f8d58a] flex items-center justify-center font-bold shrink-0">
                <Calculator size={16} />
              </div>
              <div>
                <span className="font-bold text-[#0b1724] block">
                  Calculadora de Sumas Parciales de Actividades
                </span>
                <span className="text-[#647682] text-[11px]">
                  Marca las casillas de verificación de cualquier actividad o usa los atajos rápidos para calcular sumatorias al instante.
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[#73848f] mr-1 hidden lg:inline">Selección rápida:</span>
              <button
                type="button"
                onClick={selectOnlyElectric}
                className="px-2.5 py-1 rounded-lg bg-[#fffaf0] border border-[#f8d58a] text-[#a06800] font-semibold hover:bg-[#fff2d6] transition-all flex items-center gap-1"
              >
                <Zap size={11} />
                <span>⚡ Solo Eléctricas</span>
              </button>
              <button
                type="button"
                onClick={selectOnlyCivil}
                className="px-2.5 py-1 rounded-lg bg-[#f3f7fd] border border-[#c3d5ee] text-[#235189] font-semibold hover:bg-[#e6effa] transition-all flex items-center gap-1"
              >
                <HardHat size={11} />
                <span>🏗️ Solo Civiles</span>
              </button>
              <button
                type="button"
                onClick={selectCriticalItems}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#dfe5e4] text-[#0b1724] font-semibold hover:bg-[#f0f4f2] transition-all"
              >
                🔥 Críticas (&gt; $5M)
              </button>
              <button
                type="button"
                onClick={selectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-[#0b1724] text-white font-bold hover:bg-[#1a2c3d] transition-all"
              >
                Seleccionar Todas ({displayedItems.length})
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. CONTENT TABLE OR CARDS FOR PENDING ACTIVITIES */}
      {displayedItems.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-[#dfe5e4] space-y-2">
          <AlertTriangle size={32} className="mx-auto text-[#e5a83b]" />
          <h4 className="font-display font-bold text-base text-[#0b1724]">
            {showOnlySelected
              ? 'No hay actividades seleccionadas para mostrar'
              : 'No hay actividades con saldo por facturar bajo estos criterios'}
          </h4>
          <p className="text-xs font-mono text-[#677984]">
            {showOnlySelected
              ? 'Selecciona partidas con las casillas de verificación o desactiva el filtro de solo seleccionadas.'
              : 'Intenta cambiar los filtros de especialidad, estado de ejecución o umbral de saldo.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (showOnlySelected) {
                setShowOnlySelected(false)
              } else {
                setDisciplineFilter('all')
                setStageFilter('all')
                setThresholdFilter('all')
                setSearch('')
              }
            }}
            className="mt-2 px-3 py-1.5 text-xs font-mono font-bold bg-[#0b1724] text-white rounded-lg"
          >
            {showOnlySelected ? 'Ver todas las partidas' : 'Ver todas las actividades por facturar'}
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-[#dfe5e4] shadow-xs overflow-hidden">
          {/* Table Header Controls & Freeze Guidance Banner */}
          <div className="p-3 bg-[#f7faf8] border-b border-[#dfe5e4] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#0b1724]">Planilla de Actividades por Facturar</span>
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
                    ? 'Ítem y Descripción Inmovilizados (Fijos)'
                    : 'Inmovilización desactivada (Desplazamiento libre)'}
                </span>
              </span>

              {partialSum && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#e5a83b] text-[#0b1724]">
                  <Calculator size={11} />
                  <span>Sumando {partialSum.count} partidas</span>
                </span>
              )}
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
                title={isStickyPinned ? 'Liberar columnas de Ítem y Descripción' : 'Inmovilizar columnas para no perder de vista la actividad'}
              >
                {isStickyPinned ? <PinOff size={12} /> : <Pin size={12} className="rotate-45 text-[#a06800]" />}
                <span>{isStickyPinned ? 'Liberar Columnas' : 'Inmovilizar Columnas'}</span>
              </button>

              {isStickyPinned && (
                <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#5c6e7a] bg-white px-2 py-0.5 rounded-md border border-[#dfe5e4]">
                  <span>Desplaza a la derecha</span>
                  <span className="text-[#a06800] font-bold">👉</span>
                  <span>para ver saldos x facturar</span>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px] overflow-y-auto relative">
            <table
              className={`w-full text-left text-xs font-mono whitespace-nowrap ${
                isStickyPinned ? 'border-separate border-spacing-0' : 'border-collapse'
              }`}
            >
              <thead className="sticky top-0 z-20 bg-[#f5f8f7] text-[#5e707b] border-b border-[#dfe5e4]">
                {/* Super Header */}
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
                      Identificación de la Actividad
                    </th>
                  )}
                  <th
                    colSpan={3}
                    className="py-2 px-3 bg-[#eef3f6] text-[#2b4c68] text-center border-r border-[#cbd7d4] border-b border-[#cbd7d4]"
                  >
                    Contrato Base
                  </th>
                  <th
                    colSpan={2}
                    className="py-2 px-3 bg-[#e8f4ee] text-[#1f674e] text-center border-r border-[#cbd7d4] border-b border-[#cbd7d4]"
                  >
                    Ejecutado Acumulado
                  </th>
                  <th
                    colSpan={4}
                    className="py-2 px-3 bg-[#fff9ed] text-[#a06800] text-center border-b border-[#cbd7d4]"
                  >
                    ⏳ Detalle Faltante por Facturar
                  </th>
                </tr>

                {/* Column Headers */}
                <tr>
                  <th
                    className={`py-2.5 px-3 font-semibold border-b border-[#dfe5e4] w-28 min-w-[7rem] max-w-[7rem] ${
                      isStickyPinned
                        ? 'sticky left-0 z-30 bg-[#f5f8f7] border-r border-[#dfe5e4]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          displayedItems.length > 0 &&
                          displayedItems.every((it) => selectedRowNumbers.has(it.row))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllVisible()
                          } else {
                            clearSelection()
                          }
                        }}
                        title="Seleccionar / Deseleccionar todas las visibles para suma parcial"
                        className="w-3.5 h-3.5 rounded border-[#b9c9c5] text-[#0b1724] focus:ring-1 focus:ring-[#e5a83b] cursor-pointer shrink-0 accent-[#0b1724]"
                      />
                      <span>Ítem</span>
                      {isStickyPinned && <Pin size={10} className="text-[#a06800] rotate-45 shrink-0" />}
                    </div>
                  </th>
                  <th
                    className={`py-2.5 px-3 font-semibold border-b border-[#dfe5e4] min-w-[240px] sm:min-w-[300px] max-w-[320px] sm:max-w-md ${
                      isStickyPinned
                        ? 'sticky left-28 z-30 bg-[#f5f8f7] border-r-2 border-[#b9c9c5] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.12)]'
                        : ''
                    }`}
                  >
                    Descripción de la Obra
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center border-b border-[#dfe5e4]">Especialidad</th>
                  <th className="py-2.5 px-3 font-semibold text-center border-b border-[#dfe5e4]">UND</th>
                  <th className="py-2.5 px-3 font-semibold text-right border-r border-[#dfe5e4] border-b border-[#dfe5e4]">
                    P. Unitario
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right bg-[#f8fafc] border-b border-[#dfe5e4]">
                    Cant. Cont.
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right bg-[#eef3f6] text-[#0b1724] border-b border-[#dfe5e4]">
                    Total Contratado
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center bg-[#eef3f6] border-r border-[#cbd7d4] border-b border-[#dfe5e4]">
                    Estado
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right bg-[#f8fbfe] border-b border-[#dfe5e4]">
                    Cant. Cobrada
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right bg-[#f2f6fa] text-[#1f674e] font-medium border-r border-[#cbd7d4] border-b border-[#dfe5e4]">
                    Valor Cobrado ($)
                  </th>
                  {/* PENDING HIGHLIGHTED COLUMNS */}
                  <th className="py-2.5 px-3 font-bold text-right bg-[#fffdf5] text-[#b0791a] border-b border-[#dfe5e4]">
                    Cant. Faltante
                  </th>
                  <th className="py-2.5 px-3 font-bold text-right bg-[#fff9ed] text-[#a06800] border-b border-[#dfe5e4]">
                    Saldo Directo ($)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-right bg-[#fff4db] text-[#0b1724] border-b border-[#dfe5e4]">
                    Saldo con AIU ($)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-right bg-[#fff9ed] text-[#a06800] border-b border-[#dfe5e4]">
                    % Faltante
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#edf1ef]">
                {displayedItems.map((item) => {
                  const conf = DISCIPLINE_CONFIG[item.discipline]
                  const isCritical = item.balanceDirect >= 5_000_000
                  const isNotStarted = item.stage === 'not_started'
                  const isSelected = selectedRowNumbers.has(item.row)

                  const stickyBg = isSelected
                    ? 'bg-[#fff8ea] group-hover:bg-[#fff4d6]'
                    : isCritical
                    ? 'bg-[#fffdf8] group-hover:bg-[#fffbf0]'
                    : 'bg-white group-hover:bg-[#fbfcfb]'

                  return (
                    <tr
                      key={item.row}
                      onClick={() => toggleItemSelection(item.row)}
                      className={`group transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-[#fff8ea] text-[#0b1724]'
                          : isCritical
                          ? 'bg-[#fffdfa] hover:bg-[#fffbf0]'
                          : 'hover:bg-[#fbfcfb]'
                      }`}
                    >
                      {/* Code (Col 1: Frozen + Selection Checkbox) */}
                      <td
                        className={`py-2.5 px-3 font-bold text-[#0b1724] w-28 min-w-[7rem] max-w-[7rem] border-b border-[#edf1ef] ${
                          isStickyPinned
                            ? `sticky left-0 z-10 ${stickyBg} border-r border-[#dfe5e4]`
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleItemSelection(item.row)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-[#b9c9c5] text-[#0b1724] focus:ring-1 focus:ring-[#e5a83b] cursor-pointer shrink-0 accent-[#0b1724]"
                          />
                          <span className="truncate">
                            {item.code || `R${item.row}`}
                          </span>
                          {isCritical && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[#e5a83b] shrink-0"
                              title="Partida de alto impacto financiero (> $5M)"
                            />
                          )}
                        </div>
                      </td>

                      {/* Description (Col 2: Frozen with shadow boundary) */}
                      <td
                        className={`py-2.5 px-3 whitespace-normal font-sans text-xs text-[#253745] min-w-[240px] sm:min-w-[300px] max-w-[280px] sm:max-w-md border-b border-[#edf1ef] ${
                          isStickyPinned
                            ? `sticky left-28 z-10 ${stickyBg} border-r-2 border-[#b9c9c5] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]`
                            : ''
                        }`}
                      >
                        <div className="font-medium line-clamp-2 sm:line-clamp-none">{item.description}</div>
                        {isNotStarted && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#fff0f0] text-[#a83232] font-semibold border border-[#f5c6c6]">
                            Sin iniciar (0% ejecución)
                          </span>
                        )}
                      </td>

                      {/* Discipline */}
                      <td
                        className="py-2.5 px-3 text-center border-b border-[#edf1ef]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onUpdateDiscipline ? (
                          <select
                            value={item.discipline}
                            onChange={(e) =>
                              onUpdateDiscipline(item.row, e.target.value as DisciplineType)
                            }
                            onClick={(e) => e.stopPropagation()}
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

                      {/* Unit */}
                      <td className="py-2.5 px-3 text-center text-[#677984] border-b border-[#edf1ef]">{item.unit}</td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-right text-[#576974] border-r border-[#dfe5e4] border-b border-[#edf1ef]">
                        {formatCurrency(item.unitPrice)}
                      </td>

                      {/* Contracted Qty */}
                      <td className="py-2.5 px-3 text-right bg-[#fafcfd] border-b border-[#edf1ef]">{item.contractedQty}</td>

                      {/* Contracted Total */}
                      <td className="py-2.5 px-3 text-right font-medium text-[#0b1724] bg-[#f4f7f9] border-b border-[#edf1ef]">
                        {formatCurrency(item.contractedTotal)}
                      </td>

                      {/* Stage Badge */}
                      <td className="py-2.5 px-3 text-center bg-[#f4f7f9] border-r border-[#cbd7d4] border-b border-[#edf1ef]">
                        {isNotStarted ? (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#fff0f0] text-[#a83232] border border-[#f5c6c6]">
                            Sin Iniciar
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-[#eef7ff] text-[#235189] border border-[#c3d5ee]">
                            En Proceso
                          </span>
                        )}
                      </td>

                      {/* Accumulated Qty */}
                      <td className="py-2.5 px-3 text-right bg-[#fafcfe] border-b border-[#edf1ef]">{item.accumQtyAtCut}</td>

                      {/* Accumulated Value */}
                      <td className="py-2.5 px-3 text-right text-[#1f674e] font-medium bg-[#f5f8fc] border-r border-[#cbd7d4] border-b border-[#edf1ef]">
                        {formatCurrency(item.accumValAtCut)}
                      </td>

                      {/* PENDING: QTY */}
                      <td className="py-2.5 px-3 text-right font-bold text-[#b0791a] bg-[#fffdf5] border-b border-[#edf1ef]">
                        {item.balanceQty} {item.unit}
                      </td>

                      {/* PENDING: DIRECT VALUE */}
                      <td className="py-2.5 px-3 text-right font-bold text-[#a06800] bg-[#fff9ed] border-b border-[#edf1ef]">
                        {formatCurrency(item.balanceDirect)}
                      </td>

                      {/* PENDING: WITH AIU */}
                      <td className="py-2.5 px-3 text-right font-bold text-[#0b1724] bg-[#fff4db] border-b border-[#edf1ef]">
                        {formatCurrency(item.balanceGrossWithAiu)}
                      </td>

                      {/* PENDING: PERCENTAGE */}
                      <td className="py-2.5 px-3 text-right bg-[#fff9ed] border-b border-[#edf1ef]">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 bg-[#faebd7] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#e5a83b] h-full"
                              style={{ width: `${Math.min(100, Math.max(0, item.balancePct * 100))}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#a06800] text-[11px]">
                            {formatPercent(item.balancePct)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Table Footer Summary */}
              <tfoot className="sticky bottom-0 bg-[#eef3f1] font-bold text-[#0b1724] border-t-2 border-[#cbd7d4] z-20">
                {/* 1. DYNAMIC PARTIAL SUM ROW (WHEN ACTIVITIES ARE SELECTED) */}
                {partialSum && (
                  <tr className="bg-[#fff3d4] text-[#0b1724] border-b border-[#e5a83b]">
                    {isStickyPinned ? (
                      <>
                        <td
                          colSpan={2}
                          className="py-2.5 px-3 border-r-2 border-[#b9c9c5] sticky left-0 z-30 bg-[#ffe8b3] font-bold shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] text-[#8c5800]"
                        >
                          <div className="flex items-center gap-1.5">
                            <Calculator size={13} className="text-[#8c5800]" />
                            <span>SUMATORIA PARCIAL ({partialSum.count} SELECCIONADAS)</span>
                          </div>
                        </td>
                        <td
                          colSpan={3}
                          className="py-2.5 px-3 border-r border-[#cbd7d4] bg-[#ffe8b3] text-center text-[#8c5800] text-[11px]"
                        >
                          ⚡ {partialSum.electric.count} Eléc. | 🏗️ {partialSum.civil.count} Civ.
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={5}
                        className="py-2.5 px-3 border-r border-[#cbd7d4] font-bold text-[#8c5800] bg-[#ffe8b3]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Calculator size={13} className="text-[#8c5800]" />
                          <span>SUMATORIA PARCIAL ({partialSum.count} ACTIVIDADES SELECCIONADAS)</span>
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right bg-[#fff6de]">-</td>
                    <td className="py-2.5 px-3 text-right bg-[#fff6de] font-bold text-[#0b1724]">
                      {formatCurrency(partialSum.contractedTotal)}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-[#fff6de] border-r border-[#cbd7d4] text-[10px] text-[#5b6e79]">
                      {formatPercent(partialSum.progressOfSelected)} cobrado
                    </td>
                    <td className="py-2.5 px-3 text-right bg-[#fff0cc]">-</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#1f674e] bg-[#fff0cc] border-r border-[#cbd7d4]">
                      {formatCurrency(partialSum.billedAccum)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#b0791a] bg-[#fffaeb]">-</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#8c5800] bg-[#ffe299] text-sm">
                      {formatCurrency(partialSum.directBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#0b1724] bg-[#ffd67a] text-sm">
                      {formatCurrency(partialSum.grossBalance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#8c5800] bg-[#ffe299]">
                      {formatPercent(partialSum.pendingPctOfSelected)}
                    </td>
                  </tr>
                )}

                {/* 2. GENERAL FILTERED TOTALS ROW */}
                <tr>
                  {isStickyPinned ? (
                    <>
                      <td
                        colSpan={2}
                        className="py-3 px-3 border-r-2 border-[#b9c9c5] sticky left-0 z-30 bg-[#eef3f1] shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Pin size={11} className="rotate-45 text-[#a06800]" />
                          <span>TOTALES ({filteredPendingItems.length} PARTIDAS)</span>
                        </div>
                      </td>
                      <td colSpan={3} className="py-3 px-3 border-r border-[#cbd7d4] bg-[#eef3f1] text-center text-[#6a7d89]">
                        -
                      </td>
                    </>
                  ) : (
                    <td colSpan={5} className="py-3 px-3 border-r border-[#cbd7d4]">
                      TOTALES FILTRADOS ({filteredPendingItems.length} PARTIDAS CON SALDO)
                    </td>
                  )}
                  <td className="py-3 px-3 text-right bg-[#f4f7f9]">-</td>
                  <td className="py-3 px-3 text-right bg-[#f4f7f9]">
                    {formatCurrency(filteredTotals.contractedTotal)}
                  </td>
                  <td className="py-3 px-3 text-center bg-[#f4f7f9] border-r border-[#cbd7d4]">-</td>
                  <td className="py-3 px-3 text-right bg-[#f5f8fc]">-</td>
                  <td className="py-3 px-3 text-right text-[#1f674e] bg-[#f5f8fc] border-r border-[#cbd7d4]">
                    {formatCurrency(filteredTotals.contractedTotal - filteredTotals.directTotal)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#b0791a] bg-[#fffdf5]">-</td>
                  <td className="py-3 px-3 text-right text-[#a06800] bg-[#fff9ed] text-sm">
                    {formatCurrency(filteredTotals.directTotal)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#0b1724] bg-[#fff4db] text-sm">
                    {formatCurrency(filteredTotals.grossTotal)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#a06800] bg-[#fff9ed]">
                    {formatPercent(
                      filteredTotals.contractedTotal > 0
                        ? filteredTotals.directTotal / filteredTotals.contractedTotal
                        : 0
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW FOR PENDING ACTIVITIES */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedItems.map((item) => {
            const conf = DISCIPLINE_CONFIG[item.discipline]
            const isCritical = item.balanceDirect >= 5_000_000
            const isNotStarted = item.stage === 'not_started'
            const isSelected = selectedRowNumbers.has(item.row)

            return (
              <div
                key={item.row}
                onClick={() => toggleItemSelection(item.row)}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all shadow-xs flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-[#e5a83b] bg-[#fff8ea] ring-2 ring-[#e5a83b]/30'
                    : isCritical
                    ? 'border-[#e5a83b] bg-[#fffdf8] hover:border-[#d4992f]'
                    : 'border-[#dfe5e4] bg-white hover:border-[#b4c4bd]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleItemSelection(item.row)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-[#b9c9c5] text-[#0b1724] focus:ring-1 focus:ring-[#e5a83b] cursor-pointer shrink-0 accent-[#0b1724]"
                      />
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

                    <div className="flex items-center gap-1.5">
                      {isNotStarted ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#fff0f0] text-[#a83232] border border-[#f5c6c6]">
                          Sin Iniciar
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#eef7ff] text-[#235189] border border-[#c3d5ee]">
                          En Proceso
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-[#a06800]">
                        {formatPercent(item.balancePct)} saldo
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="font-sans font-semibold text-sm text-[#0b1724] mt-2 leading-snug">
                    {item.description}
                  </h4>

                  {/* Highlighted Pending Balance Box */}
                  <div className="mt-3 p-3 rounded-xl bg-[#fff9ed] border border-[#f8e1b3] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-[#a06800] block">
                        Saldo Directo Faltante
                      </span>
                      <span className="font-display font-bold text-lg text-[#0b1724]">
                        {formatCurrency(item.balanceDirect)}
                      </span>
                      <span className="text-[11px] font-mono text-[#8c6b2b] block">
                        Con AIU (Bruto): <b>{formatCurrency(item.balanceGrossWithAiu)}</b>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-[#73828c] block">Cant. Pendiente</span>
                      <span className="font-mono font-bold text-base text-[#0b1724]">
                        {item.balanceQty} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Execution Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-mono text-[#62737f] mb-1">
                      <span>Avance actual: {formatPercent(item.progressPct)}</span>
                      <span>Faltante por cobrar: {formatPercent(item.balancePct)}</span>
                    </div>
                    <div className="w-full bg-[#e8edeb] h-2 rounded-full overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          backgroundColor: conf.color,
                          width: `${Math.min(100, Math.max(0, item.progressPct * 100))}%`,
                        }}
                        title={`Cobrado: ${formatCurrency(item.accumValAtCut)}`}
                      />
                      <div
                        className="h-full bg-[#f8d58a] transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.balancePct * 100))}%`,
                        }}
                        title={`Pendiente: ${formatCurrency(item.balanceDirect)}`}
                      />
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#edf1ef] text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[#73828c] uppercase block">Contratado</span>
                      <strong className="text-[#0b1724] block mt-0.5 truncate" title={formatCurrency(item.contractedTotal)}>
                        {formatCurrency(item.contractedTotal)}
                      </strong>
                      <span className="text-[10px] text-[#556772]">
                        {item.contractedQty} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#1f674e] uppercase block font-semibold">Facturado</span>
                      <strong className="text-[#1f674e] block mt-0.5 truncate" title={formatCurrency(item.accumValAtCut)}>
                        {formatCurrency(item.accumValAtCut)}
                      </strong>
                      <span className="text-[10px] text-[#556772]">
                        {item.accumQtyAtCut} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#a06800] uppercase block font-semibold">P. Unitario</span>
                      <strong className="text-[#0b1724] block mt-0.5 truncate" title={formatCurrency(item.unitPrice)}>
                        {formatCurrency(item.unitPrice)}
                      </strong>
                      <span className="text-[10px] text-[#556772]">por {item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-[#edf1ef] flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-[#637581]">
                    {isSelected ? '✓ Seleccionada en suma' : 'Haz clic para seleccionar'}
                  </span>
                  {onUpdateDiscipline && (
                    <select
                      value={item.discipline}
                      onChange={(e) => {
                        e.stopPropagation()
                        onUpdateDiscipline(item.row, e.target.value as DisciplineType)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-mono py-1 px-2 rounded-md border focus:outline-hidden cursor-pointer"
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
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
