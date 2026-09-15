import {
  Building2,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Microscope,
  TestTubes,
  Users,
  UsersRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { Permission } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** The item renders only if the session holds this permission. */
  permission: Permission
  /** Match the path exactly rather than as a prefix. */
  end?: boolean
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Navigation is GENERATED from permissions, so a role can never see a link it
 * is not allowed to open. Route guards enforce the same rule on direct URL
 * entry; this list only decides what is offered.
 *
 * Sections map onto the five project modules.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: 'order:read',
        end: true,
      },
    ],
  },
  {
    id: 'patient',
    label: 'Patient',
    items: [
      { to: '/patients', label: 'Patients', icon: Users, permission: 'patient:read' },
      { to: '/orders', label: 'Test orders', icon: ClipboardList, permission: 'order:read' },
      { to: '/catalogue', label: 'Test catalogue', icon: TestTubes, permission: 'catalogue:read' },
    ],
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    items: [
      { to: '/samples', label: 'Sample intake', icon: FlaskConical, permission: 'sample:read' },
      { to: '/results', label: 'Result entry', icon: Microscope, permission: 'report:write' },
    ],
  },
  {
    id: 'output',
    label: 'Reports',
    items: [
      { to: '/reports', label: 'Diagnostic reports', icon: FileText, permission: 'report:read' },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { to: '/admin/staff', label: 'Staff directory', icon: UsersRound, permission: 'staff:manage' },
      { to: '/admin/labs', label: 'Laboratories', icon: Building2, permission: 'staff:manage' },
    ],
  },
]

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard',
  patient: '/orders',
  technician: '/samples',
  pathologist: '/results',
}
