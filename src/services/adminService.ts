import type { LabStaff, Laboratory, LaboratoryInput, StaffInput, StaffRole } from '@/types'
import { qs, request } from './http'

export const getStaff = (params: { role?: StaffRole } = {}) =>
  request<LabStaff[]>('GET', `/staff${qs({ ...params })}`)

export const createStaff = (staffData: StaffInput) =>
  request<LabStaff>('POST', '/staff', staffData)

export const getLabLocations = () => request<Laboratory[]>('GET', '/laboratories')

export const createLabLocation = (labData: LaboratoryInput) =>
  request<Laboratory>('POST', '/laboratories', labData)

/** Demo-only: rebuild the mock store from its deterministic seed. */
export const resetDemoData = () => request<{ ok: boolean }>('POST', '/demo/reset')
