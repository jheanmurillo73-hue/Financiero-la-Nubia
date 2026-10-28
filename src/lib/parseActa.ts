import * as XLSX from 'xlsx'
import type {
  ActResult,
  ChapterResult,
  DisciplineSummary,
  DisciplineType,
  FinancialParams,
  FinancialReport,
  LineItem,
  ParamKey,
  ValidationMessage,
} from './model'

export const DEFAULT_PARAMS: FinancialParams = {
  administration: 0.09,
  contingencies: 0.01,
  utility: 0.06,
  ivaUtility: 0.19,
  advanceAmortization: 0.4,
  warrantyRetention: 0.05,
}

export const PARAM_LABELS: Record<ParamKey, { label: string; desc: string }> = {
  administration: { label: 'Administración (A)', desc: 'Gastos generales, equipo y personal técnico' },
  contingencies: { label: 'Imprevistos (I)', desc: 'Fondo para contingencias contractuales' },
  utility: { label: 'Utilidad (U)', desc: 'Margen de ganancia pactado' },
  ivaUtility: { label: 'IVA s/ Utilidad', desc: 'Impuesto al valor agregado aplicado sobre la utilidad' },
  advanceAmortization: { label: 'Amortización Anticipo', desc: 'Deducción sobre costo directo ejecutado' },
  warrantyRetention: { label: 'Retención de Garantía', desc: 'Deducción sobre el valor bruto facturado' },
}

export const DISCIPLINE_CONFIG: Record<
  DisciplineType,
  { label: string; shortLabel: string; color: string; badgeBg: string; badgeBorder: string; badgeText: string; desc: string }
> = {
  Electrico: {
    label: 'Actividades Eléctricas',
    shortLabel: 'Eléctrico',
    color: '#e5a83b', // Orange (FFFFC000 in Excel)
    badgeBg: '#fff4db',
    badgeBorder: '#f8d58a',
    badgeText: '#a06800',
    desc: 'Cables, transformadores, tableros de BT/MT, medidores, reconectador, planta eléctrica, malla a tierra e insumos eléctricos.',
  },
  Civil: {
    label: 'Obras Civiles',
    shortLabel: 'Civil',
    color: '#4673a7', // Neutral / Blue (sin color en Excel)
    badgeBg: '#e8eff8',
    badgeBorder: '#c3d5ee',
    badgeText: '#235189',
    desc: 'Cajas y cámaras subterráneas, canalizaciones, tuberías PVC/IMC, excavaciones, rellenos y campamento de obra.',
  },
  Alumbrado: {
    label: 'Alumbrado Público',
    shortLabel: 'Alumbrado',
    color: '#3b8f71', // Green (FF92D050 in Excel)
    badgeBg: '#e5f3ee',
    badgeBorder: '#b9ded1',
    badgeText: '#1f674e',
    desc: 'Luminarias LED (Nano ST, Hiplane), postes de concreto de 12m, circuitos dedicados y accesorios de alumbrado.',
  },
}

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return null
  if (value === null || value === undefined || value === '') return null
  const raw = String(value).trim().replace(/\s/g, '').replace(/[$]/g, '')
  if (!raw) return null
  const colombian = /^-?[\d.]+,\d+$/.test(raw)
  const normalized = colombian
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '')
  const result = Number(normalized)
  return Number.isFinite(result) ? result : null
}

const cell = (rows: unknown[][], row: number, col: number) => rows[row]?.[col] ?? null
const textAt = (rows: unknown[][], row: number, col: number) => String(cell(rows, row, col) ?? '').trim()
const amountAt = (rows: unknown[][], row: number, col: number) => asNumber(cell(rows, row, col)) ?? 0

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
    .replace(/\bIva\b/g, 'IVA')
    .replace(/\bRetie\b/g, 'RETIE')
    .replace(/\bAiu\b/g, 'AIU')
    .replace(/\bPvc\b/g, 'PVC')
    .replace(/\bAwg\b/g, 'AWG')
    .replace(/\bThhn\b/g, 'THHN')
    .replace(/\bXlpe\b/g, 'XLPE')

