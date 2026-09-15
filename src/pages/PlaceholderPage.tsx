import { Construction } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/data/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Surface } from '@/components/ui/Surface'

/**
 * Temporary stand-in for a screen that is not built yet.
 *
 * The data layer behind each of these already exists, so building them is a
 * matter of wiring the existing services to UI - not new architecture.
 */
export function PlaceholderPage({
  title,
  description,
  pending,
  action,
}: {
  title: string
  description: string
  /** What is still to be built, in one sentence. */
  pending: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} actions={action} />
      <Surface>
        <EmptyState icon={Construction} title="Not built yet" description={pending} />
      </Surface>
    </div>
  )
}
