export type ObstacleState = 'present' | 'not_present' | 'unknown'
export type FinishType = 'skirting_board' | 'flush_fit' | 'cornice' | 'other'
export type PackageChoice = 'budget' | 'paxbespoke' | 'select'

export interface FinishDetails {
  height_mm?: number
  cornice_height_mm?: number
  photos_received?: boolean
  gap_noted?: boolean
  notes?: string
}

export interface GuideState {
  // S1 Space
  room_confirmed: string
  space_constraints: string[]
  photos_on_file: boolean
  photos_note: string
  // S2 Package
  package_confirmed: PackageChoice | ''
  budget_responsibility_confirmed: boolean
  // S3 Obstacles
  obstacle_bed: ObstacleState
  obstacle_radiator: ObstacleState
  obstacle_curtain_rail: ObstacleState
  obstacle_coving: ObstacleState
  obstacle_picture_rail: ObstacleState
  obstacle_other: string
  // S4 Finish
  finish_type: FinishType | ''
  finish_details: FinishDetails
  // S5 Notes
  call_notes: string
  next_action: string
}

export const DEFAULT_STATE: GuideState = {
  room_confirmed: '',
  space_constraints: [],
  photos_on_file: false,
  photos_note: '',
  package_confirmed: '',
  budget_responsibility_confirmed: false,
  obstacle_bed: 'unknown',
  obstacle_radiator: 'unknown',
  obstacle_curtain_rail: 'unknown',
  obstacle_coving: 'unknown',
  obstacle_picture_rail: 'unknown',
  obstacle_other: '',
  finish_type: '',
  finish_details: {},
  call_notes: '',
  next_action: '',
}

export const SPACE_CONSTRAINT_OPTIONS = [
  { id: 'sloped-ceiling', label: 'Sloped / angled ceiling' },
  { id: 'tall-ceiling', label: 'Tall ceiling' },
  { id: 'chimney-breast', label: 'Chimney breast' },
  { id: 'bulkhead', label: 'Bulkhead (stairs)' },
  { id: 'alcoves', label: 'Alcoves' },
  { id: 'limited-door-space', label: 'Limited door space' },
  { id: 'none', label: 'Straightforward space' },
]

export const FINISH_TYPE_OPTIONS: { id: FinishType; label: string; desc: string }[] = [
  { id: 'skirting_board', label: 'Skirting Board', desc: 'Matches existing skirting profile' },
  { id: 'flush_fit', label: 'Flush Fit', desc: 'Clean minimal look, no visible gaps' },
  { id: 'cornice', label: 'Cornice', desc: 'Matches ceiling coving / cornice' },
  { id: 'other', label: 'Other', desc: 'Describe below' },
]

export const NEXT_ACTION_OPTIONS: Record<PackageChoice, string> = {
  budget: 'Prepare quote from IKEA plan',
  paxbespoke: 'Create 3D design',
  select: 'Create 3D design with bespoke doors',
}
