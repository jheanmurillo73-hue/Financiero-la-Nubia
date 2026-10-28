import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyDiscipline } from './disciplines'

test('civil classification: correctly identifies cajas, camaras and tuberias', () => {
  const samples = [
    { text: 'Construcción de cajas de inspección en concreto 80x80 cm', expected: 'civil' },
    { text: 'Cajas de paso tipo norma para redes subterráneas', expected: 'civil' },
    { text: 'Cámaras de inspección y empalme MT', expected: 'civil' },
    { text: 'Cámara de paso vehicular con marco y tapa de hierro', expected: 'civil' },
    { text: 'Suministro e instalación de tubería PVC Conduit de 3 pulgadas', expected: 'civil' },
    { text: 'Tuberías subterráneas corrugadas TDP 4 pulg', expected: 'civil' },
    { text: 'Ductos y canalizaciones en zanja para acometida', expected: 'civil' },
  ]

  for (const sample of samples) {
    const result = classifyDiscipline(sample.text)
    assert.equal(
      result.discipline,
      sample.expected,
      `Expected "${sample.text}" to be classified as ${sample.expected}, got ${result.discipline} (${result.reason})`
    )
  }
})

test('electrical classification: correctly identifies cable, tableros, medidores, malla a tierra, transformadores, planta, reconectador, terminales, codos', () => {
  const samples = [
    { text: 'Tendido de cable de cobre aislado THHN 4/0 AWG', expected: 'electrico' },
    { text: 'Conductores de cobre para alimentadores principales', expected: 'electrico' },
    { text: 'Tablero de distribución baja tensión 24 circuitos', expected: 'electrico' },
    { text: 'Tableros de media tensión 13.2 kV tipo celda compacta', expected: 'electrico' },
    { text: 'Instalación de medidores electrónicos multifunción', expected: 'electrico' },
    { text: 'Malla a tierra en cable desnudo 2/0 con varillas copperweld', expected: 'electrico' },
    { text: 'Sistema de puesta a tierra con soldadura exotérmica', expected: 'electrico' },
    { text: 'Montaje de transformador trifásico 150 kVA 13.2kV / 208-120V', expected: 'electrico' },
    { text: 'Suministro e instalación de planta de emergencia diésel 100 kW', expected: 'electrico' },
    { text: 'Reconectador automático trifásico 15 kV tipo intemperie', expected: 'electrico' },
    { text: 'Terminales premoldeados tipo exterior para cable de media tensión', expected: 'electrico' },
    { text: 'Codos premoldeados desconectables 200 A 15 kV', expected: 'electrico' },
    { text: 'Conectores bimetálicos y empalmes eléctricos de compresión', expected: 'electrico' },
  ]

  for (const sample of samples) {
    const result = classifyDiscipline(sample.text)
    assert.equal(
      result.discipline,
      sample.expected,
      `Expected "${sample.text}" to be classified as ${sample.expected}, got ${result.discipline} (${result.reason})`
    )
  }
})
