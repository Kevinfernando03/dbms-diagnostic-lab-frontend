import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Thin semantic table wrappers. Real <table> markup, so screen readers get
 * row and column relationships for free and the print stylesheet can repeat
 * headers across pages.
 */

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>
}

export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <table className="w-full text-13">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  )
}

export function Th({
  children,
  className,
  numeric,
}: {
  children?: ReactNode
  className?: string
  numeric?: boolean
}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-hairline bg-surface-2 px-3 py-2 text-left',
        'text-2xs font-semibold uppercase tracking-wide text-fg-muted',
        numeric && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className,
  numeric,
}: {
  children?: ReactNode
  className?: string
  numeric?: boolean
}) {
  return (
    <td className={cn('border-b border-hairline px-3 py-2 align-middle', numeric && 'text-right', className)}>
      {children}
    </td>
  )
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('row-h transition-colors hover:bg-surface-2', className)}>{children}</tr>
}
