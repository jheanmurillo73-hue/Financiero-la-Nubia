import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  RotateCcw,
  Copy,
  Check,
  Download,
  Printer,
  Bot,
  User,
  Zap,
  Building,
  FileSpreadsheet,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { buildChatReportContext } from '../lib/chatContext'
import { formatCurrency, formatPercent } from '../lib/formatters'
import type { FinancialReport } from '../lib/model'

export interface ChatMessage {
  id: string
  role: 'user' | 'model'
  content: string
  timestamp: string
}

interface ReportChatbotProps {
  report: FinancialReport
  selectedActNumber?: number
}

const PRESET_PROMPTS = [
  {
    id: 'gerencial',
    title: 'Informe Gerencial Consolidado',
    icon: Sparkles,
    badge: 'Recomendado',
    prompt:
      'Genera un Informe Gerencial Consolidado de alto nivel para la Dirección del proyecto. Incluye resumen del contrato, avance global bruto y neto, facturado acumulado vs saldo pendiente, y un análisis de liquidez y ejecución.',
  },
  {
    id: 'disciplinas',
    title: 'Balance Eléctrico vs Civil',
    icon: Zap,
    badge: 'Separación',
    prompt:
      'Genera un informe financiero detallado de la separación entre Actividades Eléctricas (cables, tableros, transformador, medidores, etc.), Actividades Civiles (cajas, cámaras, ducterías) y Alumbrado Público. Muestra los montos en dinero contratados, ejecutados acumulados, saldos por facturar y porcentajes de avance de cada disciplina.',
  },
  {
    id: 'anticipo',
    title: 'Auditoría de Anticipo y Retenciones',
    icon: ShieldCheck,
    badge: 'Auditoría',
    prompt:
      'Elabora una auditoría exhaustiva sobre la amortización del anticipo (20%) y la retención en garantía (5%). Detalla cuánto se ha amortizado hasta el corte actual, cuánto resta por amortizar, y el fondo retenido en garantía acumulado.',
  },
  {
    id: 'cortes',
    title: 'Desglose por Actas (Cortes 1 al 4)',
    icon: FileSpreadsheet,
    badge: 'Trazabilidad',
    prompt:
      'Presenta un informe comparativo corte por corte (Acta 1 a Acta 4). En una tabla clara, muestra el costo directo, facturado bruto con AIU, amortización, retención en garantía, valor neto a pagar de cada acta y el porcentaje acumulado de avance.',
  },
  {
    id: 'partidas',
    title: 'Partidas Pendientes por Facturar',
    icon: AlertTriangle,
    badge: 'Saldos',
    prompt:
      'Identifica y analiza las principales partidas o ítems con mayor saldo pendiente por facturar. Explica qué porcentaje representan del presupuesto restante y qué actividades requieren atención para su culminación.',
  },
  {
    id: 'interventoria',
    title: 'Minuta Técnica de Interventoría',
    icon: Building,
    badge: 'Formal',
    prompt:
      'Redacta un informe formal de interventoría técnica y económica del proyecto con formato listo para emitir. Incluye antecedentes, estado contractual, verificación de cantidades de obra ejecutadas, balance financiero y recomendaciones del interventor.',
  },
]

