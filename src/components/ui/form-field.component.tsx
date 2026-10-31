import { type Control, Controller, type ControllerRenderProps, type FieldPath, type FieldValues } from 'react-hook-form'
import { Field, type FieldControlProps } from './field.component'

type FormFieldProps<Values extends FieldValues, Name extends FieldPath<Values>> = {
  control: Control<Values>
  name: Name
  label: string
  hint?: string
  /** «*» after the label */
  required?: boolean
  /** (field) → control; spread `field` on Input / Textarea, or map value and onChange for the others */
  render: (field: ControllerRenderProps<Values, Name>) => React.ReactElement<FieldControlProps>
}

// react-hook-form glue: Controller + Field in one tag; messages arrive translated from useZodResolver (src/lib/forms)
export function FormField<Values extends FieldValues, Name extends FieldPath<Values>>({
  control,
  name,
  label,
  hint,
  required,
  render,
}: FormFieldProps<Values, Name>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} required={required} error={fieldState.error?.message}>
          {render(field)}
        </Field>
      )}
    />
  )
}
