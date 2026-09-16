import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, TestTubes } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/data/ConfirmDialog'
import { EmptyState } from '@/components/data/EmptyState'
import { QueryState } from '@/components/data/QueryState'
import { RowActions } from '@/components/data/RowActions'
import { Table, TableWrap, Td, Th, Tr } from '@/components/data/Table'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Surface } from '@/components/ui/Surface'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { TestFormDialog } from '@/features/catalogue/TestFormDialog'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/format'
import { deleteTest, getTests } from '@/services'
import { TEST_CATEGORIES, type Test, type TestCategory } from '@/types'

type Filter = TestCategory | 'All'

/** Module 1 / 5 - the test directory, with catalogue management for admins. */
export function CataloguePage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Test | null>(null)
  const [deleting, setDeleting] = useState<Test | null>(null)

  const canManage = can('catalogue:write')

  const query = useQuery({
    queryKey: ['tests', { filter, search }],
    queryFn: () => getTests({ category: filter === 'All' ? undefined : filter, q: search }),
  })

  const deleteMutation = useMutation({
    mutationFn: (testId: string) => deleteTest(testId),
    onSuccess: (_result, testId) => {
      void queryClient.invalidateQueries({ queryKey: ['tests'] })
      toast({ tone: 'success', title: `Deleted test ${testId}` })
      setDeleting(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Test catalogue"
        description="Pathology tests carry a Specimen_Type; radiology tests carry an Imaging_Modality."
        actions={
          canManage ? (
            <Button variant="primary" onClick={openCreate}>
              <Plus />
              Add test
            </Button>
          ) : null
        }
      />

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-3">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList className="border-b-0">
              <TabsTrigger value="All">All</TabsTrigger>
              {TEST_CATEGORIES.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <label className="sr-only" htmlFor="test-search">
            Search tests
          </label>
          <Input
            id="test-search"
            className="max-w-xs"
            placeholder="Search by Test_Name or Test_ID"
            leading={<Search />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <QueryState
          query={query}
          isEmpty={(data) => data.length === 0}
          empty={
            <EmptyState
              icon={TestTubes}
              title="No tests match this filter"
              description="Try another category or clear the search."
              action={
                canManage ? (
                  <Button variant="primary" onClick={openCreate}>
                    <Plus />
                    Add test
                  </Button>
                ) : null
              }
              compact
            />
          }
          skeleton={
            <TableWrap>
              <Table>
                <tbody>
                  <SkeletonRows rows={8} columns={6} />
                </tbody>
              </Table>
            </TableWrap>
          }
        >
          {(tests) => (
            <TableWrap>
              <Table caption="Test catalogue">
                <thead>
                  <tr>
                    <Th>Test_ID</Th>
                    <Th>Test_Name</Th>
                    <Th>Category</Th>
                    <Th>Specimen_Type / Imaging_Modality</Th>
                    <Th numeric>Price</Th>
                    {canManage ? <Th className="text-right">Actions</Th> : null}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <Tr key={test.Test_ID}>
                      <Td className="font-mono text-xs">{test.Test_ID}</Td>
                      <Td className="font-medium text-fg">
                        {test.Test_Name}
                        {test.Unit ? (
                          <span className="ml-2 font-mono text-2xs text-fg-muted">{test.Unit}</span>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={test.Test_Category === 'Pathology' ? 'info' : 'teal'}>
                          {test.Test_Category}
                        </Badge>
                      </Td>
                      <Td className="text-fg-secondary">
                        {test.Test_Category === 'Pathology'
                          ? test.Specimen_Type
                          : test.Imaging_Modality}
                      </Td>
                      <Td numeric>{formatCurrency(test.Price)}</Td>
                      {canManage ? (
                        <Td>
                          <RowActions
                            label={`test ${test.Test_ID}`}
                            onEdit={() => {
                              setEditing(test)
                              setFormOpen(true)
                            }}
                            onDelete={() => setDeleting(test)}
                          />
                        </Td>
                      ) : null}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </QueryState>
      </Surface>

      <TestFormDialog open={formOpen} onOpenChange={setFormOpen} test={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteMutation.reset()
          }
        }}
        title="Delete test"
        description={
          deleting
            ? `Are you sure you want to delete ${deleting.Test_Name} (${deleting.Test_ID})? Tests already booked on an order cannot be removed.`
            : ''
        }
        confirmLabel="Delete test"
        loading={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.Test_ID)}
      />
    </div>
  )
}
