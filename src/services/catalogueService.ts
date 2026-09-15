import type { Test, TestCategory, TestInput } from '@/types'
import { qs, request } from './http'

export const getTests = (params: { category?: TestCategory; q?: string } = {}) =>
  request<Test[]>('GET', `/tests${qs({ ...params })}`)

export const createTest = (testData: TestInput) => request<Test>('POST', '/tests', testData)
