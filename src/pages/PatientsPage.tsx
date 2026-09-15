import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/data/EmptyState'
import { Pagination } from '@/components/data/Pagination'
import { QueryState } from '@/components/data/QueryState'
import { Table, TableWrap, Td, Th, Tr } from '@/components/data/Table'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Surface } from '@/components/ui/Surface'
import { useAuth } from '@/hooks/useAuth'
import { formatAge, formatDate } from '@/lib/format'
import { getPatients } from '@/services'
import { GENDER_LABELS, patientFullName, primaryContact } from '@/types'

const PAGE_SIZE = 12

/** Module 1 — the patient register: search, sort, paginate. */
export function PatientsPage() {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: ['patients', { search, page }],
    queryFn: () => getPatients({ q: search, page, pageSize: PAGE_SIZE, sort: 'Patient_ID', order: 'asc' }),
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Patients"
        description="Every registered patient, with their contact numbers and order history."
        actions={
          can('patient:write') ? (
            <Button variant="primary" asChild>
              <Link to="/patients/new">
                <UserPlus />
                Register patient
              </Link>
            </Button>
          ) : null
        }
      />

      <Surface>
        <div className="border-b border-hairline p-3">
          <label className="sr-only" htmlFor="patient-search">
            Search patients
          </label>
          <Input
            id="patient-search"
            className="max-w-sm"
            placeholder="Search by name, Patient_ID or contact number"
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
              icon={Users}
              title={search ? 'No patients match that search' : 'No patients registered yet'}
              description={
                search
                  ? 'Try a different name, Patient_ID or contact number.'
                  : 'Register the first patient to get started.'
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
          {(data) => (
            <>
              <TableWrap>
                <Table caption="Registered patients">
                  <thead>
                    <tr>
                      <Th>Patient_ID</Th>
                      <Th>Name</Th>
                      <Th>Gender</Th>
                      <Th>DOB / Age</Th>
                      <Th>Contact_No</Th>
                      <Th numeric>Orders</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((patient) => (
                      <Tr key={patient.Patient_ID}>
                        <Td className="font-mono text-xs">
                          <Link
                            to={`/patients/${patient.Patient_ID}`}
                            className="text-accent hover:underline underline-offset-2"
                          >
                            {patient.Patient_ID}
                          </Link>
                        </Td>
                        <Td className="font-medium text-fg">{patientFullName(patient)}</Td>
                        <Td>{GENDER_LABELS[patient.Gender]}</Td>
                        <Td>
                          <span className="text-fg-secondary">{formatDate(patient.DOB)}</span>
                          <span className="ml-2 text-fg-muted">{formatAge(patient.DOB)}</span>
                        </Td>
                        <Td className="font-mono text-xs">
                          {primaryContact(patient) ?? '—'}
                          {patient.Contacts.length > 1 ? (
                            <Badge className="ml-1.5" tone="neutral">
                              +{patient.Contacts.length - 1}
                            </Badge>
                          ) : null}
                        </Td>
                        <Td numeric>{patient.Order_Count}</Td>
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
                label="patients"
              />
            </>
          )}
        </QueryState>
      </Surface>
    </div>
  )
}
