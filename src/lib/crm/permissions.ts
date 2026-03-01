import type { UserRole, OpportunityStage } from './types'

type Permission = 'read' | 'write' | 'delete'
type Resource = 'leads' | 'opportunities' | 'bookings' | 'tasks' | 'onboardings' | 'invoices' | 'payments' | 'settings'

const ROLE_PERMISSIONS: Record<UserRole, Partial<Record<Resource, Permission[]>>> = {
  sales: {
    leads:         ['read', 'write'],
    opportunities: ['read', 'write'],
    bookings:      ['read', 'write'],
    tasks:         ['read', 'write'],
    onboardings:   ['read'],
    invoices:      ['read'],
  },
  operations: {
    leads:         ['read'],
    opportunities: ['read', 'write'],
    bookings:      ['read', 'write'],
    tasks:         ['read', 'write'],
    onboardings:   ['read', 'write'],
    invoices:      ['read'],
  },
  admin: {
    leads:         ['read', 'write', 'delete'],
    opportunities: ['read', 'write', 'delete'],
    bookings:      ['read', 'write', 'delete'],
    tasks:         ['read', 'write', 'delete'],
    onboardings:   ['read', 'write', 'delete'],
    invoices:      ['read', 'write', 'delete'],
    payments:      ['read', 'write', 'delete'],
    settings:      ['read', 'write'],
  },
}

export function hasPermission(role: UserRole, resource: Resource, action: Permission): boolean {
  if (role === 'admin') return true
  return ROLE_PERMISSIONS[role]?.[resource]?.includes(action) ?? false
}

/** Sales can only modify opportunities up to deposit_paid */
const SALES_MAX_STAGES: OpportunityStage[] = [
  'new_enquiry', 'call1_scheduled', 'qualified', 'call2_scheduled',
  'proposal_agreed', 'awaiting_deposit', 'deposit_paid',
]

export function canEditOpportunityStage(role: UserRole, stage: OpportunityStage): boolean {
  if (role === 'admin') return true
  if (role === 'operations') return true
  if (role === 'sales') return SALES_MAX_STAGES.includes(stage)
  return false
}

/** Navigation items visible per role */
export interface NavItem {
  label: string
  href: string
  icon: string
}

const ALL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/crm',            icon: 'LayoutDashboard' },
  { label: 'Pipeline',  href: '/crm/pipeline',   icon: 'Kanban' },
  { label: 'Leads',     href: '/crm/leads',      icon: 'Users' },
  { label: 'Calendar',  href: '/crm/calendar',   icon: 'Calendar' },
  { label: 'Tasks',     href: '/crm/tasks',      icon: 'CheckSquare' },
  { label: 'Reports',   href: '/crm/reports',    icon: 'BarChart3' },
  { label: 'Settings',  href: '/crm/settings',   icon: 'Settings' },
]

export function getNavItems(role: UserRole): NavItem[] {
  if (role === 'admin') return ALL_NAV
  return ALL_NAV.filter(item => {
    if (item.href === '/crm/settings') return false
    return true
  })
}
