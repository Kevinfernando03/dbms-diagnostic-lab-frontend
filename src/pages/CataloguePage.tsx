import { useQuery } from '@tanstack/react-query'
import { Search, TestTubes } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/data/EmptyState'
import { QueryState } from '@/components/data/QueryState'
import { Table, TableWrap, Td, Th, Tr } from '@/components/data/Table'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Surface } from '@/components/ui/Surface'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { formatCurrency } from '@/lib/format'
import { getTests } from '@/services'
import { TEST_CATEGORIES, type TestCategory } from '@/types'

type Filter = TestCategory | 'All'

/** Module 1 / 5 — the test directory. */
export function CataloguePage() {
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['tests', { filter, search }],
    queryFn: () => getTests({ category: filter === 'All' ? undefined : filter, q: search }),
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Test catalogue"
        description="Pathology tests carry a Specimen_Type; radiology tests carry an Imaging_Modality."
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
              compact
            />
          }
          skeleton={
            <TableWrap>
              <Table>
                <tbody>
                  <SkeletonRows rows={8} columns={5} />
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
                        <Badge tone={test.Test_Category === 'Pathology' ? 'info' : 'purple'}>
                          {test.Test_Category}
                        </Badge>
                      </Td>
                      <Td className="text-fg-secondary">
                        {test.Test_Category === 'Pathology' ? test.Specimen_Type : test.Imaging_Modality}
                      </Td>
                      <Td numeric>{formatCurrency(test.Price)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </QueryState>
      </Surface>
    </div>
  )
}