const findRows = (rows: unknown[][], matcher: (label: string) => boolean) => {
  const matches: number[] = []
  rows.forEach((row, index) => {
    const label = normalize(`${row?.[0] ?? ''} ${row?.[1] ?? ''}`)
    if (matcher(label)) matches.push(index)
  })
  return matches
}

const findFirstRow = (rows: unknown[][], matcher: (label: string) => boolean) => findRows(rows, matcher)[0] ?? -1

const readParams = (rows: unknown[][], messages: ValidationMessage[]): FinancialParams => {
  const params: FinancialParams = { ...DEFAULT_PARAMS }
  const matches: Array<[ParamKey, RegExp, string]> = [
    ['administration', /\bADMINISTRACION\b/, 'Administración'],
    ['contingencies', /\bIMPREVISTOS\b/, 'Imprevistos'],
    ['utility', /\bUTILIDAD\b/, 'Utilidad'],
    ['ivaUtility', /\bIVA SOBRE UTILIDAD\b/, 'IVA sobre utilidad'],
    ['advanceAmortization', /\bAMORTIZACION\b/, 'Amortización de anticipo'],
    ['warrantyRetention', /\bRETENCION DE GARANTIA\b/, 'Retención de garantía'],
  ]
  matches.forEach(([key, pattern, label]) => {
    const rowIndex = findFirstRow(rows, (row) => pattern.test(row) && !row.includes('TOTAL'))
    const found = rowIndex >= 0 ? asNumber(cell(rows, rowIndex, 4)) : null
    if (found !== null) {
      params[key] = found
    } else {
      messages.push({
        level: 'warning',
        message: `No se detectó el parámetro ${label}; se usó ${(DEFAULT_PARAMS[key] * 100).toFixed(0)}% por defecto.`,
      })
    }
  })
  return params
}

const readActHeaders = (rows: unknown[][], messages: ValidationMessage[]) => {
  const found: Array<{ number: number; headerCol: number }> = []
  for (let row = 0; row < Math.min(rows.length, 10); row += 1) {
    for (let col = 0; col < (rows[row]?.length ?? 0); col += 1) {
      const match = normalize(cell(rows, row, col)).match(/\bACTA\s+NO?\.?\s*(\d+)\b/)
      if (match) found.push({ number: Number(match[1]), headerCol: col })
    }
    if (found.length) break
  }
  const unique = [...new Map(found.map((item) => [item.number, item])).values()].sort((a, b) => a.number - b.number)
  if (!unique.length) {
    messages.push({
      level: 'error',
      message: 'No se encontraron encabezados del tipo “ACTA No 1”, “ACTA No 2”… en la hoja Acta.',
    })
    return []
  }
  const expected = Array.from({ length: unique.length }, (_, index) => index + 1)
  const actual = unique.map((item) => item.number)
  if (actual.some((number, index) => number !== expected[index])) {
    messages.push({
      level: 'warning',
      message: `Las actas detectadas no son continuas o correlativas: ${actual.join(', ')}.`,
    })
  }
  return unique
}

