import { PlaceholderPage } from './PlaceholderPage'

export function StaffDirectoryPage() {
  return (
    <PlaceholderPage
      title="Staff directory"
      description="LabStaff, with the conditional fields each role carries: Certification for technicians, License_No and Qualification for pathologists."
      pending="getStaff() and createStaff() are implemented and the Zod schema already enforces the per-role required fields. What remains is the directory table and the create form."
    />
  )
}