export const ReportChatbot: React.FC<ReportChatbotProps> = ({ report, selectedActNumber = 4 }) => {
  const initialGreeting: ChatMessage = {
    id: 'msg-init',
    role: 'model',
    content: `### 🤖 Asistente IA de Auditoría & Informes

¡Hola! Soy tu asistente financiero para el contrato **${report.contract}** (*${report.title}*).

Tengo cargada toda la información financiera del proyecto:
- **Presupuesto Total (con AIU):** ${formatCurrency(report.grossBudget)}
- **Facturado Acumulado:** ${formatCurrency(report.totalGrossBilled)} (${formatPercent(report.grossProgressPct)})
- **Saldo por Facturar:** ${formatCurrency(report.billedBalance)}
- **⚡ Eléctrico:** ${formatPercent(report.disciplines.Electrico.contractedPct)} (${formatCurrency(report.disciplines.Electrico.contractedTotal)})
- **🏗️ Civil:** ${formatPercent(report.disciplines.Civil.contractedPct)} (${formatCurrency(report.disciplines.Civil.contractedTotal)})
- **💡 Alumbrado:** ${formatPercent(report.disciplines.Alumbrado.contractedPct)} (${formatCurrency(report.disciplines.Alumbrado.contractedTotal)})

Selecciona uno de los **informes preconfigurados** abajo o escribe cualquier consulta personalizada para generar tu reporte a la medida.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom of thread on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    const updatedHistory = [...messages, userMessage]
    setMessages(updatedHistory)
    setInputText('')
    setIsLoading(true)
    setError(null)

    try {
      const contextPayload = buildChatReportContext(report)

      // Send multi-turn history (excluding initial decorative greeting if needed, or sending full turns)
      const payloadMessages = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          context: {
            ...contextPayload,
            corteFocalizado: selectedActNumber,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Error en la solicitud: ${response.status}`)
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: data.text || 'No se recibió respuesta del modelo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: any) {
      console.error('Chat error:', err)
      setError(err?.message || 'Ocurrió un error al generar la respuesta. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleResetChat = () => {
    setMessages([initialGreeting])
    setError(null)
    setInputText('')
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const downloadReportAsMarkdown = (text: string, index: number) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Informe_${report.contract.replace(/\s+/g, '_')}_${index}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = (content: string) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe - ${report.contract}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 30px; line-height: 1.6; color: #1a202c; }
            h1, h2, h3 { color: #0b1724; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
            th, td { border: 1px solid #cbd5e0; padding: 8px 12px; text-align: left; }
            th { background: #0b1724; color: white; }
            tr:nth-child(even) { background: #f7fafc; }
            .header { border-bottom: 2px solid #2e8564; padding-bottom: 10px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${report.title}</h2>
            <p><strong>Contrato:</strong> ${report.contract} | <strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <pre style="white-space: pre-wrap; font-family: inherit;">${content}</pre>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 400)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#dfe5e4] shadow-xs flex flex-col h-[780px] max-h-[85vh] overflow-hidden">
      {/* Top Assistant Header */}
      <div className="p-4 sm:p-5 border-b border-[#e5ebe9] bg-gradient-to-r from-[#0b1724] to-[#16293d] text-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e5a83b] to-[#c78b22] text-[#0b1724] flex items-center justify-center font-bold shadow-md shadow-[#e5a83b]/20">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg text-white tracking-tight">
                Asistente & Generador de Informes IA
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-[#e5a83b] text-[#0b1724] rounded-full">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-xs font-mono text-[#a6b8c7]">
              Contexto activo: <strong className="text-white">{report.contract}</strong> · Avance: <b>{formatPercent(report.grossProgressPct)}</b>
            </p>
          </div>
        </div>

        {/* Clear/Reset button */}
        <button
          type="button"
          onClick={handleResetChat}
          title="Reiniciar conversación"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-white/10 hover:bg-white/20 text-[#e0ecf5] hover:text-white transition-colors"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Nueva Sesión</span>
        </button>
      </div>

      {/* Preset Report Chips Banner */}
      <div className="bg-[#f7faf9] border-b border-[#e5ebe9] px-4 py-2.5 overflow-x-auto shrink-0 flex items-center gap-2 text-xs">
        <span className="font-mono text-[11px] font-bold text-[#5c6e7a] shrink-0 flex items-center gap-1">
          <Lightbulb size={13} className="text-[#e5a83b]" /> Informes Rápidos:
        </span>
        <div className="flex items-center gap-2">
          {PRESET_PROMPTS.map((preset) => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSendMessage(preset.prompt)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#d6e0dd] hover:border-[#2e8564] hover:bg-[#f0f8f5] text-[#1e2e3b] text-[11px] font-medium whitespace-nowrap transition-all shadow-2xs disabled:opacity-50"
              >
                <Icon size={12} className="text-[#2e8564]" />
                <span>{preset.title}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#e8f3ef] text-[#246b50] font-mono">
                  {preset.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#fbfcfb]">
        {messages.map((message, idx) => {
          const isUser = message.role === 'user'
          const isModel = message.role === 'model'

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#0b1724] text-white shadow-xs'
                    : 'bg-gradient-to-br from-[#2e8564] to-[#1e5d45] text-white shadow-xs'
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
                  isUser
                    ? 'bg-[#0b1724] text-white rounded-tr-xs'
                    : 'bg-white border border-[#dbe4e1] text-[#1c2a36] rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2 text-[11px] font-mono">
                  <span className={`font-bold ${isUser ? 'text-[#f8c866]' : 'text-[#2e8564]'}`}>
                    {isUser ? 'Tú' : 'ActaFin Asistente IA'}
                  </span>
                  <span className={isUser ? 'text-white/60' : 'text-[#7e909c]'}>
                    {message.timestamp}
                  </span>
                </div>

                {/* Render Markdown for Assistant / Plain text for User */}
                {isUser ? (
                  <p className="text-sm text-[#f0f4f7] whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                ) : (
                  <div className="prose prose-sm max-w-none text-sm text-[#1e2e3b]">
                    <MarkdownRenderer content={message.content} />
                  </div>
                )}

                {/* Report Action Buttons for Assistant Messages */}
                {isModel && idx > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#e8efed] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#8a9ca8]">
                      Informe generado con datos de corte
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md bg-[#f0f4f2] hover:bg-[#e2ece8] text-[#2c3d4a] transition-colors"
                        title="Copiar texto completo en Markdown"
                      >
                        {copiedId === message.id ? (
                          <>
                            <Check size={12} className="text-[#2e8564]" />
                            <span className="text-[#2e8564] font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReportAsMarkdown(message.content, idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md bg-[#f0f4f2] hover:bg-[#e2ece8] text-[#2c3d4a] transition-colors"
                        title="Descargar como archivo Markdown (.md)"
                      >
                        <Download size={12} />
                        <span>.md</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(message.content)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md bg-[#f0f4f2] hover:bg-[#e2ece8] text-[#2c3d4a] transition-colors"
                        title="Imprimir o guardar en PDF"
                      >
                        <Printer size={12} />
                        <span className="hidden sm:inline">Imprimir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2e8564] to-[#1e5d45] text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-[#dbe4e1] rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-2xs max-w-sm">
              <div className="flex items-center gap-2.5 text-xs font-mono text-[#2e8564]">
                <span className="w-2 h-2 rounded-full bg-[#2e8564] animate-ping" />
                <span>Analizando datos y redactando informe personalizado...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[#fff5f5] border border-[#f5c6c6] text-[#a83232] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 rounded bg-[#a83232] text-white font-mono font-semibold hover:bg-[#8f2828] transition-colors shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-[#e5ebe9] bg-white shrink-0">
        <div className="relative flex items-end gap-2 bg-[#f4f7f6] rounded-xl p-2 border border-[#d6e0dd] focus-within:border-[#2e8564] focus-within:ring-2 focus-within:ring-[#2e8564]/10 transition-all">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre partidas, solicita un informe a la medida o escribe tu consulta..."
            rows={2}
            disabled={isLoading}
            className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm text-[#182834] placeholder-[#7d8f9c] leading-relaxed py-1 px-1.5"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="h-10 px-4 rounded-lg bg-[#0b1724] hover:bg-[#1a2d3e] text-[#f8c866] font-medium text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
          >
            <span>Generar</span>
            <Send size={14} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#7b8c98] px-1">
          <span>Presiona <b>Enter</b> para enviar, <b>Shift+Enter</b> para nueva línea</span>
          <span className="hidden sm:inline">IA basada en auditoría de contratos colombianos</span>
        </div>
      </div>
    </div>
  )
}
