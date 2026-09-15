import { PlaceholderPage } from './PlaceholderPage'

export function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Operational overview: order volume, queue depth and what needs attention today."
      pending="The service layer already exposes orders, samples and reports, so this screen is a matter of aggregating them into summary tiles and a short activity list."
    />
  )
}
