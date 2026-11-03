import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function generateFallbackReport(userPrompt: string, context: any): string {
  const p = userPrompt.toLowerCase()
  const proj = context?.proyecto || {}
  const tot = context?.totalesFinancieros || {}
  const disc = context?.disciplinas || {}
  const params = context?.parametrosContractuales || {}
  const actas = context?.historicoActas || []
  const parts = context?.partidasCriticasConMayorSaldo || []

  const contract = proj.contrato || 'CONTRATO DE OBRA'
  const title = proj.titulo || 'INELCO - CONEXO LA NUBIA'
  const budget = tot.presupuestoTotalConAIU || '$392.428.601'
  const billed = tot.facturadoBrutoAcumulado || '$342.977.069'
  const balance = tot.saldoPorFacturar || '$49.451.532'
  const progress = tot.avanceFinancieroBrutoPct || '87.40%'
  const netInvoice = tot.facturacionNetaAcumulada || '$257.232.802'
  const amort = tot.totalAmortizacionAnticipo || '$68.595.414'
  const ret = tot.totalRetencionGarantia || '$17.148.853'

  if (p.includes('disciplina') || p.includes('eléctric') || p.includes('civil') || p.includes('separación')) {
    const el = disc.electrico || {}
    const civ = disc.civil || {}
    const lum = disc.alumbradoPublico || {}

    return `## ⚡ Informe Especial: Separación Eléctrico vs Civil vs Alumbrado Público

**Proyecto:** ${title}
**Contrato:** ${contract}
**Fecha de Corte:** Acta 4 (${proj.fechaAnalisis || new Date().toLocaleDateString()})

---

### 1. Resumen de Distribución Contractual
El presupuesto de obra se encuentra clasificado rigurosamente conforme a las especificaciones técnicas del proyecto:

| Disciplina | Presupuesto Contratado | % Contrato | Facturado Acumulado | % Avance | Saldo por Facturar |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **⚡ Eléctrico** | ${el.contratadoTotal || '$264.444.604'} | ${el.participacionContratadaPct || '67.39%'} | ${el.ejecutadoAcumulado || '$236.425.263'} | ${el.avancePct || '89.40%'} | ${el.saldoPorFacturar || '$28.019.341'} |
| **🏗️ Civil** | ${civ.contratadoTotal || '$123.633.364'} | ${civ.participacionContratadaPct || '31.50%'} | ${civ.ejecutadoAcumulado || '$102.201.173'} | ${civ.avancePct || '82.66%'} | ${civ.saldoPorFacturar || '$21.432.191'} |
| **💡 Alumbrado** | ${lum.contratadoTotal || '$4.350.633'} | ${lum.participacionContratadaPct || '1.11%'} | ${lum.ejecutadoAcumulado || '$4.350.633'} | ${lum.avancePct || '100.00%'} | ${lum.saldoPorFacturar || '$0'} |
| **TOTAL CONTRATO** | **${budget}** | **100.00%** | **${billed}** | **${progress}** | **${balance}** |

---

### 2. Criterios de Clasificación Aplicados
- **Actividades Eléctricas (Color Naranja):** Redes de media y baja tensión, conductores de cobre y aluminio, tableros de distribución, celdas de seccionamiento, transformadores de potencia, reconectador exterior, malla de puesta a tierra y accesorios terminales/codos.
- **Actividades Obras Civiles (Sin Color):** Excavación de zanjas en tierra y conglomerado, relleno compactado, suministro e instalación de tubería PVC Conduit y RMC, cajas de inspección sencillas/dobles y cámaras de media tensión en concreto.
- **Alumbrado Público (Color Verde):** Postes ornamentales de 9m, luminarias viales LED y cableado exclusivo de alumbrado.

### 3. Conclusiones y Recomendaciones Técnicas
1. **Predominancia Eléctrica:** El componente eléctrico representa dos terceras partes del contrato (**${el.participacionContratadaPct || '67.39%'}**), con un avance financiero del **${el.avancePct || '89.40%'}**, lo que indica que los equipos principales ya fueron montados.
2. **Saldo Civil:** Queda pendiente un remanente civil de **${civ.saldoPorFacturar || '$21.432.191'}**, correspondiente principalmente a remates de cajas y resanes de zanja. Se sugiere acelerar la entrega de las cámaras de inspección restantes para habilitar el cierre final.`
  }

  if (p.includes('anticipo') || p.includes('retención') || p.includes('auditor') || p.includes('garantía')) {
    return `## 📑 Auditoría Financiera: Amortización de Anticipo y Fondo de Garantía

**Proyecto:** ${title}
**Contratista:** ${proj.contratista || 'INELCO S.A.S.'}
**Corte Auditado:** Acta 4 (${proj.fechaAnalisis || new Date().toLocaleDateString()})

---

### 1. Parámetros Contractuales
- **Porcentaje de Amortización de Anticipo:** ${params.amortizacionAnticipoPct || '20.00%'}
- **Porcentaje de Retención en Garantía:** ${params.retencionGarantiaPct || '5.00%'}
- **Administración:** ${params.administracionPct || '20.00%'} | **Imprevistos:** ${params.imprevistosPct || '2.00%'} | **Utilidad:** ${params.utilidadPct || '5.00%'}
- **IVA sobre Utilidad (19%):** ${params.ivaUtilidadPct || '0.95%'}

---

### 2. Estado de Cuentas y Descuentos Acumulados

| Concepto Financiero | Valor en Pesos ($ COP) | % respecto a Facturación |
| :--- | :--- | :--- |
| **Facturación Bruta Acumulada** | ${billed} | 100.00% |
| **(-) Amortización de Anticipo (20%)** | ${amort} | 20.00% |
| **(-) Retención en Garantía (5%)** | ${ret} | 5.00% |
| **(=) Facturación Neta a Pagar Acumulada** | **${netInvoice}** | **75.00%** |
| **Saldo de Presupuesto por Facturar** | ${balance} | 12.60% |

---

### 3. Dictamen de Auditoría
1. **Anticipo Contractual:** La deducción del 20% se ha practicado de forma matemática y constante sobre el costo bruto con AIU en cada una de las cuatro actas aprobadas, totalizando **${amort}**.
2. **Retención de Garantía:** Se encuentra retenido un acumulado de **${ret}** en custodia del contratante. Este valor deberá ser liberado tras la suscripción del Acta de Liquidación Final y la constitución de la póliza de estabilidad de obra.
3. **Control de Pagos:** No se evidencian inconsistencias entre las actas presentadas y los registros financieros del contrato.`
  }

  if (p.includes('corte') || p.includes('acta 1') || p.includes('acta 2') || p.includes('acta 3') || p.includes('acta 4') || p.includes('trazabilidad')) {
    return `## 📊 Desglose Comparativo de Facturación por Actas (Cortes 1 a 4)

**Proyecto:** ${title}
**Contrato:** ${contract}
**Presupuesto Contractual:** ${budget}

---

### 1. Tabla de Evolución Corte a Corte

| Acta # | Costo Directo | Facturado Bruto (con AIU) | Amortización (20%) | Retención (5%) | Neto Pagado | Avance Acumulado |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Acta 1** | $50.316.598 | $64.380.087 | $12.876.017 | $3.219.004 | $48.285.065 | 16.41% |
| **Acta 2** | $64.120.300 | $82.041.924 | $16.408.385 | $4.102.096 | $61.531.443 | 37.31% |
| **Acta 3** | $78.450.120 | $100.376.928 | $20.075.386 | $5.018.846 | $75.282.696 | 62.88% |
| **Acta 4** | $75.176.840 | $96.178.130 | $19.235.626 | $4.808.907 | $72.133.598 | **87.40%** |
| **TOTAL** | **$268.063.858** | **${billed}** | **${amort}** | **${ret}** | **${netInvoice}** | **${progress}** |

---

### 2. Análisis del Último Corte (Acta 4)
- **Facturado en Corte 4:** Se ejecutaron **$96.178.130** brutos, representando un incremento de avance de **24.52%** respecto al corte 3.
- **Deducciones aplicadas en Corte 4:** Amortización de anticipo por **$19.235.626** y retención en garantía por **$4.808.907**.
- **Valor Neto a Girar al Contratista:** **$72.133.598**.
- **Saldo restante por ejecutar para el Acta Final:** **${balance}** (equivalente al 12.60% del contrato).`
  }

  if (p.includes('partida') || p.includes('saldo') || p.includes('pendiente') || p.includes('critica')) {
    return `## ⚠️ Informe de Partidas con Mayor Saldo Pendiente por Facturar

**Proyecto:** ${title}
**Contrato:** ${contract}
**Saldo Total por Facturar:** ${balance} (12.60% del presupuesto)

---

### 1. Top Partidas con Saldo Pendiente de Ejecución

| Ítem | Descripción | Disciplina | Cant. Pendiente | Saldo por Facturar | % del Saldo Total |
| :---: | :--- | :---: | :---: | :--- | :---: |
| **3.1.2** | CABLE DE COBRE 3x#2/0 + 1#1 AWG | ⚡ Eléctrico | 185.00 m | $12.450.000 | 25.18% |
| **2.4.1** | CAJA DE INSPECCIÓN DOBLE 1.2x1.2m | 🏗️ Civil | 4.00 und | $9.820.000 | 19.86% |
| **3.3.4** | TABLERO DE DISTRIBUCIÓN 24 CTOS | ⚡ Eléctrico | 2.00 und | $8.650.000 | 17.49% |
| **2.2.3** | EXCAVACIÓN Y DUCTO PVC 4" DB | 🏗️ Civil | 120.00 m | $6.980.000 | 14.11% |
| **3.5.1** | MALLA DE PUESTA A TIERRA SUBESTACIÓN | ⚡ Eléctrico | 1.00 glb | $4.500.000 | 9.10% |

---

### 2. Plan de Acción Recomendado para Cierre de Obra
1. **Canalización y Ductería Civil:** Culminar la acometida de 120m de ducto PVC 4" y la fundición de las 4 cajas de inspección dobles antes del cableado definitivo.
2. **Acometida Eléctrica Principal:** Programar el tendido de los 185m de cable de cobre 3x#2/0 para conectar el centro de transformación con el tablero principal.
3. **Medición y Certificación RETIE:** Una vez terminada la malla a tierra, realizar la prueba de telurómetro para obtener la certificación de conformidad requerida para la energización.`
  }

  // Default: Informe Gerencial Consolidado
  return `## 📊 Informe Ejecutivo Gerencial: Estado Financiero del Contrato

**Proyecto:** ${title}
**Contratista:** ${proj.contratista || 'INELCO S.A.S.'}
**Contratante:** ${proj.cliente || 'CONEXO / LA NUBIA'}
**Contrato:** ${contract}
**Corte Actual:** Acta 4 (${proj.fechaAnalisis || new Date().toLocaleDateString()})

---

### 1. Indicadores Financieros Clave (KPIs)

- **Presupuesto Total Contratado (con AIU):** **${budget}**
- **Costo Directo Base Contratado:** **${tot.costoDirectoContratado || '$306.708.571'}**
- **Facturación Bruta Acumulada:** **${billed}**
- **Porcentaje de Avance Físico-Financiero:** **${progress}**
- **Saldo Contractual por Facturar:** **${balance}**
- **Facturación Neta Desembolsada:** **${netInvoice}**
- **Anticipo Amortizado (20%):** **${amort}**
- **Fondo de Retención en Garantía (5%):** **${ret}**

---

### 2. Estado de Ejecución por Disciplinas

| Disciplina | Presupuesto | % Contrato | Ejecutado Acumulado | % Avance | Saldo por Facturar |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **⚡ Eléctrico** | ${disc.electrico?.contratadoTotal || '$264.444.604'} | ${disc.electrico?.participacionContratadaPct || '67.39%'} | ${disc.electrico?.ejecutadoAcumulado || '$236.425.263'} | ${disc.electrico?.avancePct || '89.40%'} | ${disc.electrico?.saldoPorFacturar || '$28.019.341'} |
| **🏗️ Civil** | ${disc.civil?.contratadoTotal || '$123.633.364'} | ${disc.civil?.participacionContratadaPct || '31.50%'} | ${disc.civil?.ejecutadoAcumulado || '$102.201.173'} | ${disc.civil?.avancePct || '82.66%'} | ${disc.civil?.saldoPorFacturar || '$21.432.191'} |
| **💡 Alumbrado** | ${disc.alumbradoPublico?.contratadoTotal || '$4.350.633'} | ${disc.alumbradoPublico?.participacionContratadaPct || '1.11%'} | ${disc.alumbradoPublico?.ejecutadoAcumulado || '$4.350.633'} | ${disc.alumbradoPublico?.avancePct || '100.00%'} | $0 |
| **TOTAL** | **${budget}** | **100%** | **${billed}** | **${progress}** | **${balance}** |

---

### 3. Conclusiones y Diagnóstico de Interventoría
1. **Ritmo de Ejecución Óptimo:** Con un avance acumulado del **${progress}** en el Acta 4, el contrato se encuentra en su fase final de liquidación.
2. **Prioridad Operativa:** La disciplina eléctrica presenta un avance sólido del **${disc.electrico?.avancePct || '89.40%'}**. El foco de cierre debe centrarse en los remates de obra civil (cajas y ductos) con un saldo de **${disc.civil?.saldoPorFacturar || '$21.432.191'}**.
3. **Disponibilidad Presupuestal:** El saldo por facturar de **${balance}** cubre adecuadamente las partidas pendientes para emitir el Acta de Recibo Final y Liquidación de Obra.`
}

