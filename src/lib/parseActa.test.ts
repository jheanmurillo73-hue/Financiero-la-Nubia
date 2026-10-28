import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  computeReportMetrics,
  recalculateWithParams,
  updateItemDiscipline,
  classifyDiscipline,
  parseActaWorkbook,
  DEFAULT_PARAMS,
} from './parseActa'
import { getSampleReport, SAMPLE_PARAMS } from './sampleData'

test('computeReportMetrics calculates AIU factor and gross budget accurately', () => {
  const directCostContracted = 1_000_000_000
  const params = {
    administration: 0.10, // 10%
    contingencies: 0.02,  // 2%
    utility: 0.05,        // 5%
    ivaUtility: 0.19,     // 19% of 5% = 0.95%
    advanceAmortization: 0.30, // 30%
    warrantyRetention: 0.05,   // 5%
  }

  // Expected AIU factor: 1 + 0.10 + 0.02 + 0.05 + (0.05 * 0.19) = 1.1795
  const expectedGrossBudget = 1_000_000_000 * 1.1795
  const actHeaders = [{ number: 1 }, { number: 2 }]
  const directCostActs = [200_000_000, 300_000_000]

  const report = computeReportMetrics({
    fileName: 'test.xlsm',
    title: 'Test Project',
    contract: 'CT-01',
    sourceSheet: 'Acta',
    originalParams: params,
    params,
    actHeaders,
    directCostContracted,
    directCostActs,
    reportedNet: [null, null],
    chaptersRaw: [
      { name: 'Capítulo 1', contracted: 500_000_000, acts: [100_000_000, 150_000_000] },
      { name: 'Capítulo 2', contracted: 500_000_000, acts: [100_000_000, 150_000_000] },
    ],
    items: [],
    validation: [],
  })

  assert.equal(Math.round(report.grossBudget), Math.round(expectedGrossBudget))
  assert.equal(report.acts.length, 2)

  const act1 = report.acts[0]
  assert.equal(Math.round(act1.grossBilled), 235_900_000)
  assert.equal(Math.round(act1.amortization), -60_000_000)
  assert.equal(Math.round(act1.retention), -11_795_000)
  assert.equal(Math.round(act1.netInvoice), 164_105_000)
})

test('classifyDiscipline accurately classifies by color and keywords', () => {
  // Test orange color style
  const orange = classifyDiscipline('CABLE ALIMENTADOR', '1.1', { fgColor: { rgb: 'FFFFC000' } })
  assert.equal(orange.discipline, 'Electrico')
  assert.equal(orange.detectedBy, 'color')

  // Test green color style
  const green = classifyDiscipline('LUMINARIA LED', '3.68', { fgColor: { rgb: 'FF92D050' } })
  assert.equal(green.discipline, 'Alumbrado')
  assert.equal(green.detectedBy, 'color')

  // Test civil keywords (cajas, camaras, tuberias) without color
  const civilBox = classifyDiscipline('CONSTRUCCION DE CAJA SUBTERRANEA TIPO A SB850 CELSIA', '3.59')
  assert.equal(civilBox.discipline, 'Civil')

  const civilPipe = classifyDiscipline('SEI TUBERIA PVC 4" INCLUYE EXCAVACION Y RELLENO', '3.62')
  assert.equal(civilPipe.discipline, 'Civil')

  // Test electrical keywords
  const trafo = classifyDiscipline('SUMINISTRO TRANSFORMADOR PADMOUNTED 300 KVA', '4.21')
  assert.equal(trafo.discipline, 'Electrico')

  const reconectador = classifyDiscipline('SEI ESTRUCTURA RECONECTADOR A CONJUNTO', '4.1R')
  assert.equal(reconectador.discipline, 'Electrico')

  const malla = classifyDiscipline('SEI MALLA A TIERRA 5X4 MTS 4 ELECTRODOS', '5.1')
  assert.equal(malla.discipline, 'Electrico')
})

test('updateItemDiscipline updates discipline and recomputes summaries', () => {
  const initial = getSampleReport()
  const firstItem = initial.items[0]
  const initialCivilTotal = initial.disciplines.Civil.contractedTotal

  // Reclassify from Civil to Electrico
  const updated = updateItemDiscipline(initial, firstItem.row, 'Electrico')
  assert.ok(updated.disciplines.Civil.contractedTotal < initialCivilTotal)
  assert.ok(updated.disciplines.Electrico.contractedTotal > initial.disciplines.Electrico.contractedTotal)
})

test('parseActaWorkbook parses real Conexo La Nubia workbook with accurate discipline breakdown', () => {
  if (fs.existsSync('./public/acta_conexo_la_nubia.xlsm')) {
    const buffer = fs.readFileSync('./public/acta_conexo_la_nubia.xlsm')
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    const report = parseActaWorkbook(ab, '2026_10_16_ACTA_4_CONEXO_LA_NUBIA.xlsm')

    assert.equal(report.acts.length, 4)
    assert.equal(report.directCostContracted, 2891484098)
    assert.equal(report.items.length, 107)

    // Check disciplines
    const d = report.disciplines
    assert.ok(d.Electrico.contractedTotal > 1_400_000_000)
    assert.ok(d.Civil.contractedTotal > 1_200_000_000)
    assert.ok(d.Alumbrado.contractedTotal > 240_000_000)

    const sumContracted = d.Electrico.contractedTotal + d.Civil.contractedTotal + d.Alumbrado.contractedTotal
    assert.equal(Math.round(sumContracted), 2891484098)
  }
})
