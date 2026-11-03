import type { FinancialReport } from './model'
import { formatCurrency, formatPercent } from './formatters'

export function buildChatReportContext(report: FinancialReport) {
  return {
    proyecto: {
      titulo: report.title,
      contrato: report.contract,
      contratista: report.contractor || 'INELCO S.A.S.',
      cliente: report.client || 'CONEXO / LA NUBIA',
      archivoOrigen: report.fileName,
      totalCortes: report.acts.length,
      fechaAnalisis: report.parsedAt,
    },
    totalesFinancieros: {
      presupuestoTotalConAIU: formatCurrency(report.grossBudget),
      costoDirectoContratado: formatCurrency(report.directCostContracted),
      facturadoBrutoAcumulado: formatCurrency(report.totalGrossBilled),
      saldoPorFacturar: formatCurrency(report.billedBalance),
      avanceFinancieroBrutoPct: formatPercent(report.grossProgressPct),
      facturacionNetaAcumulada: formatCurrency(report.totalNetInvoice),
      totalAmortizacionAnticipo: formatCurrency(report.totalAmortization),
      totalRetencionGarantia: formatCurrency(report.totalRetention),
    },
    parametrosContractuales: {
      administracionPct: formatPercent(report.params.administration),
      imprevistosPct: formatPercent(report.params.contingencies),
      utilidadPct: formatPercent(report.params.utility),
      ivaUtilidadPct: formatPercent(report.params.ivaUtility),
      amortizacionAnticipoPct: formatPercent(report.params.advanceAmortization),
      retencionGarantiaPct: formatPercent(report.params.warrantyRetention),
    },
    disciplinas: {
      electrico: {
        nombre: 'Eléctrico (Cables, Tableros, Transformador, Malla, etc.)',
        itemsClasificados: report.disciplines.Electrico.itemCount,
        contratadoTotal: formatCurrency(report.disciplines.Electrico.contractedTotal),
        participacionContratadaPct: formatPercent(report.disciplines.Electrico.contractedPct),
        ejecutadoAcumulado: formatCurrency(report.disciplines.Electrico.accumulatedValue),
        avancePct: formatPercent(report.disciplines.Electrico.accumulatedPct),
        saldoPorFacturar: formatCurrency(report.disciplines.Electrico.balanceValue),
      },
      civil: {
        nombre: 'Civil (Cajas, Cámaras, Tuberías, Ductería, Concretos)',
        itemsClasificados: report.disciplines.Civil.itemCount,
        contratadoTotal: formatCurrency(report.disciplines.Civil.contractedTotal),
        participacionContratadaPct: formatPercent(report.disciplines.Civil.contractedPct),
        ejecutadoAcumulado: formatCurrency(report.disciplines.Civil.accumulatedValue),
        avancePct: formatPercent(report.disciplines.Civil.accumulatedPct),
        saldoPorFacturar: formatCurrency(report.disciplines.Civil.balanceValue),
      },
      alumbradoPublico: {
        nombre: 'Alumbrado Público (Luminarias LED, Postes)',
        itemsClasificados: report.disciplines.Alumbrado.itemCount,
        contratadoTotal: formatCurrency(report.disciplines.Alumbrado.contractedTotal),
        participacionContratadaPct: formatPercent(report.disciplines.Alumbrado.contractedPct),
        ejecutadoAcumulado: formatCurrency(report.disciplines.Alumbrado.accumulatedValue),
        avancePct: formatPercent(report.disciplines.Alumbrado.accumulatedPct),
        saldoPorFacturar: formatCurrency(report.disciplines.Alumbrado.balanceValue),
      },
    },
    historicoActas: report.acts.map((act) => ({
      actaNumero: act.number,
      costoDirecto: formatCurrency(act.directCost),
      facturadoBrutoCorte: formatCurrency(act.grossBilled),
      amortizacionAnticipo: formatCurrency(act.amortization),
      retencionGarantia: formatCurrency(act.retention),
      netoAPagar: formatCurrency(act.netInvoice),
      avanceAcumuladoCortePct: formatPercent(act.grossCumulativePct),
    })),
    capitulos: report.chapters.map((ch) => ({
      capitulo: ch.name,
      presupuestoContratado: formatCurrency(ch.contracted),
      ejecutadoAcumulado: formatCurrency(ch.executedAccumulated),
      avancePct: formatPercent(ch.progressPct),
      saldoPorFacturar: formatCurrency(ch.balance),
    })),
    partidasCriticasConMayorSaldo: report.items
      .filter((it) => it.balanceValue > 0)
      .sort((a, b) => b.balanceValue - a.balanceValue)
      .slice(0, 10)
      .map((it) => ({
        codigo: it.code,
        descripcion: it.description,
        disciplina: it.discipline,
        unidad: it.unit,
        contratadoTotal: formatCurrency(it.contractedTotal),
        facturadoAcumulado: formatCurrency(it.accumulatedValue),
        saldoPendiente: formatCurrency(it.balanceValue),
      })),
    observacionesAuditoria: report.validation.map((v) => `[${v.level.toUpperCase()}] ${v.message}`),
  }
}
