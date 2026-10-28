import React, { useState, useMemo } from 'react'
import {
  Layers,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Table2,
  LayoutGrid,
} from 'lucide-react'
import { formatCurrency, formatPercent, formatCompact } from '../lib/formatters'
import type { ChapterResult } from '../lib/model'

interface ChaptersViewProps {
  chapters: ChapterResult[]
  selectedActNumber: number
}

export const ChaptersView: React.FC<ChaptersViewProps> = ({
  chapters,
  selectedActNumber,
}) => {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'progress' | 'completed' | 'critical'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'contracted' | 'progress' | 'balance'>('default')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const filteredChapters = useMemo(() => {
    let result = [...chapters]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }

    // Status filter
    if (filterStatus === 'completed') {
      result = result.filter((c) => c.progressPct >= 0.999)
    } else if (filterStatus === 'progress') {
      result = result.filter((c) => c.progressPct > 0 && c.progressPct < 0.999)
    } else if (filterStatus === 'critical') {
      result = result.filter((c) => c.progressPct >= 0.85 && c.progressPct < 1.0)
    }

    // Sorting
    if (sortBy === 'contracted') {
      result.sort((a, b) => b.contracted - a.contracted)
    } else if (sortBy === 'progress') {
      result.sort((a, b) => b.progressPct - a.progressPct)
    } else if (sortBy === 'balance') {
      result.sort((a, b) => b.balance - a.balance)
    }

    return result
  }, [chapters, search, filterStatus, sortBy])

  const totalContracted = useMemo(() => chapters.reduce((sum, c) => sum + c.contracted, 0), [chapters])
  const totalExecuted = useMemo(() => chapters.reduce((sum, c) => sum + c.executedAccumulated, 0), [chapters])

  return (
    <div className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f4f2] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#73828c] font-semibold">
              Control de Partidas
            </span>
          </div>
          <h3 className="font-display font-bold text-lg sm:text-xl text-[#0b1724] mt-0.5">
            Avance Físico por Capítulo ({chapters.length} capítulos)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Card / Table Toggle */}
          <div className="inline-flex p-0.5 rounded-lg bg-[#f0f4f2] border border-[#e1e7e5] text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'cards'
                  ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                  : 'text-[#687a84] hover:text-[#0b1724]'
              }`}
            >
              <LayoutGrid size={13} />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-white font-bold text-[#0b1724] shadow-xs'
                  : 'text-[#687a84] hover:text-[#0b1724]'
              }`}
            >
              <Table2 size={13} />
              <span>Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9c99]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar capítulo o ítem..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-[#d6e0dd] bg-[#fbfcfa] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2e8564]/30 focus:border-[#2e8564] transition-all"
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

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              filterStatus === 'all'
                ? 'bg-[#0b1724] text-white border-[#0b1724]'
                : 'bg-white text-[#647580] border-[#d6e0dd] hover:border-[#a3b8b3]'
            }`}
          >
            Todos ({chapters.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('progress')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              filterStatus === 'progress'
                ? 'bg-[#2e8564] text-white border-[#2e8564]'
                : 'bg-white text-[#647580] border-[#d6e0dd] hover:border-[#a3b8b3]'
            }`}
          >
            En ejecución
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('completed')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              filterStatus === 'completed'
                ? 'bg-[#2c6ecb] text-white border-[#2c6ecb]'
                : 'bg-white text-[#647580] border-[#d6e0dd] hover:border-[#a3b8b3]'
            }`}
          >
            Completados (100%)
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('critical')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              filterStatus === 'critical'
                ? 'bg-[#e5a83b] text-[#0b1724] font-bold border-[#e5a83b]'
                : 'bg-white text-[#647580] border-[#d6e0dd] hover:border-[#a3b8b3]'
            }`}
          >
            Cercanos a cierre (&gt;85%)
          </button>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end md:self-auto text-xs font-mono">
          <span className="text-[#83929b] hidden sm:inline">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-1.5 px-2.5 rounded-lg border border-[#d6e0dd] bg-white text-[#455762] focus:outline-hidden focus:border-[#2e8564]"
          >
            <option value="default">Orden contractual</option>
            <option value="contracted">Mayor presupuesto</option>
            <option value="progress">Mayor avance %</option>
            <option value="balance">Mayor saldo pendiente</option>
          </select>
        </div>
      </div>

      {/* Chapters content */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5">
          {filteredChapters.map((chapter) => {
            const actIndex = selectedActNumber - 1
            const executedInAct = chapter.acts[actIndex] ?? 0
            const isCompleted = chapter.progressPct >= 0.999

            return (
              <div
                key={chapter.name}
                className="p-4 rounded-xl border border-[#dfe5e4] bg-[#fbfcfa] hover:bg-white hover:border-[#c5d5cf] transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-display font-semibold text-sm sm:text-base text-[#0b1724] leading-snug">
                      {chapter.name}
                    </h4>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                        isCompleted
                          ? 'bg-[#e5f5ee] text-[#2e8564] border border-[#bce4d4]'
                          : chapter.progressPct > 0.8
                          ? 'bg-[#fff5e0] text-[#b0791a] border border-[#f5dc9f]'
                          : 'bg-[#f0f4f2] text-[#4e606c]'
                      }`}
                    >
                      {formatPercent(chapter.progressPct)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#e8edeb] h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-[#2e8564]'
                          : chapter.progressPct > 0.8
                          ? 'bg-[#e5a83b]'
                          : 'bg-gradient-to-r from-[#2c6ecb] to-[#2e8564]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, chapter.progressPct * 100))}%` }}
                    />
                  </div>

                  {/* Financial metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-mono pt-3 border-t border-[#edf1ef]">
                    <div>
                      <span className="text-[#81909a] text-[10px] block uppercase">Contratado</span>
                      <strong className="text-[#0b1724] font-semibold block mt-0.5 truncate" title={formatCurrency(chapter.contracted)}>
                        {formatCompact(chapter.contracted)} COP
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#81909a] text-[10px] block uppercase">Ejecutado</span>
                      <strong className="text-[#2e8564] font-semibold block mt-0.5 truncate" title={formatCurrency(chapter.executedAccumulated)}>
                        {formatCompact(chapter.executedAccumulated)} COP
                      </strong>
                    </div>

                    <div>
                      <span className="text-[#81909a] text-[10px] block uppercase">Saldo</span>
                      <strong className="text-[#6b57a6] font-semibold block mt-0.5 truncate" title={formatCurrency(chapter.balance)}>
                        {formatCompact(chapter.balance)} COP
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer pill with current act impact */}
                <div className="mt-3.5 pt-2.5 border-t border-[#edf1ef] flex items-center justify-between text-[11px] font-mono text-[#6c7d87]">
                  <span>
                    Aporte en Acta {selectedActNumber}:{' '}
                    <b className="text-[#0b1724] font-semibold">{formatCurrency(executedInAct)}</b>
                  </span>
                  <span>{formatPercent(chapter.sharePct)} del contrato</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Full Data Table */
        <div className="mt-5 overflow-x-auto rounded-lg border border-[#e1e7e5]">
          <table className="w-full text-left text-xs font-mono border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#f5f8f7] text-[#5e707b] border-b border-[#dfe5e4]">
                <th className="py-2.5 px-3 font-semibold min-w-[220px]">Capítulo</th>
                <th className="py-2.5 px-3 font-semibold text-right">Contratado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ejecutado Acum.</th>
                <th className="py-2.5 px-3 font-semibold text-right">% Avance</th>
                <th className="py-2.5 px-3 font-semibold text-right">Saldo</th>
                <th className="py-2.5 px-3 font-semibold text-right">En Acta {selectedActNumber}</th>
                <th className="py-2.5 px-3 font-semibold text-right">% Contrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {filteredChapters.map((chapter) => {
                const actIndex = selectedActNumber - 1
                const executedInAct = chapter.acts[actIndex] ?? 0

                return (
                  <tr key={chapter.name} className="hover:bg-[#f8faf9] transition-colors">
                    <td className="py-2.5 px-3 whitespace-normal font-sans font-medium text-[#0b1724]">
                      {chapter.name}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatCurrency(chapter.contracted)}</td>
                    <td className="py-2.5 px-3 text-right text-[#2e8564] font-medium">
                      {formatCurrency(chapter.executedAccumulated)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#0b1724]">
                      {formatPercent(chapter.progressPct)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#6b57a6]">
                      {formatCurrency(chapter.balance)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#0b1724]">
                      {formatCurrency(executedInAct)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#6c7d87]">
                      {formatPercent(chapter.sharePct)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
