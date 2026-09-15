import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QueryState } from '@/components/data/QueryState'
import { Table, TableWrap, Td, Th } from '@/components/data/Table'
import { RemarkIndicator } from '@/components/domain/RemarkIndicator'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Surface, SurfaceHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { formatAge, formatDate } from '@/lib/format'
import { getOrderById, getReport, saveReportResults } from '@/services'
import { GENDER_LABELS, REMARKS, type Remark, type ResultRowInput } from '@/types'

interface RowState {
  Test_ID: string
  Test_Name: string
  Unit: string
  Observed_Value: string
  Remark: Remark
}

/**
 * Module 3 — result entry.
 *
 * One row per test on the order (OrderIncludesTest), producing one HasResult
 * each. Remark is the pathologist's judgement, entered here rather than
 * derived: the schema carries no reference range to compare against.
 */
export function ResultEntryPage() {
  const { reportId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const reportQuery = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
  })

  const orderId = reportQuery.data?.Order_ID
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId as string),
    enabled: Boolean(orderId),
  })

  const [rows, setRows] = useState<RowState[]>([])

  // Seed one editable row per ordered test, reusing any saved values.
  useEffect(() => {
    if (!orderQuery.data || !reportQuery.data) return
    const saved = new Map(reportQuery.data.Results.map((result) => [result.Test_ID, result]))
    setRows(
      orderQuery.data.Tests.map((test) => {
        const existing = saved.get(test.Test_ID)
        return {
          Test_ID: test.Test_ID,
          Test_Name: test.Test_Name,
          Unit: existing?.Unit ?? '',
          Observed_Value: existing?.Observed_Value ?? '',
          Remark: existing?.Remark ?? 'Normal',
        }
      }),
    )
  }, [orderQuery.data, reportQuery.data])

  const update = (testId: string, patch: Partial<RowState>) =>
    setRows((current) =>
      current.map((row) => (row.Test_ID === testId ? { ...row, ...patch } : row)),
    )

  const mutation = useMutation({
    mutationFn: () => {
      const results: ResultRowInput[] = rows.map((row) => ({
        Test_ID: row.Test_ID,
        Observed_Value: row.Observed_Value.trim(),
        Unit: row.Unit.trim() || null,
        Remark: row.Remark,
      }))
      return saveReportResults(reportId, results)
    },
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-results'] })
      void queryClient.invalidateQueries({ queryKey: ['reports'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast({
        tone: 'success',
        title: `Report ${report.Report_ID} issued`,
        description: 'The order is now marked Completed.',
      })
      navigate(`/reports/${report.Report_ID}`)
    },
    onError: (error) =>
      toast({ tone: 'error', title: 'Could not save the results', description: String(error) }),
  })

  const incomplete = rows.filter((row) => !row.Observed_Value.trim()).length

  return (
    <div className="flex flex-col gap-5">
      <QueryState query={reportQuery}>
        {(report) => (
          <>
            <PageHeader
              title="Enter results"
              breadcrumbs={[{ label: 'Result entry', to: '/results' }, { label: report.Report_ID }]}
              description={`${report.First_Name} ${report.Last_Name} · ${GENDER_LABELS[report.Gender]} · ${formatAge(report.DOB)}`}
              meta={
                <>
                  <Badge tone="accent" className="font-mono">
                    {report.Report_ID}
                  </Badge>
                  <Badge tone="neutral" className="font-mono">
                    {report.Order_ID}
                  </Badge>
                </>
              }
            />

            <Surface>
              <SurfaceHeader
                title="Report metadata"
                description={`Order placed ${formatDate(report.Order_Date)}`}
              />
              <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-fg-muted">Patient_ID</dt>
                  <dd className="mt-0.5 font-mono text-13">{report.Patient_ID}</dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-fg-muted">Referring doctor</dt>
                  <dd className="mt-0.5 text-13">
                    {report.Doctor_Name ?? '-'}
                    {report.Specialization ? (
                      <span className="text-fg-muted"> · {report.Specialization}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-fg-muted">Pathologist_ID</dt>
                  <dd className="mt-0.5 text-13">
                    <span className="font-mono">{report.Pathologist_ID}</span>
                    <span className="text-fg-muted"> · {report.Pathologist_Name}</span>
                  </dd>
                </div>
              </dl>
            </Surface>

            <Surface>
              <SurfaceHeader
                title="Observed values"
                description="One HasResult row per test on the order."
                actions={
                  incomplete > 0 ? (
                    <Badge tone="warning">{incomplete} value(s) still blank</Badge>
                  ) : (
                    <Badge tone="success">All values entered</Badge>
                  )
                }
              />

              <QueryState query={orderQuery}>
                {() => (
                  <TableWrap>
                    <Table caption="Result entry">
                      <thead>
                        <tr>
                          <Th>Test_Name</Th>
                          <Th className="w-40">Observed_Value</Th>
                          <Th className="w-28">Unit</Th>
                          <Th className="w-44">Remark</Th>
                          <Th className="w-32">Reading</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.Test_ID} className="border-b border-hairline">
                            <Td>
                              <span className="font-medium text-fg">{row.Test_Name}</span>
                              <span className="ml-2 font-mono text-2xs text-fg-muted">
                                {row.Test_ID}
                              </span>
                            </Td>
                            <Td>
                              <Input
                                value={row.Observed_Value}
                                onChange={(event) =>
                                  update(row.Test_ID, { Observed_Value: event.target.value })
                                }
                                aria-label={`Observed value for ${row.Test_Name}`}
                                placeholder="Value"
                              />
                            </Td>
                            <Td>
                              <Input
                                value={row.Unit}
                                onChange={(event) => update(row.Test_ID, { Unit: event.target.value })}
                                aria-label={`Unit for ${row.Test_Name}`}
                                placeholder="e.g. g/dL"
                              />
                            </Td>
                            <Td>
                              <Select
                                value={row.Remark}
                                onValueChange={(value) =>
                                  update(row.Test_ID, { Remark: value as Remark })
                                }
                              >
                                <SelectTrigger aria-label={`Remark for ${row.Test_Name}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {REMARKS.map((remark) => (
                                    <SelectItem key={remark} value={remark}>
                                      {remark}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Td>
                            <Td>
                              <RemarkIndicator remark={row.Remark} />
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                )}
              </QueryState>

              <div className="flex items-center justify-between gap-3 border-t border-hairline p-3">
                <p className="text-xs text-fg-muted">
                  Saving issues the report and moves the order to Completed.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => navigate('/results')}>Cancel</Button>
                  <Button
                    variant="primary"
                    onClick={() => mutation.mutate()}
                    loading={mutation.isPending}
                    disabled={rows.length === 0 || incomplete > 0}
                  >
                    <Save />
                    Save and issue report
                  </Button>
                </div>
              </div>
            </Surface>
          </>
        )}
      </QueryState>
    </div>
  )
}
