import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/data/EmptyState'
import { Pagination } from '@/components/data/Pagination'
import { QueryState } from '@/components/data/QueryState'
import { Table, TableWrap, Td, Th, Tr } from '@/components/data/Table'
import { OrderStatusBadge } from '@/components/domain/StatusBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Surface } from '@/components/ui/Surface'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { getOrders } from '@/services'
import { ORDER_STATUSES, type OrderStatus } from '@/types'

const PAGE_SIZE = 12
type Filter = OrderStatus | 'All'

/** Module 1 — order tracking dashboard. */
export function OrdersPage() {
  const { can, session } = useAuth()
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // A patient session only ever sees its own orders.
  const scopedPatientId = session?.user.role === 'patient' ? session.user.patientId : undefined

  const query = useQuery({
    queryKey: ['orders', { filter, search, page, scopedPatientId }],
    queryFn: () =>
      getOrders({
        status: filter === 'All' ? undefined : filter,
        q: search,
        patientId: scopedPatientId,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Test orders"
        description="Track every TestOrder from booking through to the issued report."
        actions={
          can('order:create') ? (
            <Button variant="primary" asChild>
              <Link to="/orders/new">
                <Plus />
                Book tests
              </Link>
            </Button>
          ) : null
        }
      />

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-3">
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as Filter)
              setPage(1)
            }}
          >
            <TabsList className="border-b-0">
              <TabsTrigger value="All">All</TabsTrigger>
              {ORDER_STATUSES.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {status}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <label className="sr-only" htmlFor="order-search">
            Search orders
          </label>
          <Input
            id="order-search"
            className="max-w-xs"
            placeholder="Search by Order_ID or patient"
            leading={<Search />}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>

        <QueryState
          query={query}
          isEmpty={(data) => data.data.length === 0}
          empty={
            <EmptyState
              icon={ClipboardList}
              title="No orders match this view"
              description="Try a different status filter or search term."
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
          {(data) => (
            <>
              <TableWrap>
                <Table caption="Test orders">
                  <thead>
                    <tr>
                      <Th>Order_ID</Th>
                      <Th>Order_Date</Th>
                      <Th>Patient</Th>
                      <Th>Referred by</Th>
                      <Th>Status</Th>
                      <Th numeric>Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((order) => (
                      <Tr key={order.Order_ID}>
                        <Td className="font-mono text-xs">
                          <Link
                            to={`/orders/${order.Order_ID}`}
                            className="text-accent hover:underline underline-offset-2"
                          >
                            {order.Order_ID}
                          </Link>
                        </Td>
                        <Td>{formatDate(order.Order_Date)}</Td>
                        <Td>
                          <span className="font-medium text-fg">{order.Patient_Name}</span>
                          <span className="ml-2 font-mono text-2xs text-fg-muted">
                            {order.Patient_ID}
                          </span>
                        </Td>
                        <Td className="text-fg-secondary">{order.Doctor_Name ?? '—'}</Td>
                        <Td>
                          <OrderStatusBadge status={order.Status} />
                        </Td>
                        <Td numeric>{formatCurrency(order.Total_Price)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={setPage}
                label="orders"
              />
            </>
          )}
        </QueryState>
      </Surface>
    </div>
  )
}
