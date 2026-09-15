import { Ban, CheckCircle2, CircleDashed, Clock, FlaskConical, Truck, XCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/Badge'
import { ORDER_STATUS_DESCRIPTIONS, type OrderStatus, type SampleStatus } from '@/types'

/**
 * Status badges for TestOrder.Status and Sample.Status.
 *
 * Each badge pairs a distinct icon with the status word, so the state survives
 * a greyscale print of the report and does not rely on colour vision.
 */

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface StatusVisual {
  icon: ComponentType<{ className?: string }>
  tone: Tone
}

const ORDER_VISUALS: Record<OrderStatus, StatusVisual> = {
  Pending: { icon: CircleDashed, tone: 'neutral' },
  Processing: { icon: Clock, tone: 'warning' },
  Completed: { icon: CheckCircle2, tone: 'success' },
  Cancelled: { icon: Ban, tone: 'danger' },
}

const SAMPLE_VISUALS: Record<SampleStatus, StatusVisual> = {
  Collected: { icon: FlaskConical, tone: 'info' },
  'In Transit': { icon: Truck, tone: 'purple' },
  Received: { icon: CheckCircle2, tone: 'success' },
  Rejected: { icon: XCircle, tone: 'danger' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const visual = ORDER_VISUALS[status]
  const Icon = visual.icon
  return (
    <Badge
      tone={visual.tone}
      icon={<Icon aria-hidden="true" />}
      title={ORDER_STATUS_DESCRIPTIONS[status]}
    >
      {status}
    </Badge>
  )
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const visual = SAMPLE_VISUALS[status]
  const Icon = visual.icon
  return (
    <Badge tone={visual.tone} icon={<Icon aria-hidden="true" />}>
      {status}
    </Badge>
  )
}
