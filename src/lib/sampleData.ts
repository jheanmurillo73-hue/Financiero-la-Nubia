import type { FinancialReport, FinancialParams, LineItem } from './model'
import { computeReportMetrics, DEFAULT_PARAMS, classifyDiscipline } from './parseActa'

export const SAMPLE_PARAMS: FinancialParams = {
  administration: 0.10, // 10%
  contingencies: 0.02,  // 2%
  utility: 0.05,        // 5%
  ivaUtility: 0.19,     // 19% sobre utilidad
  advanceAmortization: 0.30, // 30% amortización anticipo
  warrantyRetention: 0.05,   // 5% retención garantía
}

export const SAMPLE_CHAPTERS = [
  {
    name: '1. Obras Preliminares y Demoliciones',
    contracted: 64500000,
    acts: [42000000, 22500000, 0, 0, 0],
  },
  {
    name: '2. Movimiento de Tierras y Cimentación',
    contracted: 185000000,
    acts: [65000000, 95000000, 25000000, 0, 0],
  },
  {
    name: '3. Obras Civiles, Cajas y Canalizaciones',
    contracted: 340000000,
    acts: [0, 80000000, 160000000, 75000000, 25000000],
  },
  {
    name: '4. Tuberías y Cámaras Subterráneas',
    contracted: 115000000,
    acts: [0, 18000000, 48000000, 36000000, 13000000],
  },
  {
    name: '5. Redes Eléctricas, Cables y Alimentadores',
    contracted: 230000000,
    acts: [0, 0, 65000000, 110000000, 45000000],
  },
  {
    name: '6. Tableros, Transformadores y Celdas MT/BT',
    contracted: 185000000,
    acts: [0, 0, 0, 60000000, 95000000],
  },
  {
    name: '7. Malla a Tierra y Equipopotencialización',
    contracted: 45000000,
    acts: [0, 0, 15000000, 20000000, 10000000],
  },
  {
    name: '8. Alumbrado Público y Luminarias LED',
    contracted: 85500000,
    acts: [0, 0, 0, 30000000, 25000000],
  },
]

