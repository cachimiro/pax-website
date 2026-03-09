/**
 * Parses a lead's raw notes string into structured key-value pairs.
 *
 * The booking form stores answers as "Key: value\n" lines. This extracts
 * the known fields and returns them as a plain object. Any lines that don't
 * match a known key are collected into `_remainder`.
 */

const KNOWN_KEYS: Record<string, string> = {
  room: 'Room',
  style: 'Style',
  package: 'Package',
  budget: 'Budget',
  timeline: 'Timeline',
  location: 'Location',
  'whatsapp opt-in': 'WhatsApp',
  'whatsapp': 'WhatsApp',
}

export interface ParsedLeadNotes {
  fields: { label: string; value: string }[]
  remainder: string
}

export function parseLeadNotes(notes: string | null | undefined): ParsedLeadNotes {
  if (!notes?.trim()) return { fields: [], remainder: '' }

  const lines = notes.split('\n')
  const fields: { label: string; value: string }[] = []
  const remainderLines: string[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) {
      if (line.trim()) remainderLines.push(line)
      continue
    }

    const rawKey = line.slice(0, colonIdx).trim().toLowerCase()
    const value = line.slice(colonIdx + 1).trim()

    const label = KNOWN_KEYS[rawKey]
    if (label && value && !seen.has(label)) {
      seen.add(label)
      fields.push({ label, value })
    } else if (!label && line.trim()) {
      remainderLines.push(line)
    }
  }

  return { fields, remainder: remainderLines.join('\n') }
}
