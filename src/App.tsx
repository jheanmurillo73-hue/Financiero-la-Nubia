import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Zap,
  FileSpreadsheet,
  Layers,
  SlidersHorizontal,
  ShieldCheck,
  Download,
  Upload,
  Sparkles,
  AlertCircle,
  FileText,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Header } from './components/Header'
import { MobileBottomNav } from './components/MobileBottomNav'
import { ExecutiveKpis } from './components/ExecutiveKpis'
import { BillingGauge } from './components/BillingGauge'
import { ProgressEvolutionChart } from './components/ProgressEvolutionChart'
import { ActaFocusCard } from './components/ActaFocusCard'
import { ActasTable } from './components/ActasTable'
import { ChaptersView } from './components/ChaptersView'
import { DisciplinesView } from './components/DisciplinesView'
import { SimulatorPanel } from './components/SimulatorPanel'
import { AuditView } from './components/AuditView'
import { EmptyState } from './components/EmptyState'
import { ExportModal } from './components/ExportModal'
import { parseActaWorkbook, recalculateWithParams, updateItemDiscipline } from './lib/parseActa'
import { getSampleReport } from './lib/sampleData'
import { formatCurrency, formatPercent, formatCompact } from './lib/formatters'
import type { FinancialReport, FinancialParams, DisciplineType } from './lib/model'

type AppStatus = 'empty' | 'reading' | 'ready' | 'error'