export const getSampleReport = (): FinancialReport => {
  const directCostContracted = SAMPLE_CHAPTERS.reduce((sum, c) => sum + c.contracted, 0) // 1,250,000,000 COP
  const numActs = 5
  const actHeaders = Array.from({ length: numActs }, (_, i) => ({ number: i + 1 }))

  const directCostActs = actHeaders.map((_, actIndex) =>
    SAMPLE_CHAPTERS.reduce((sum, ch) => sum + ch.acts[actIndex], 0)
  )

  const reportedNet = actHeaders.map((_, i) => {
    const dc = directCostActs[i]
    const adm = dc * SAMPLE_PARAMS.administration
    const imp = dc * SAMPLE_PARAMS.contingencies
    const ut = dc * SAMPLE_PARAMS.utility
    const ivaUt = ut * SAMPLE_PARAMS.ivaUtility
    const gross = dc + adm + imp + ut + ivaUt
    const amort = -dc * SAMPLE_PARAMS.advanceAmortization
    const ret = -gross * SAMPLE_PARAMS.warrantyRetention
    return Math.round(gross + amort + ret)
  })

  // Synthetic line items with realistic separation of Civil, Electrico and Alumbrado
  const sampleItems: LineItem[] = [
    // Civil:
    {
      row: 7,
      code: '1.1',
      description: 'Campamento de obra y seguridad industrial PMT',
      unit: 'GLB',
      unitPrice: 64500000,
      contractedQty: 1,
      contractedTotal: 64500000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: i === 0 ? 0.65 : i === 1 ? 0.35 : 0, value: [42000000, 22500000, 0, 0, 0][i] })),
      accumulatedQty: 1,
      accumulatedValue: 64500000,
      balanceQty: 0,
      balanceValue: 0,
      discipline: 'Civil',
      detectedBy: 'keyword',
    },
    {
      row: 8,
      code: '2.1',
      description: 'Excavación y relleno con material de sitio para zanjas',
      unit: 'M3',
      unitPrice: 37000,
      contractedQty: 5000,
      contractedTotal: 185000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [1756, 2567, 677, 0, 0][i], value: [65000000, 95000000, 25000000, 0, 0][i] })),
      accumulatedQty: 5000,
      accumulatedValue: 185000000,
      balanceQty: 0,
      balanceValue: 0,
      discipline: 'Civil',
      detectedBy: 'keyword',
    },
    {
      row: 9,
      code: '3.1',
      description: 'Construcción de cajas y cámaras subterráneas de paso tipo Celsia',
      unit: 'UN',
      unitPrice: 5230000,
      contractedQty: 65,
      contractedTotal: 340000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 15.3, 30.6, 14.3, 4.8][i], value: [0, 80000000, 160000000, 75000000, 25000000][i] })),
      accumulatedQty: 65,
      accumulatedValue: 340000000,
      balanceQty: 0,
      balanceValue: 0,
      discipline: 'Civil',
      detectedBy: 'keyword',
    },
    {
      row: 10,
      code: '4.1',
      description: 'Tubería PVC 4" y 6" con curvas y campanas de empalme',
      unit: 'ML',
      unitPrice: 46000,
      contractedQty: 2500,
      contractedTotal: 115000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 391, 1043, 783, 283][i], value: [0, 18000000, 48000000, 36000000, 13000000][i] })),
      accumulatedQty: 2500,
      accumulatedValue: 115000000,
      balanceQty: 0,
      balanceValue: 0,
      discipline: 'Civil',
      detectedBy: 'keyword',
    },
    // Electrico:
    {
      row: 11,
      code: '5.1',
      description: 'SEI Cable monopolar de cobre THHN y aluminio XLPE en cinta',
      unit: 'ML',
      unitPrice: 115000,
      contractedQty: 2000,
      contractedTotal: 230000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 0, 565, 957, 391][i], value: [0, 0, 65000000, 110000000, 45000000][i] })),
      accumulatedQty: 1913,
      accumulatedValue: 220000000,
      balanceQty: 87,
      balanceValue: 10000000,
      discipline: 'Electrico',
      detectedBy: 'color',
      colorHex: '#FFFFC000',
    },
    {
      row: 12,
      code: '6.1',
      description: 'Suministro e instalación Transformadores Padmounted 300KVA y Tableros',
      unit: 'UN',
      unitPrice: 37000000,
      contractedQty: 5,
      contractedTotal: 185000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 0, 0, 1.62, 2.57][i], value: [0, 0, 0, 60000000, 95000000][i] })),
      accumulatedQty: 4.19,
      accumulatedValue: 155000000,
      balanceQty: 0.81,
      balanceValue: 30000000,
      discipline: 'Electrico',
      detectedBy: 'color',
      colorHex: '#FFFFC000',
    },
    {
      row: 13,
      code: '7.1',
      description: 'Malla a tierra de subestación con electrodos y cable desnudo #2/0',
      unit: 'UN',
      unitPrice: 15000000,
      contractedQty: 3,
      contractedTotal: 45000000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 0, 1, 1.33, 0.67][i], value: [0, 0, 15000000, 20000000, 10000000][i] })),
      accumulatedQty: 3,
      accumulatedValue: 45000000,
      balanceQty: 0,
      balanceValue: 0,
      discipline: 'Electrico',
      detectedBy: 'color',
      colorHex: '#FFFFC000',
    },
    // Alumbrado:
    {
      row: 14,
      code: '8.1',
      description: 'Suministro e instalación Luminarias LED 75W y Postes de Concreto 12m',
      unit: 'UN',
      unitPrice: 2850000,
      contractedQty: 30,
      contractedTotal: 85500000,
      acts: actHeaders.map((a, i) => ({ actNumber: a.number, qty: [0, 0, 0, 10.5, 8.8][i], value: [0, 0, 0, 30000000, 25000000][i] })),
      accumulatedQty: 19.3,
      accumulatedValue: 55000000,
      balanceQty: 10.7,
      balanceValue: 30500000,
      discipline: 'Alumbrado',
      detectedBy: 'color',
      colorHex: '#FF92D050',
    },
  ]

  return computeReportMetrics({
    fileName: 'CONSOLIDADO_ACTAS_OBRA_SEDE_HOSPITALARIA_2024.xlsm',
    title: 'Construcción y Dotación Centro de Salud & Urgencias La Floresta',
    contract: 'CONTRATO DE OBRA PÚBLICA No. OP-2024-088',
    contractor: 'Consorcio Hospitalario Andino',
    client: 'Secretaría de Infraestructura y Salud',
    sourceSheet: 'Acta',
    originalParams: { ...SAMPLE_PARAMS },
    params: { ...SAMPLE_PARAMS },
    actHeaders,
    directCostContracted,
    directCostActs,
    reportedNet,
    chaptersRaw: SAMPLE_CHAPTERS,
    items: sampleItems,
    validation: [
      {
        level: 'info',
        message: 'Libro validado exitosamente: 5 Actas consecutivas y 8 Capítulos contractuales sincronizados.',
      },
      {
        level: 'info',
        message: 'Separación por especialidades: Eléctrico (36.8%), Civil (56.4%) y Alumbrado Público (6.8%).',
      },
    ],
    isSimulation: false,
  })
}
