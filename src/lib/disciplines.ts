export type DisciplineType = 'electrico' | 'civil' | 'general'

export interface DisciplineRule {
  keywords: string[]
  discipline: DisciplineType
  category: string
}

// User-specified rule keywords:
// Civiles: todo lo relacionado con cajas y camaras, tuberias
// Eléctrico: cable, tableros de baja y media tension, medidores, malla a tierra,
// transformadores, planta de emergencia, reconectador, e insumos electricos como terminales, codos etc.
export const CIVIL_KEYWORDS: Array<{ term: string; label: string }> = [
  { term: 'caja', label: 'Cajas de inspección/paso' },
  { term: 'cajas', label: 'Cajas' },
  { term: 'camara', label: 'Cámaras de paso/inspección' },
  { term: 'camaras', label: 'Cámaras' },
  { term: 'tuberia', label: 'Tuberías y canalización' },
  { term: 'tuberias', label: 'Tuberías' },
  { term: 'tubo', label: 'Tubería/Tubo' },
  { term: 'ducto', label: 'Ductos' },
  { term: 'ductos', label: 'Ductos y canalizaciones' },
  { term: 'conduit', label: 'Tubería conduit' },
  { term: 'canalizacion', label: 'Canalizaciones' },
  { term: 'canalizaciones', label: 'Canalizaciones' },
  { term: 'caja de paso', label: 'Cajas de paso' },
  { term: 'caja de empalme', label: 'Cajas de empalme' },
  { term: 'zanja', label: 'Zanja y excavación' },
  { term: 'carcamo', label: 'Cárcamos' },
  { term: 'buzon', label: 'Buzones' },
]

export const ELECTRICAL_KEYWORDS: Array<{ term: string; label: string }> = [
  { term: 'cable', label: 'Cables y conductores' },
  { term: 'cables', label: 'Cables' },
  { term: 'conductor', label: 'Conductores' },
  { term: 'conductores', label: 'Conductores' },
  { term: 'alambre', label: 'Alambre eléctrico' },
  { term: 'acometida', label: 'Acometida eléctrica' },
  { term: 'tablero', label: 'Tableros eléctricos' },
  { term: 'tableros', label: 'Tableros de distribución' },
  { term: 'baja tension', label: 'Baja tensión (BT)' },
  { term: 'media tension', label: 'Media tensión (MT)' },
  { term: 'medidor', label: 'Medidores de energía' },
  { term: 'medidores', label: 'Medidores' },
  { term: 'telemedida', label: 'Telemedición' },
  { term: 'malla a tierra', label: 'Malla a tierra' },
  { term: 'malla de tierra', label: 'Malla a tierra' },
  { term: 'puesta a tierra', label: 'Sistema de puesta a tierra' },
  { term: 'varilla copperweld', label: 'Puesta a tierra' },
  { term: 'soldadura exotermica', label: 'Puesta a tierra' },
  { term: 'transformador', label: 'Transformadores' },
  { term: 'transformadores', label: 'Transformadores' },
  { term: 'trafo', label: 'Transformador' },
  { term: 'subestacion', label: 'Subestación eléctrica' },
  { term: 'planta de emergencia', label: 'Planta de emergencia' },
  { term: 'planta electrica', label: 'Planta eléctrica' },
  { term: 'generador', label: 'Generador diésel' },
  { term: 'grupo electrogeno', label: 'Grupo electrógeno' },
  { term: 'reconectador', label: 'Reconectador' },
  { term: 'recloser', label: 'Reconectador' },
  { term: 'seccionador', label: 'Seccionador' },
  { term: 'cortacircuito', label: 'Cortacircuitos' },
  { term: 'terminal', label: 'Terminales eléctricos' },
  { term: 'terminales', label: 'Terminales premoldeados' },
  { term: 'codo', label: 'Codos premoldeados/eléctricos' },
  { term: 'codos', label: 'Codos premoldeados' },
  { term: 'empalme', label: 'Insumos y empalmes eléctricos' },
  { term: 'conector', label: 'Conectores eléctricos' },
  { term: 'conectores', label: 'Conectores' },
  { term: 'interruptor', label: 'Interruptores y protecciones' },
  { term: 'breaker', label: 'Interruptores / Breakers' },
  { term: 'toma', label: 'Tomas y salidas' },
  { term: 'luminaria', label: 'Iluminación y luminarias' },
  { term: 'aislador', label: 'Aisladores' },
  { term: 'pararrayos', label: 'DPS / Pararrayos' },
]

export const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Classifies an activity or chapter name into 'civil', 'electrico', or 'general'
 * according to user specifications.
 */
export const classifyDiscipline = (
  name: string
): {
  discipline: DisciplineType
  reason: string
  matchedKeyword?: string
} => {
  const norm = normalizeText(name)

  // 1. Check Civil Keywords First or Electrical Keywords:
  // Note: if an item says "caja de paso eléctrica" or "tubería conduit para cables",
  // if it's primarily boxes/cameras/pipes it is civil as per prompt:
  // "las obras civiles es todo lo relacionado con cajas y camaras, tuberias, mientras lo electrico es cable..."
  
  // Look for civil matches
  for (const { term, label } of CIVIL_KEYWORDS) {
    const regex = new RegExp(`\\b${normalizeText(term)}\\b`, 'i')
    if (regex.test(norm)) {
      return {
        discipline: 'civil',
        reason: label,
        matchedKeyword: term,
      }
    }
  }

  // Look for electrical matches
  for (const { term, label } of ELECTRICAL_KEYWORDS) {
    const regex = new RegExp(`\\b${normalizeText(term)}\\b`, 'i')
    if (regex.test(norm)) {
      return {
        discipline: 'electrico',
        reason: label,
        matchedKeyword: term,
      }
    }
  }

  // If chapter or name contains 'electr' or 'redes electricas' without explicit civil term
  if (/\b(electrico|electrica|electricas|electricos|potencia|fotovoltaico|solar)\b/i.test(norm)) {
    return {
      discipline: 'electrico',
      reason: 'Actividad eléctrica general',
      matchedKeyword: 'eléctrico',
    }
  }

  // If chapter or name contains civil terms (estructura, cimentacion, mamposteria, etc.)
  if (/\b(civil|civiles|cimentacion|concreto|mamposteria|demolicion|preliminares|urbanismo|pavimento|cubierta)\b/i.test(norm)) {
    return {
      discipline: 'civil',
      reason: 'Obra civil general',
      matchedKeyword: 'civil',
    }
  }

  return {
    discipline: 'general',
    reason: 'Otras actividades de obra',
  }
}
