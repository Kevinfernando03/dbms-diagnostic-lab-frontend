import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { QueryState } from '@/components/data/QueryState'
import { ReportDocument } from '@/components/domain/ReportDocument'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Surface } from '@/components/ui/Surface'
import { getReport } from '@/services'
import { isReportIssued } from '@/types'

/** Module 4 — the report viewer. */
export function ReportViewPage() {
  const { reportId = '' } = useParams()

  const query = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
  })

  return (
    <div className="flex flex-col gap-5">
      <QueryState query={query}>
        {(report) => (
          <>
            <PageHeader
              title="Diagnostic report"
              breadcrumbs={[{ label: 'Reports', to: '/reports' }, { label: report.Report_ID }]}
              meta={
                <Badge tone={isReportIssued(report) ? 'success' : 'warning'}>
                  {isReportIssued(report) ? 'Issued' : 'Draft'}
                </Badge>
              }
              actions={
                <Button variant="primary" asChild>
                  <Link to={`/reports/${report.Report_ID}/print`}>
                    <Printer />
                    Print or save as PDF
                  </Link>
                </Button>
              }
            />
            <Surface className="p-5 sm:p-8">
              <ReportDocument report={report} />
            </Surface>
          </>
        )}
      </QueryState>
    </div>
  )
}
