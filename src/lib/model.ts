export type ParamKey =
  | 'administration'
  | 'contingencies'
  | 'utility'
  | 'ivaUtility'
  | 'advanceAmortization'
  | 'warrantyRetention'

export type FinancialParams = Record<ParamKey, number>

export type DisciplineType = 'Electrico' | 'Civil' | 'Alumbrado'

export type LineItem = {
  row: number
  code: string
  description: string
  unit: string
  unitPrice: number
  contractedQty: number
  contractedTotal: number
  acts: Array<{
    actNumber: number
    qty: number
    value: number
  }>
  accumulatedQty: number
  accumulatedValue: number
  balanceQty: number
  balanceValue: number
  discipline: DisciplineType
  detectedBy: 'color' | 'keyword' | 'manual'
  colorHex?: string
}

export type DisciplineSummary = {
  discipline: DisciplineType
  label: string
  itemCount: number
  contractedTotal: number
  contractedPct: number
  acts: Array<{
    actNumber: number
    value: number
    pctOfAct: number
  }>
  accumulatedValue: number
  accumulatedPct: number
  shareOfTotalExecuted: number
  balanceValue: number
  balancePct: number
}

export type ActResult = {
  number: number
  directCost: number
  administration: number
  contingencies: number
  utility: number
  ivaUtility: number
  grossBilled: number
  amortization: number
  retention: number
  netInvoice: number
  reportedNet: number | null
  control: number | null
  grossPct: number
  grossCumulativePct: number
  netPct: number
  netCumulativePct: number
}

export type ChapterResult = {
  name: string
  contracted: number
  acts: number[]
  executedAccumulated: number
  progressPct: number
  balance: number
  sharePct: number
  lastAct: number
  previousAccumulated: number
}

export type ValidationMessage = {
  level: 'error' | 'warning' | 'info'
  message: string
}

export type FinancialReport = {
  fileName: string
  title: string
  contract: string
  contractor?: string
  client?: string
  sourceSheet: string
  originalParams: FinancialParams
  params: FinancialParams
  acts: ActResult[]
  chapters: ChapterResult[]
  items: LineItem[]
  disciplines: Record<DisciplineType, DisciplineSummary>
  directCostContracted: number
  grossBudget: number
  totalGrossBilled: number
  totalNetInvoice: number
  totalAmortization: number
  totalRetention: number
  grossProgressPct: number
  netProgressPct: number
  billedBalance: number
  validation: ValidationMessage[]
  parsedAt: string
  isSimulation?: boolean
}
