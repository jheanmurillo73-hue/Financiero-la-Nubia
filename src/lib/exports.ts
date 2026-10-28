import * as XLSX from 'xlsx'
import type { FinancialReport } from './model'

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const compactName = (fileName: string) =>
  fileName
    .replace(/\.(xlsm|xlsx)$/i, '')
    .replace(/[^a-z0-9áéíóúñ_-]+/gi, '_')
    .slice(0, 54)

export const exportReportXlsx = (report: FinancialReport) => {
  const book = XLSX.utils.book_new()
  const parameters = [
    ['PARÁMETROS FINANCIEROS (AIU & DEDUCCIONES)', 'Valor'],
    ['Administración (A)', report.params.administration],
    ['Imprevistos (I)', report.params.contingencies],
    ['Utilidad (U)', report.params.utility],
    ['IVA sobre utilidad (19% s/ U)', report.params.ivaUtility],
    ['Amortización anticipo (s/ costo directo)', report.params.advanceAmortization],
    ['Retención de garantía (s/ facturado bruto)', report.params.warrantyRetention],
    [],
    ['INDICADORES CLAVE DE LA OBRA', 'Valor'],
    ['Título de la obra', report.title],
    ['Número de contrato', report.contract],
    ['Actas procesadas', report.acts.length],
    ['Costo directo contratado (COP)', report.directCostContracted],
    ['Presupuesto bruto con AIU (COP)', report.grossBudget],
    ['Facturado bruto acumulado (COP)', report.totalGrossBilled],
    ['% Facturado bruto vs Presupuesto', report.grossProgressPct],
    ['Saldo pendiente por facturar (COP)', Math.max(0, report.billedBalance)],
    ['% Pendiente por facturar', Math.max(0, 1 - report.grossProgressPct)],
    ['Factura neta acumulada pagada (COP)', report.totalNetInvoice],
    ['% Facturado neto vs Presupuesto', report.netProgressPct],
    ['Total anticipo amortizado (COP)', -report.totalAmortization],
    ['Total retención de garantía (COP)', -report.totalRetention],
    [],
    [
      'Acta',
      'Costo Directo',
      'Administración',
      'Imprevistos',
      'Utilidad',
      'IVA s/ Utilidad',
      'Facturado Bruto',
      '(-) Amortización',
      '(-) Retención Garantía',
      'Factura Neta',
      '% Avance Acum. Bruto',
      '% Avance Acum. Neto',
      'Neta Reportada',
      'Control / Auditoría',
    ],
    ...report.acts.map((act) => [
      act.number,
      act.directCost,
      act.administration,
      act.contingencies,
      act.utility,
      act.ivaUtility,
      act.grossBilled,
      act.amortization,
      act.retention,
      act.netInvoice,
      act.grossCumulativePct,
      act.netCumulativePct,
      act.reportedNet,
      act.control,
    ]),
  ]

  // Disciplines sheet
  const disc = report.disciplines
  const disciplinesData = [
    ['SEPARACIÓN DE ACTIVIDADES: ELÉCTRICO VS CIVIL VS ALUMBRADO PÚBLICO'],
    [`Proyecto: ${report.title} | Contrato: ${report.contract}`],
    [],
    [
      'Especialidad',
      'Ítems',
      'Presupuesto Contratado (COP)',
      '% del Total Contratado',
      'Ejecutado Acumulado (COP)',
      '% Avance de la Especialidad',
      '% Participación en Avance',
      'Saldo Pendiente (COP)',
      '% Pendiente',
      ...report.acts.map((a) => `Acta ${a.number} (COP)`),
    ],
    [
      'Actividades Eléctricas (Naranja)',
      disc.Electrico.itemCount,
      disc.Electrico.contractedTotal,
      disc.Electrico.contractedPct,
      disc.Electrico.accumulatedValue,
      disc.Electrico.accumulatedPct,
      disc.Electrico.shareOfTotalExecuted,
      disc.Electrico.balanceValue,
      disc.Electrico.balancePct,
      ...report.acts.map((a) => disc.Electrico.acts.find((act) => act.actNumber === a.number)?.value ?? 0),
    ],
    [
      'Obras Civiles (Sin color)',
      disc.Civil.itemCount,
      disc.Civil.contractedTotal,
      disc.Civil.contractedPct,
      disc.Civil.accumulatedValue,
      disc.Civil.accumulatedPct,
      disc.Civil.shareOfTotalExecuted,
      disc.Civil.balanceValue,
      disc.Civil.balancePct,
      ...report.acts.map((a) => disc.Civil.acts.find((act) => act.actNumber === a.number)?.value ?? 0),
    ],
    [
      'Alumbrado Público (Verde)',
      disc.Alumbrado.itemCount,
      disc.Alumbrado.contractedTotal,
      disc.Alumbrado.contractedPct,
      disc.Alumbrado.accumulatedValue,
      disc.Alumbrado.accumulatedPct,
      disc.Alumbrado.shareOfTotalExecuted,
      disc.Alumbrado.balanceValue,
      disc.Alumbrado.balancePct,
      ...report.acts.map((a) => disc.Alumbrado.acts.find((act) => act.actNumber === a.number)?.value ?? 0),
    ],
    [],
    ['DESGLOSE DETALLADO ÍTEM POR ÍTEM'],
    ['Ítem', 'Descripción', 'Especialidad', 'UND', 'Cant. Contratada', 'V/Unitario (COP)', 'Valor Total (COP)', 'Ejecutado Acumulado (COP)', '% Avance', 'Saldo (COP)'],
    ...report.items.map((it) => [
      it.code,
      it.description,
      it.discipline,
      it.unit,
      it.contractedQty,
      it.unitPrice,
      it.contractedTotal,
      it.accumulatedValue,
      it.contractedTotal ? it.accumulatedValue / it.contractedTotal : 0,
      it.balanceValue,
    ]),
  ]

  const chapters = [
    ['AVANCE POR CAPÍTULO DE OBRA (COSTO DIRECTO, VALORES EN COP)'],
    [`Proyecto: ${report.title} | Contrato: ${report.contract}`],
    [],
    [
      'Capítulo',
      'Presupuesto Contratado',
      'Ejecutado Acumulado',
      '% Avance Físico',
      'Saldo por Ejecutar',
      'Participación en Contrato',
      'Ejecutado Última Acta',
      'Acumulado Acta Anterior',
    ],
    ...report.chapters.map((chapter) => [
      chapter.name,
      chapter.contracted,
      chapter.executedAccumulated,
      chapter.progressPct,
      chapter.balance,
      chapter.sharePct,
      chapter.lastAct,
      chapter.previousAccumulated,
    ]),
  ]

  const data = [
    ['DATOS FUENTE Y MATRIZ POR ACTA (GENERADO POR ACTAFIN)'],
    [`Archivo: ${report.fileName} | Total Actas: ${report.acts.length}`],
    [],
    ['Concepto', 'Contrato Base', ...report.acts.map((act) => `Acta ${act.number}`)],
    ...report.chapters.map((chapter) => [chapter.name, chapter.contracted, ...chapter.acts]),
    [
      'Suma Capítulos',
      report.chapters.reduce((sum, c) => sum + c.contracted, 0),
      ...report.acts.map((_, index) => report.chapters.reduce((sum, c) => sum + (c.acts[index] ?? 0), 0)),
    ],
    ['Costo Directo Ejecutado', report.directCostContracted, ...report.acts.map((act) => act.directCost)],
    [
      'Administración',
      report.directCostContracted * report.params.administration,
      ...report.acts.map((act) => act.administration),
    ],
    [
      'Imprevistos',
      report.directCostContracted * report.params.contingencies,
      ...report.acts.map((act) => act.contingencies),
    ],
    [
      'Utilidad',
      report.directCostContracted * report.params.utility,
      ...report.acts.map((act) => act.utility),
    ],
    [
      'IVA sobre Utilidad',
      report.directCostContracted * report.params.utility * report.params.ivaUtility,
      ...report.acts.map((act) => act.ivaUtility),
    ],
    [
      'Amortización Anticipo',
      -report.directCostContracted * report.params.advanceAmortization,
      ...report.acts.map((act) => act.amortization),
    ],
    [
      'Retención Garantía',
      -report.grossBudget * report.params.warrantyRetention,
      ...report.acts.map((act) => act.retention),
    ],
    [
      'Factura Neta Girada',
      report.grossBudget -
        report.directCostContracted * report.params.advanceAmortization -
        report.grossBudget * report.params.warrantyRetention,
      ...report.acts.map((act) => act.netInvoice),
    ],
  ]

  const appendSheet = (rows: unknown[][], name: string, widths: number[]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }

  appendSheet(disciplinesData, 'Especialidades', [34, 12, 24, 18, 24, 18, 20, 22, 16, 18, 18, 18, 18])
  appendSheet(parameters, 'Resumen Financiero', [38, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20])
  appendSheet(chapters, 'Capítulos y Avance', [38, 22, 22, 16, 22, 18, 24, 24])
  appendSheet(data, 'Matriz Detallada', [42, 22, ...report.acts.map(() => 20)])
  XLSX.writeFile(book, `Informe_Financiero_Obra_${compactName(report.fileName)}.xlsx`)
}

export const exportReportCsv = (report: FinancialReport) => {
  const rows = [
    [
      'Acta',
      'Costo Directo',
      'Facturado Bruto',
      'Amortizacion Anticipo',
      'Retencion Garantia',
      'Factura Neta',
      'Porcentaje Acumulado Bruto',
      'Porcentaje Acumulado Neto',
      'Neta Reportada',
      'Control Auditoria',
    ],
    ...report.acts.map((act) => [
      act.number,
      act.directCost,
      act.grossBilled,
      act.amortization,
      act.retention,
      act.netInvoice,
      (act.grossCumulativePct * 100).toFixed(2) + '%',
      (act.netCumulativePct * 100).toFixed(2) + '%',
      act.reportedNet ?? '',
      act.control ?? '',
    ]),
  ]
  const csv = rows.map((row) => row.map((v) => JSON.stringify(v)).join(';')).join('\n')
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `ActaFin_${compactName(report.fileName)}.csv`)
}

export const exportReportJson = (report: FinancialReport) => {
  downloadBlob(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }),
    `ActaFin_${compactName(report.fileName)}.json`
  )
}
