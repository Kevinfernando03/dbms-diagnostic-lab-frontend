import { NavLink } from 'react-router-dom'
import { NAV_SECTIONS } from '@/app/navigation'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { Brand } from './Brand'

/**
 * Primary navigation.
 *
 * Sections whose items are all forbidden for the current role disappear
 * entirely, so no role ever sees an empty heading.
 */
export function Sidebar({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { can, session } = useAuth()
  const role = session?.user.role

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => can(item.permission) && (!item.roles || (role !== undefined && item.roles.includes(role))),
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="flex h-full flex-col bg-surface">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-hairline',
          collapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <Brand collapsed={collapsed} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.id} className="mb-4 last:mb-0">
            {!collapsed ? (
              <h2 className="px-2 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-disabled">
                {section.label}
              </h2>
            ) : (
              <div className="mx-2 mb-2 h-px bg-hairline first:hidden" role="presentation" />
            )}

            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-[var(--radius-control)] text-13 font-medium',
                        'transition-colors duration-150',
                        collapsed ? 'h-8 justify-center' : 'h-8 px-2',
                        isActive
                          ? 'bg-accent-subtle text-accent'
                          : 'text-fg-secondary hover:bg-surface-3 hover:text-fg',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn('size-4 shrink-0', isActive ? 'text-accent' : 'text-fg-muted')}
                        />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        {collapsed ? <span className="sr-only">{item.label}</span> : null}
                      </>
                    )}
                  </NavLink>
                )

                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
