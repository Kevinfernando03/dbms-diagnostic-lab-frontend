import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Surface, SurfaceHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { createPatient } from '@/services'
import { GENDERS, GENDER_LABELS, type PatientInput, isApiError, patientInputSchema } from '@/types'

/**
 * Module 1 — patient registration.
 *
 * Contact numbers live in Patient_Contact, a separate table, so the form adds
 * and removes rows rather than offering one fixed phone field.
 */
export function PatientRegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientInput>({
    resolver: zodResolver(patientInputSchema),
    defaultValues: {
      First_Name: '',
      Last_Name: '',
      DOB: '',
      Gender: 'M',
      Contacts: [{ Contact_No: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'Contacts' })
  const gender = watch('Gender')

  const mutation = useMutation({
    mutationFn: (values: PatientInput) => {
      const { Contacts, ...patientData } = values
      return createPatient(patientData, Contacts)
    },
    onSuccess: (patient) => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast({
        tone: 'success',
        title: `Registered ${patient.First_Name} ${patient.Last_Name}`,
        description: `Assigned Patient_ID ${patient.Patient_ID}`,
      })
      navigate(`/patients/${patient.Patient_ID}`)
    },
    onError: (error) => {
      if (isApiError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof PatientInput, { message })
        }
      }
      toast({ tone: 'error', title: 'Could not register the patient', description: String(error) })
    },
  })

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Register patient"
        description="Patient_ID is assigned by the system once the record is saved."
        breadcrumbs={[{ label: 'Patients', to: '/patients' }, { label: 'Register' }]}
      />

      <form
        className="flex max-w-2xl flex-col gap-5"
        onSubmit={handleSubmit((values) => mutation.mutateAsync(values).catch(() => undefined))}
        noValidate
      >
        <Surface>
          <SurfaceHeader title="Patient details" description="Fields marked with an asterisk are required." />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="First_Name" required error={errors.First_Name?.message}>
              <Input {...register('First_Name')} autoComplete="given-name" />
            </Field>
            <Field label="Last_Name" required error={errors.Last_Name?.message}>
              <Input {...register('Last_Name')} autoComplete="family-name" />
            </Field>
            <Field label="DOB" required error={errors.DOB?.message} hint="Age is computed from this date.">
              <Input type="date" {...register('DOB')} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Gender" required error={errors.Gender?.message}>
              <Select value={gender} onValueChange={(value) => setValue('Gender', value as PatientInput['Gender'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value} — {GENDER_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Surface>

        <Surface>
          <SurfaceHeader
            title="Contact numbers"
            description="Stored in Patient_Contact. The first number is treated as primary."
            actions={
              <Button type="button" size="sm" onClick={() => append({ Contact_No: '' })}>
                <Plus />
                Add number
              </Button>
            }
          />
          <div className="flex flex-col gap-3 p-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <Field
                  className="flex-1"
                  label={index === 0 ? 'Primary Contact_No' : `Contact_No ${index + 1}`}
                  required={index === 0}
                  error={errors.Contacts?.[index]?.Contact_No?.message}
                >
                  <Input
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    {...register(`Contacts.${index}.Contact_No` as const)}
                  />
                </Field>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-6 text-fg-muted hover:text-danger"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label={`Remove contact number ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {errors.Contacts?.message ? (
              <p role="alert" className="text-xs text-danger">
                {errors.Contacts.message}
              </p>
            ) : null}
          </div>
        </Surface>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={() => navigate('/patients')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting || mutation.isPending}>
            Register patient
          </Button>
        </div>
      </form>
    </div>
  )
}