export const classifyDiscipline = (
  desc: string,
  code: string,
  cellStyle?: any
): { discipline: DisciplineType; detectedBy: 'color' | 'keyword'; colorHex?: string } => {
  // 1. Direct cell color check from Excel styles (if available)
  const rgb = cellStyle?.fgColor?.rgb || ''
  if (rgb.includes('FFC000')) {
    return { discipline: 'Electrico', detectedBy: 'color', colorHex: '#FFFFC000' }
  }
  if (rgb.includes('92D050')) {
    return { discipline: 'Alumbrado', detectedBy: 'color', colorHex: '#FF92D050' }
  }

  // 2. Keyword-based classification adhering exactly to the user specification
  const d = (desc + ' ' + (code || '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const c = String(code || '').toLowerCase()

  // Alumbrado Público: en verde en Excel (luminarias, postes, circuitos de alumbrado)
  if (
    c.startsWith('3.68') || c.startsWith('3,68') ||
    c.startsWith('3.69') || c.startsWith('3,69') ||
    c.startsWith('3.70') || c.startsWith('3,70') ||
    c.startsWith('3.71') || c.startsWith('3,71') ||
    c.startsWith('3.72') || c.startsWith('3,72') ||
    c.startsWith('3.73') || c.startsWith('3,73') ||
    c.startsWith('3.74') || c.startsWith('3,74') ||
    d.includes('luminaria') ||
    d.includes('poste de concreto') ||
    d.includes('poste concreto') ||
    d.includes('alumbrado publico') ||
    d.includes('fotocelda') ||
    d.includes('hiplane') ||
    d.includes('nano st') ||
    d.includes('carro canasta')
  ) {
    return { discipline: 'Alumbrado', detectedBy: 'keyword' }
  }

  // Obras Civiles: cajas y cámaras, tuberías, excavaciones, rellenos, campamento, sanitaria, etc.
  if (
    d.includes('caja con marco') ||
    d.includes('caja subterranea') ||
    d.includes('construccion de caja') ||
    d.includes('caja de paso') ||
    d.includes('caja de inspeccion') ||
    d.includes('camara') ||
    d.includes('tuberia pvc') ||
    d.includes('curva pvc') ||
    d.includes('campana pvc') ||
    d.includes('excavacion') ||
    d.includes('relleno') ||
    d.includes('campamento de obra') ||
    d.includes('unidad sanitaria') ||
    d.includes('seguridad industrial') ||
    d.includes('pmt') ||
    d.includes('canalizacion') ||
    d.includes('obra civil')
  ) {
    return { discipline: 'Civil', detectedBy: 'keyword' }
  }

  // Eléctrico: cable, acometidas, tableros de baja y media tensión, medidores, transformadores,
  // planta de emergencia, reconectador, malla a tierra, bornas, codos, terminales, etc.
  return { discipline: 'Electrico', detectedBy: 'keyword' }
}

export const readLineItems = (
  sheet: XLSX.WorkSheet,
  rows: unknown[][],
  actHeaders: Array<{ number: number; headerCol: number }>,
  directRowIdx: number
): LineItem[] => {
  const items: LineItem[] = []
  const maxRow = directRowIdx >= 0 ? directRowIdx : rows.length

  for (let r = 5; r < maxRow; r++) {
    const row = rows[r]
    if (!row) continue

    const code = row[0] ? String(row[0]).trim() : ''
    const desc = row[1] ? String(row[1]).trim() : ''
    const unit = row[2] ? String(row[2]).trim() : ''
    const contractedTotal = asNumber(row[5])

    // Valid item line must have a description, unit, and positive/defined contracted value
    if (!desc || !unit || contractedTotal === null || desc.startsWith('SUBTOTAL ') || desc.includes('COSTO DIRECTO')) {
      continue
    }

    const unitPrice = asNumber(row[4]) ?? (contractedTotal / (asNumber(row[3]) || 1))
    const contractedQty = asNumber(row[3]) ?? 1

    // Read values per act
    const actValues = actHeaders.map(({ number, headerCol }) => {
      // Typically col headerCol is Cant, headerCol + 1 is Valor
      const val = amountAt([row], 0, headerCol + 1)
      const qty = amountAt([row], 0, headerCol)
      return {
        actNumber: number,
        qty,
        value: val,
      }
    })

    // Col 16 is typically accumulated qty, 17 is accumulated valor in this layout, or sum acts
    const rawAccumVal = asNumber(row[17]) ?? actValues.reduce((s, a) => s + a.value, 0)
    const rawAccumQty = asNumber(row[16]) ?? actValues.reduce((s, a) => s + a.qty, 0)
    const rawBalVal = asNumber(row[19]) ?? Math.max(0, contractedTotal - rawAccumVal)
    const rawBalQty = asNumber(row[18]) ?? Math.max(0, contractedQty - rawAccumQty)

    // Cell style in B column for color detection
    const cellRef = 'B' + (r + 1)
    const cellStyle = sheet[cellRef]?.s

    const { discipline, detectedBy, colorHex } = classifyDiscipline(desc, code, cellStyle)

    items.push({
      row: r + 1,
      code,
      description: humanize(desc),
      unit: unit.toUpperCase(),
      unitPrice,
      contractedQty,
      contractedTotal,
      acts: actValues,
      accumulatedQty: rawAccumQty,
      accumulatedValue: rawAccumVal,
      balanceQty: rawBalQty,
      balanceValue: rawBalVal,
      discipline,
      detectedBy,
      colorHex,
    })
  }

  return items
}

export const computeDisciplineSummaries = (
  items: LineItem[],
  actNumbers: number[]
): Record<DisciplineType, DisciplineSummary> => {
  const types: DisciplineType[] = ['Electrico', 'Civil', 'Alumbrado']
  const totalContractedAll = items.reduce((sum, item) => sum + item.contractedTotal, 0) || 1
  const totalAccumAll = items.reduce((sum, item) => sum + item.accumulatedValue, 0) || 1

  const summaryMap: Partial<Record<DisciplineType, DisciplineSummary>> = {}

  types.forEach((type) => {
    const matching = items.filter((item) => item.discipline === type)
    const contractedTotal = matching.reduce((sum, it) => sum + it.contractedTotal, 0)
    const accumulatedValue = matching.reduce((sum, it) => sum + it.accumulatedValue, 0)
    const balanceValue = matching.reduce((sum, it) => sum + it.balanceValue, 0)

    const acts = actNumbers.map((num) => {
      const val = matching.reduce((sum, it) => {
        const found = it.acts.find((a) => a.actNumber === num)
        return sum + (found ? found.value : 0)
      }, 0)
      const totalInAct = items.reduce((sum, it) => {
        const found = it.acts.find((a) => a.actNumber === num)
        return sum + (found ? found.value : 0)
      }, 0) || 1

      return {
        actNumber: num,
        value: val,
        pctOfAct: val / totalInAct,
      }
    })

    summaryMap[type] = {
      discipline: type,
      label: DISCIPLINE_CONFIG[type].label,
      itemCount: matching.length,
      contractedTotal,
      contractedPct: contractedTotal / totalContractedAll,
      acts,
      accumulatedValue,
      accumulatedPct: contractedTotal ? accumulatedValue / contractedTotal : 0,
      shareOfTotalExecuted: accumulatedValue / totalAccumAll,
      balanceValue,
      balancePct: contractedTotal ? balanceValue / contractedTotal : 0,
    }
  })

  return summaryMap as Record<DisciplineType, DisciplineSummary>
}

const readChapters = (rows: unknown[][], actHeaders: Array<{ number: number; headerCol: number }>) => {
  const chapters: Array<{ name: string; contracted: number; acts: number[] }> = []
  const directRow = findFirstRow(rows, (label) => /\bCOSTO DIRECTO\b/.test(label))
  const sectionHeaders: Array<{ row: number; name: string }> = []
  for (let rowIndex = 4; rowIndex < (directRow >= 0 ? directRow : rows.length); rowIndex += 1) {
    const label = normalize(cell(rows, rowIndex, 1))
    const hasItemFields = [2, 3, 4].some(
      (column) => cell(rows, rowIndex, column) !== null && cell(rows, rowIndex, column) !== ''
    )
    if (
      label &&
      !label.startsWith('SUBTOTAL ') &&
      !hasItemFields &&
      !/^(ACTA|CONDICIONES|CONTRATANTE|COSTO|ADMINISTRACION|IMPREVISTOS|UTILIDAD|IVA|AMORTIZACION|RETENCION|VALOR|SALDO|PARA CONSTANCIA)/.test(
        label
      )
    ) {
      sectionHeaders.push({ row: rowIndex, name: label })
    }
  }
  sectionHeaders.forEach(({ row: startRow, name }) => {
    const endRow = rows.findIndex((candidate, index) => index > startRow && normalize(candidate?.[1]).startsWith('SUBTOTAL '))
    const stopRow = endRow > startRow ? endRow : rows.length
    const itemRows = rows.slice(startRow + 1, stopRow).filter((candidate) => asNumber(candidate?.[5]) !== null)
    const contracted = itemRows.reduce((sum, candidate) => sum + (asNumber(candidate?.[5]) ?? 0), 0)
    if (contracted <= 0) return
    chapters.push({
      name: humanize(name),
      contracted,
      acts: actHeaders.map(({ headerCol }) =>
        itemRows.reduce((sum, candidate) => sum + amountAt([candidate], 0, headerCol + 1), 0)
      ),
    })
  })
  const lastSubtotal = rows.reduce(
    (last, row, index) => (normalize(row?.[1]).startsWith('SUBTOTAL ') ? index : last),
    -1
  )
  const looseItems = rows
    .slice(lastSubtotal + 1, directRow >= 0 ? directRow : rows.length)
    .filter((row) => Number.isInteger(asNumber(row?.[0])) && asNumber(row?.[5]) !== null && row?.[2])
  looseItems.forEach((row) => {
    chapters.push({
      name: humanize(String(row?.[1] ?? 'Partida sin capítulo')),
      contracted: asNumber(row?.[5]) ?? 0,
      acts: actHeaders.map(({ headerCol }) => amountAt([row], 0, headerCol + 1)),
    })
  })
  return chapters
}

const sourceAmounts = (
  rows: unknown[][],
  rowIndex: number,
  actHeaders: Array<{ number: number; headerCol: number }>
) => (rowIndex >= 0 ? actHeaders.map(({ headerCol }) => amountAt(rows, rowIndex, headerCol + 1)) : [])

export const computeReportMetrics = ({
  fileName,
  title,
  contract,
  contractor,
  client,
  sourceSheet,
  originalParams,
  params,
  actHeaders,
  directCostContracted,
  directCostActs,
  reportedNet,
  chaptersRaw,
  items = [],
  validation,
  isSimulation = false,
}: {
  fileName: string
  title: string
  contract: string
  contractor?: string
  client?: string
  sourceSheet: string
  originalParams: FinancialParams
  params: FinancialParams
  actHeaders: Array<{ number: number }>
  directCostContracted: number
  directCostActs: number[]
  reportedNet: Array<number | null>
  chaptersRaw: Array<{ name: string; contracted: number; acts: number[] }>
  items?: LineItem[]
  validation: ValidationMessage[]
  isSimulation?: boolean
}): FinancialReport => {
  const aiuFactor = 1 + params.administration + params.contingencies + params.utility + params.utility * params.ivaUtility
  const grossBudget = directCostContracted * aiuFactor

  const acts: ActResult[] = []
  let grossAccumulated = 0
  let netAccumulated = 0

  actHeaders.forEach(({ number }, index) => {
    const directCost = directCostActs[index] ?? 0
    const administration = directCost * params.administration
    const contingencies = directCost * params.contingencies
    const utility = directCost * params.utility
    const ivaUtility = utility * params.ivaUtility
    const grossBilled = directCost + administration + contingencies + utility + ivaUtility
    const amortization = -directCost * params.advanceAmortization
    const retention = -grossBilled * params.warrantyRetention
    const netInvoice = grossBilled + amortization + retention
    grossAccumulated += grossBilled
    netAccumulated += netInvoice
    const reported = reportedNet[index] ?? null
    acts.push({
      number,
      directCost,
      administration,
      contingencies,
      utility,
      ivaUtility,
      grossBilled,
      amortization,
      retention,
      netInvoice,
      reportedNet: reported,
      control: reported === null ? null : netInvoice - reported,
      grossPct: grossBudget ? grossBilled / grossBudget : 0,
      grossCumulativePct: grossBudget ? grossAccumulated / grossBudget : 0,
      netPct: grossBudget ? netInvoice / grossBudget : 0,
      netCumulativePct: grossBudget ? netAccumulated / grossBudget : 0,
    })
  })

  const chapters: ChapterResult[] = chaptersRaw.map((chapter) => {
    const executedAccumulated = chapter.acts.reduce((sum, value) => sum + value, 0)
    const lastAct = chapter.acts.at(-1) ?? 0
    return {
      ...chapter,
      executedAccumulated,
      progressPct: chapter.contracted ? executedAccumulated / chapter.contracted : 0,
      balance: chapter.contracted - executedAccumulated,
      sharePct: directCostContracted ? chapter.contracted / directCostContracted : 0,
      lastAct,
      previousAccumulated: executedAccumulated - lastAct,
    }
  })

  const totalGrossBilled = acts.reduce((sum, act) => sum + act.grossBilled, 0)
  const totalNetInvoice = acts.reduce((sum, act) => sum + act.netInvoice, 0)
  const totalAmortization = acts.reduce((sum, act) => sum + act.amortization, 0)
  const totalRetention = acts.reduce((sum, act) => sum + act.retention, 0)

  // Compute disciplines summary
  const actNums = actHeaders.map((a) => a.number)
  const disciplines = computeDisciplineSummaries(items, actNums)

  return {
    fileName,
    title,
    contract,
    contractor,
    client,
    sourceSheet,
    originalParams,
    params,
    acts,
    chapters,
    items,
    disciplines,
    directCostContracted,
    grossBudget,
    totalGrossBilled,
    totalNetInvoice,
    totalAmortization,
    totalRetention,
    grossProgressPct: grossBudget ? totalGrossBilled / grossBudget : 0,
    netProgressPct: grossBudget ? totalNetInvoice / grossBudget : 0,
    billedBalance: grossBudget - totalGrossBilled,
    validation,
    parsedAt: new Date().toISOString(),
    isSimulation,
  }
}

export const recalculateWithParams = (report: FinancialReport, newParams: FinancialParams): FinancialReport => {
  const actHeaders = report.acts.map((a) => ({ number: a.number }))
  const directCostActs = report.acts.map((a) => a.directCost)
  const reportedNet = report.acts.map((a) => a.reportedNet)
  const chaptersRaw = report.chapters.map((c) => ({
    name: c.name,
    contracted: c.contracted,
    acts: [...c.acts],
  }))

  const isSim = Object.keys(newParams).some(
    (k) => Math.abs((newParams as any)[k] - (report.originalParams as any)[k]) > 0.0001
  )

  return computeReportMetrics({
    fileName: report.fileName,
    title: report.title,
    contract: report.contract,
    contractor: report.contractor,
    client: report.client,
    sourceSheet: report.sourceSheet,
    originalParams: report.originalParams,
    params: { ...newParams },
    actHeaders,
    directCostContracted: report.directCostContracted,
    directCostActs,
    reportedNet,
    chaptersRaw,
    items: report.items,
    validation: report.validation,
    isSimulation: isSim,
  })
}

export const updateItemDiscipline = (
  report: FinancialReport,
  rowNumber: number,
  newDiscipline: DisciplineType
): FinancialReport => {
  const updatedItems = report.items.map((it) => {
    if (it.row === rowNumber) {
      return {
        ...it,
        discipline: newDiscipline,
        detectedBy: 'manual' as const,
      }
    }
    return it
  })

  const actHeaders = report.acts.map((a) => ({ number: a.number }))
  const directCostActs = report.acts.map((a) => a.directCost)
  const reportedNet = report.acts.map((a) => a.reportedNet)
  const chaptersRaw = report.chapters.map((c) => ({
    name: c.name,
    contracted: c.contracted,
    acts: [...c.acts],
  }))

  return computeReportMetrics({
    fileName: report.fileName,
    title: report.title,
    contract: report.contract,
    contractor: report.contractor,
    client: report.client,
    sourceSheet: report.sourceSheet,
    originalParams: report.originalParams,
    params: report.params,
    actHeaders,
    directCostContracted: report.directCostContracted,
    directCostActs,
    reportedNet,
    chaptersRaw,
    items: updatedItems,
    validation: report.validation,
    isSimulation: report.isSimulation,
  })
}

export const deriveReport = (
  sheet: XLSX.WorkSheet,
  rows: unknown[][],
  fileName: string,
  messages: ValidationMessage[]
): FinancialReport => {
  const actHeaders = readActHeaders(rows, messages)
  const params = readParams(rows, messages)
  const chaptersRaw = readChapters(rows, actHeaders)
  if (!chaptersRaw.length) {
    messages.push({
      level: 'error',
      message: 'No se encontraron filas SUBTOTAL con capítulos y valores contratados.',
    })
  }

  const directRow = findFirstRow(rows, (label) => /\bCOSTO DIRECTO\b/.test(label))
  const contingenciesRow = findFirstRow(rows, (label) => /^IMPREVISTOS$/.test(label))
  const reportedInvoiceRow = findFirstRow(rows, (label) => label.includes('VALOR FACTURA'))
  const directFromSheet = directRow >= 0 ? asNumber(cell(rows, directRow, 5)) : null
  const chapterContracted = chaptersRaw.reduce((sum, chapter) => sum + chapter.contracted, 0)
  const contingenciesFromSheet = contingenciesRow >= 0 ? amountAt(rows, contingenciesRow, 5) : 0
  const contingenciesContracted =
    contingenciesFromSheet || Math.max(0, (directFromSheet ?? chapterContracted) - chapterContracted)
  const directCostContracted = directFromSheet ?? chapterContracted + contingenciesContracted
  const chapterActs = actHeaders.map((_, actIndex) =>
    chaptersRaw.reduce((sum, chapter) => sum + (chapter.acts[actIndex] ?? 0), 0)
  )
  const contingenciesActs = sourceAmounts(rows, contingenciesRow, actHeaders)
  const directActsFromSheet = sourceAmounts(rows, directRow, actHeaders)
  const directCostActs = actHeaders.map(
    (_, index) => directActsFromSheet[index] || chapterActs[index] + (contingenciesActs[index] ?? 0)
  )
  const reportedNet = sourceAmounts(rows, reportedInvoiceRow, actHeaders)

  // Read granular line items and identify disciplines
  const items = readLineItems(sheet, rows, actHeaders, directRow)

  if (directRow < 0) {
    messages.push({
      level: 'warning',
      message: 'No se encontró la fila COSTO DIRECTO; se reconstruyó sumando capítulos e imprevistos.',
    })
  }
  if (actHeaders.length && directCostActs.every((value) => value === 0)) {
    messages.push({
      level: 'warning',
      message: 'Las actas fueron detectadas, pero sus valores de ejecución están vacíos o en cero.',
    })
  }

  const title = textAt(rows, 1, 3) || 'Informe financiero de actas parciales de obra'
  const contract = textAt(rows, 0, 5) || textAt(rows, 0, 3) || 'Contrato de Obra'
  const contractor = textAt(rows, 2, 3) || undefined
  const client = textAt(rows, 3, 3) || undefined

  return computeReportMetrics({
    fileName,
    title,
    contract,
    contractor,
    client,
    sourceSheet: 'Acta',
    originalParams: { ...params },
    params: { ...params },
    actHeaders,
    directCostContracted,
    directCostActs,
    reportedNet,
    chaptersRaw,
    items,
    validation: messages,
    isSimulation: false,
  })
}

export const parseActaWorkbook = (buffer: ArrayBuffer, fileName: string): FinancialReport => {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellStyles: true,
    cellDates: true,
    raw: true,
    cellFormula: false,
  })
  const messages: ValidationMessage[] = []
  if (!workbook.SheetNames.includes('Acta')) {
    const actNums = [1]
    const dummyItems: LineItem[] = []
    const dummyDisc = computeDisciplineSummaries(dummyItems, actNums)
    return {
      fileName,
      title: 'No fue posible generar el informe',
      contract: '—',
      sourceSheet: 'Acta',
      originalParams: { ...DEFAULT_PARAMS },
      params: { ...DEFAULT_PARAMS },
      acts: [],
      chapters: [],
      items: [],
      disciplines: dummyDisc,
      directCostContracted: 0,
      grossBudget: 0,
      totalGrossBilled: 0,
      totalNetInvoice: 0,
      totalAmortization: 0,
      totalRetention: 0,
      grossProgressPct: 0,
      netProgressPct: 0,
      billedBalance: 0,
      validation: [{ level: 'error', message: 'El archivo no contiene la hoja obligatoria “Acta”.' }],
      parsedAt: new Date().toISOString(),
    }
  }
  const sheet = workbook.Sheets.Acta
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null })
  return deriveReport(sheet, rows, fileName, messages)
}
