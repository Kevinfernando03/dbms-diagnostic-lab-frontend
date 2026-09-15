import { z } from 'zod'

/**
 * Test, with its two specialisations.
 *
 * Test_Category is the discriminator: a Pathology test carries Specimen_Type
 * (PathologyTest), a Radiology test carries Imaging_Modality (RadiologyTest).
 * The admin catalogue form swaps its conditional input on this field.
 */

export const testCategorySchema = z.enum(['Pathology', 'Radiology'])
export type TestCategory = z.infer<typeof testCategorySchema>

export const TEST_CATEGORIES: TestCategory[] = ['Pathology', 'Radiology']

export const specimenTypeSchema = z.enum(['Blood', 'Serum', 'Urine', 'Tissue', 'Stool', 'Swab'])
export type SpecimenType = z.infer<typeof specimenTypeSchema>
export const SPECIMEN_TYPES: SpecimenType[] = ['Blood', 'Serum', 'Urine', 'Tissue', 'Stool', 'Swab']

export const imagingModalitySchema = z.enum(['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Mammography'])
export type ImagingModality = z.infer<typeof imagingModalitySchema>
export const IMAGING_MODALITIES: ImagingModality[] = [
  'X-Ray',
  'MRI',
  'CT Scan',
  'Ultrasound',
  'Mammography',
]

export interface Test {
  Test_ID: string
  Test_Name: string
  Test_Category: TestCategory
  Price: number
  /** Present when Test_Category is 'Pathology' (PathologyTest). */
  Specimen_Type: SpecimenType | null
  /** Present when Test_Category is 'Radiology' (RadiologyTest). */
  Imaging_Modality: ImagingModality | null
  /** Canonical unit for the observed value, e.g. 'g/dL'. Null for imaging. */
  Unit: string | null
}

/**
 * Payload accepted by createTest. Validated as a discriminated union so that
 * a Pathology test cannot be saved without a specimen, and a Radiology test
 * cannot be saved without a modality.
 */
export const testInputSchema = z
  .object({
    Test_Name: z.string().trim().min(2, 'Test name is required').max(60),
    Test_Category: testCategorySchema,
    Price: z.coerce.number().int('Price must be a whole number of rupees').min(0, 'Price cannot be negative'),
    Specimen_Type: specimenTypeSchema.nullable().optional(),
    Imaging_Modality: imagingModalitySchema.nullable().optional(),
    Unit: z.string().trim().max(16).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.Test_Category === 'Pathology' && !value.Specimen_Type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['Specimen_Type'],
        message: 'Select a specimen type for a pathology test',
      })
    }
    if (value.Test_Category === 'Radiology' && !value.Imaging_Modality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['Imaging_Modality'],
        message: 'Select an imaging modality for a radiology test',
      })
    }
  })
export type TestInput = z.infer<typeof testInputSchema>

/** What the catalogue grid shows in the sub-label under the test name. */
export const testDetailLabel = (test: Test) =>
  test.Test_Category === 'Pathology' ? test.Specimen_Type : test.Imaging_Modality