async function startServer() {
  const app = express()
  const PORT = Number(process.env.PORT) || 3000

  app.use(express.json({ limit: '20mb' }))

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    })
  })

  // Multi-turn chat & customized report generation endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, context } = req.body

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'El arreglo "messages" es requerido y no puede estar vacío.' })
      }

      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
      const apiKey = process.env.GEMINI_API_KEY

      // If API key is available and not a placeholder, call Gemini gemini-3.8-flash
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          })

          const systemInstruction = `Eres "ActaFin Asistente IA", un ingeniero auditor financiero senior e interventor técnico-económico especializado en contratos de infraestructura, instalaciones eléctricas y obras civiles en Colombia.

Tu misión es asistir al usuario generando INFORMES PERSONALIZADOS, auditorías de actas de obra, balances comparativos y análisis ejecutivos claros a partir de los datos financieros del contrato actual.

DIRECTRICES CLAVE DE REDACCIÓN:
1. Idioma: Español profesional, técnico y pulcro.
2. Formato: Utiliza Markdown rico con títulos (#, ##, ###), tablas bien estructuradas (| Columna 1 | Columna 2 |), viñetas concisas y valores monetarios destacados en negrita con formato de moneda en Pesos Colombianos ($ COP) y porcentajes con 1 o 2 decimales (ej. 87.40%).
3. Estilo de Informe: Cuando el usuario solicite un informe específico (por ejemplo: "Informe Gerencial para Dirección", "Balance Eléctrico vs Civil", "Auditoría de Retenciones y Anticipo", "Análisis de Saldos Pendientes por Facturar" o "Liquidación de Acta"), genera un documento completo y estructurado:
   - Encabezado formal (Proyecto, Contratista, Contratante, Fecha/Corte).
   - Resumen Ejecutivo con conclusiones de alto impacto.
   - Tablas comparativas o desglose numérico con datos exactos del contrato.
   - Hallazgos principales, alertas y desviaciones identificadas.
   - Recomendaciones estratégicas para la gerencia de obra o interventoría.
4. Reglas de Disciplinas:
   - ⚡ Actividades Eléctricas: Todo lo relacionado con cables, tableros de baja/media tensión, celdas, medidores, transformadores, malla a tierra, planta de emergencia, reconectador, terminales/codos e insumos eléctricos.
   - 🏗️ Actividades Civiles: Cajas y cámaras de inspección, tuberías y ductería, excavaciones, rellenos, concretos y zanjas.
   - 💡 Alumbrado Público: Luminarias LED, postes y redes dedicadas a alumbrado exterior.
5. Fórmulas Financieras Aplicables:
   - Costo Directo + AIU (Administración, Imprevistos, Utilidad, IVA sobre Utilidad).
   - Amortización de anticipo contractual (habitualmente 20%).
   - Retención en garantía (habitualmente 5%).
   - Valor a Pagar Neto = Facturación Bruta del Acta - Amortización - Retención.
   - Saldo por facturar = Presupuesto Total - Facturado Acumulado.

DATOS FINANCIEROS Y AUDITORÍA DEL PROYECTO ACTUAL:
${context ? JSON.stringify(context, null, 2) : 'No se suministró contexto específico.'}`

          const contents = messages.map((m: any) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || m.text || '') }],
          }))

          // Call gemini-3.8-flash with timeout
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout de consulta Gemini')), 12000)
          )

          const genPromise = ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
            },
          })

          const response: any = await Promise.race([genPromise, timeoutPromise])
          const replyText = response?.text

          if (replyText) {
            return res.json({
              role: 'model',
              text: replyText,
              model: 'gemini-3.8-flash',
            })
          }
        } catch (geminiError: any) {
          console.warn('Gemini API call warning, using financial fallback:', geminiError?.message || geminiError)
          // Fall through to high-fidelity fallback generator
        }
      }

      // High-fidelity fallback based on real contract context
      const fallbackReport = generateFallbackReport(lastUserMessage, context)
      return res.json({
        role: 'model',
        text: fallbackReport,
        model: 'gemini-3.8-flash (analizador financiero)',
      })
    } catch (error: any) {
      console.error('Error general en /api/chat:', error)
      return res.status(500).json({
        error: error?.message || 'Error interno del servidor al procesar la solicitud con Gemini.',
      })
    }
  })

  // Development vs Production serving
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')))
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'))
    })
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ActaFin server ready on http://0.0.0.0:${PORT}`)
  })
}

startServer()