export default function App() {
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [status, setStatus] = useState<AppStatus>('empty')
  const [fileName, setFileName] = useState<string>('')
  const [selectedAct, setSelectedAct] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<string>('disciplinas')
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load Conexo La Nubia on start if query param or default
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('autostart') === '1' || params.get('conexo') === '1') {
      handleLoadRealConexo()
    } else {
      // Load real Conexo file directly on first mount so the user immediately sees the requested separation
      handleLoadRealConexo()
    }
  }, [])

  const handleLoadRealConexo = async () => {
    setStatus('reading')
    setErrorMessage(null)
    try {
      const res = await fetch('/acta_conexo_la_nubia.xlsm')
      if (!res.ok) throw new Error('No se pudo cargar el archivo local')
      const buffer = await res.arrayBuffer()
      const parsed = parseActaWorkbook(buffer, '2026_10_16_ACTA_4_CONEXO_LA_NUBIA_INELCO.xlsm')
      setReport(parsed)
      setFileName('2026_10_16_ACTA_4_CONEXO_LA_NUBIA_INELCO.xlsm')
      setSelectedAct(parsed.acts[parsed.acts.length - 1]?.number || 4)
      setActiveTab('disciplinas')
      setStatus('ready')
    } catch (err: any) {
      console.warn('Fallback to sample report if fetch fails:', err)
      const demo = getSampleReport()
      setReport(demo)
      setFileName(demo.fileName)
      setSelectedAct(demo.acts[demo.acts.length - 1]?.number || 1)
      setActiveTab('disciplinas')
      setStatus('ready')
    }
  }

  const loadDemoData = () => {
    setStatus('reading')
    setTimeout(() => {
      const demo = getSampleReport()
      setReport(demo)
      setFileName(demo.fileName)
      setSelectedAct(demo.acts[demo.acts.length - 1]?.number || 1)
      setActiveTab('disciplinas')
      setStatus('ready')
      setErrorMessage(null)
    }, 120)
  }

  const handleProcessFile = async (file: File) => {
    setFileName(file.name)
    setStatus('reading')
    setErrorMessage(null)

    try {
      const buffer = await file.arrayBuffer()
      await new Promise((r) => setTimeout(r, 60))
      const parsed = parseActaWorkbook(buffer, file.name)
      const hasErrors = parsed.validation.some((v) => v.level === 'error')

      if (hasErrors && parsed.acts.length === 0) {
        setReport(null)
        setStatus('error')
        const firstErr = parsed.validation.find((v) => v.level === 'error')
        setErrorMessage(firstErr ? firstErr.message : 'Error al procesar el archivo.')
      } else {
        setReport(parsed)
        setSelectedAct(parsed.acts[parsed.acts.length - 1]?.number || 1)
        setActiveTab('disciplinas')
        setStatus('ready')
      }
    } catch (err: any) {
      console.error('Error processing workbook:', err)
      setReport(null)
      setStatus('error')
      setErrorMessage(
        'No pudimos interpretar el libro Excel. Verifica que contenga la hoja obligatoria "Acta" y formato válido.'
      )
    }
  }

  const handleReset = () => {
    setReport(null)
    setStatus('empty')
    setFileName('')
    setSelectedAct(0)
    setActiveTab('disciplinas')
    setErrorMessage(null)
  }

  const handleUpdateParams = (newParams: FinancialParams) => {
    if (!report) return
    const updated = recalculateWithParams(report, newParams)
    setReport(updated)
  }

  const handleResetParams = () => {
    if (!report) return
    const restored = recalculateWithParams(report, report.originalParams)
    setReport(restored)
  }

  const handleUpdateDiscipline = (rowNumber: number, newDiscipline: DisciplineType) => {
    if (!report) return
    const updated = updateItemDiscipline(report, rowNumber, newDiscipline)
    setReport(updated)
  }

  const warningsCount =
    report?.validation.filter((v) => v.level === 'warning').length || 0

  const navTabs = [
    {
      id: 'disciplinas',
      label: '⚡ Eléctrico vs Civil',
      icon: Zap,
      badge: report
        ? `${(report.disciplines.Electrico.contractedPct * 100).toFixed(0)}% / ${(report.disciplines.Civil.contractedPct * 100).toFixed(0)}%`
        : undefined,
    },
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: LayoutDashboard },
    {
      id: 'actas',
      label: 'Trazabilidad de Actas',
      icon: FileSpreadsheet,
      badge: report ? `${report.acts.length}` : undefined,
    },
    {
      id: 'capitulos',
      label: 'Capítulos de Obra',
      icon: Layers,
      badge: report ? `${report.chapters.length}` : undefined,
    },
    {
      id: 'simulador',
      label: 'Simulador Financiero',
      icon: SlidersHorizontal,
      badge: report?.isSimulation ? 'Simulación' : undefined,
    },
    {
      id: 'auditoria',
      label: 'Auditoría & Reglas',
      icon: ShieldCheck,
      badge: warningsCount > 0 ? `${warningsCount}` : undefined,
    },
  ]

  return (
    <div className="min-h-screen bg-[#f2f5f4] text-[#121e28] flex flex-col font-sans pb-20 md:pb-12">
      {/* Top Header */}
      <Header
        report={report}
        fileName={fileName}
        onLoadDemo={loadDemoData}
        onLoadRealConexo={handleLoadRealConexo}
        onReset={handleReset}
        onOpenUpload={() => handleReset()}
        onOpenExport={() => setIsExportOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        {/* Error notification banner */}
        {status === 'error' && errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#fff5f5] border border-[#f5c6c6] text-[#a83232] flex items-start justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-display font-semibold text-sm block">
                  No fue posible procesar el archivo
                </strong>
                <p className="text-xs font-mono mt-0.5 text-[#8a3333]">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadRealConexo}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#a83232] text-white hover:bg-[#8f2828] transition-colors shrink-0"
            >
              Cargar Acta 4 Conexo
            </button>
          </div>
        )}

        {/* Empty state when no report is loaded */}
        {!report ? (
          <EmptyState
            onFileSelect={handleProcessFile}
            onLoadDemo={loadDemoData}
            onLoadRealConexo={handleLoadRealConexo}
            isReading={status === 'reading'}
          />
        ) : (
          <div className="space-y-6">
            {/* Project Summary Strip */}
            <section className="bg-white rounded-xl border border-[#dfe5e4] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#687b87]">
                  <Building size={12} className="text-[#3b8f71]" />
                  <span>{report.contract}</span>
                  {report.contractor && (
                    <>
                      <span>•</span>
                      <span className="truncate">{report.contractor}</span>
                    </>
                  )}
                </div>
                <h2
                  className="font-display font-bold text-lg sm:text-2xl text-[#0b1724] mt-1 leading-snug truncate"
                  title={report.title}
                >
                  {report.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#687882] mt-1">
                  <span>
                    Hoja: <b>{report.sourceSheet}</b>
                  </span>
                  <span>•</span>
                  <span>
                    <b>{report.acts.length}</b> cortes analizados
                  </span>
                  <span>•</span>
                  <span>
                    <b>{report.items.length}</b> partidas clasificadas
                  </span>
                  <span>•</span>
                  <span className="text-[#2e8564] font-medium">
                    Avance: <b>{formatPercent(report.grossProgressPct)}</b>
                  </span>
                </div>
              </div>

              {/* Desktop Quick Tab Selector & Actions */}
              <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0b1724] text-white hover:bg-[#1a2c3d] shadow-sm transition-all"
                >
                  <Download size={14} className="text-[#f8c866]" />
                  <span>Exportar Informe</span>
                </button>
              </div>
            </section>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 bg-[#eaeff0] rounded-xl border border-[#dce4e2] text-xs font-mono">
              {navTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-white text-[#0b1724] shadow-xs font-bold'
                        : 'text-[#5f717d] hover:text-[#0b1724] hover:bg-white/50'
                    }`}
                  >
                    <Icon
                      size={15}
                      className={tab.id === 'disciplinas' ? 'text-[#e5a83b]' : undefined}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? tab.id === 'disciplinas'
                              ? 'bg-[#e5a83b] text-[#0b1724]'
                              : 'bg-[#0b1724] text-white'
                            : 'bg-[#d2dcda] text-[#3e515d]'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Mobile Horizontal Acta Quick Pill Selector */}
            <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-xl border border-[#dfe5e4] shadow-xs">
              <div className="text-xs font-mono text-[#627581]">
                Corte seleccionado: <strong className="text-[#0b1724]">Acta {selectedAct}</strong>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {report.acts.map((act) => (
                  <button
                    key={act.number}
                    type="button"
                    onClick={() => setSelectedAct(act.number)}
                    className={`min-w-[34px] h-8 px-2 text-xs font-mono rounded-md font-bold transition-all ${
                      act.number === selectedAct
                        ? 'bg-[#0b1724] text-[#f8c866]'
                        : 'bg-[#f0f4f2] text-[#4d5f6b]'
                    }`}
                  >
                    {act.number}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB: DISCIPLINAS (ELÉCTRICO VS CIVIL VS ALUMBRADO) */}
            {activeTab === 'disciplinas' && (
              <DisciplinesView
                report={report}
                selectedActNumber={selectedAct}
                onUpdateDiscipline={handleUpdateDiscipline}
                onSelectAct={setSelectedAct}
              />
            )}

            {/* TAB: RESUMEN EJECUTIVO */}
            {activeTab === 'resumen' && (
              <div className="space-y-6">
                {/* Executive KPIs */}
                <ExecutiveKpis report={report} />

                {/* Quick Discipline Highlight Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#fffbf0] via-[#f7faff] to-[#f4faf7] border border-[#e2e8e5] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e5a83b] text-[#0b1724] flex items-center justify-center font-bold shrink-0">
                      <Zap size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-[#0b1724] block">
                        Separación Eléctrica vs Civil vs Alumbrado:
                      </span>
                      <span className="text-xs font-mono text-[#586b76]">
                        ⚡ Eléctrico: <b>{formatPercent(report.disciplines.Electrico.contractedPct)}</b> ({formatCompact(report.disciplines.Electrico.contractedTotal)}) · 🏗️ Civil: <b>{formatPercent(report.disciplines.Civil.contractedPct)}</b> ({formatCompact(report.disciplines.Civil.contractedTotal)}) · 💡 Alumbrado: <b>{formatPercent(report.disciplines.Alumbrado.contractedPct)}</b> ({formatCompact(report.disciplines.Alumbrado.contractedTotal)})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('disciplinas')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-[#0b1724] text-white rounded-lg hover:bg-[#1a2d3e] transition-colors shrink-0"
                  >
                    <span>Ver Análisis Detallado</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Billing Gauge / Meter */}
                <BillingGauge report={report} />

                {/* Charts and Focused Corte Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7">
                    <ProgressEvolutionChart
                      report={report}
                      selectedAct={selectedAct}
                      onSelectAct={setSelectedAct}
                    />
                  </div>

                  <div className="lg:col-span-5">
                    <ActaFocusCard
                      report={report}
                      selectedActNumber={selectedAct}
                      onSelectAct={setSelectedAct}
                    />
                  </div>
                </div>

                {/* Quick Chapter Preview */}
                <ChaptersView
                  chapters={report.chapters}
                  selectedActNumber={selectedAct}
                />
              </div>
            )}

            {/* TAB: TRAZABILIDAD DE ACTAS */}
            {activeTab === 'actas' && (
              <div className="space-y-6">
                <ActasTable
                  acts={report.acts}
                  selectedActNumber={selectedAct}
                  onSelectAct={setSelectedAct}
                  grossBudget={report.grossBudget}
                  directCostContracted={report.directCostContracted}
                />

                <ActaFocusCard
                  report={report}
                  selectedActNumber={selectedAct}
                  onSelectAct={setSelectedAct}
                />
              </div>
            )}

            {/* TAB: CAPÍTULOS DE OBRA */}
            {activeTab === 'capitulos' && (
              <div className="space-y-6">
                <ChaptersView
                  chapters={report.chapters}
                  selectedActNumber={selectedAct}
                />
              </div>
            )}

            {/* TAB: SIMULADOR FINANCIERO */}
            {activeTab === 'simulador' && (
              <div className="space-y-6">
                <SimulatorPanel
                  report={report}
                  onUpdateParams={handleUpdateParams}
                  onResetParams={handleResetParams}
                />
              </div>
            )}

            {/* TAB: AUDITORÍA Y DIAGNÓSTICO */}
            {activeTab === 'auditoria' && (
              <div className="space-y-6">
                <AuditView report={report} />
              </div>
            )}

            {/* Footer */}
            <footer className="pt-6 border-t border-[#dfe5e4] flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#76858e] gap-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[#3b8f71]" />
                <span>ActaFin v1.3 · Separación Eléctrico / Civil / Alumbrado Público</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsExportOpen(true)}
                  className="hover:text-[#0b1724] underline"
                >
                  Descargar informe
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="hover:text-[#0b1724] underline"
                >
                  Cargar otro archivo
                </button>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {report && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          warningsCount={warningsCount}
          isSimulation={report.isSimulation}
        />
      )}

      {/* Export Modal */}
      {report && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          report={report}
        />
      )}
    </div>
  )
}
