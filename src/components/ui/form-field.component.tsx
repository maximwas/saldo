import { useTranslations } from 'next-intl'
import { type Control, Controller, type ControllerRenderProps, type FieldPath, type FieldValues } from 'react-hook-form'
import { Field, type FieldControlProps } from './field.component'

type FormFieldProps<Values extends FieldValues, Name extends FieldPath<Values>> = {
  control: Control<Values>
  name: Name
  label: string
  hint?: string
  /** (field) → control; spread `field` on Input / Textarea, or map value and onChange for the others */
  render: (field: ControllerRenderProps<Values, Name>) => React.ReactElement<FieldControlProps>
}

// react-hook-form glue: Controller + Field in one tag, so every form shows the schema error under its control
export function FormField<Values extends FieldValues, Name extends FieldPath<Values>>({
  control,
  name,
  label,
  hint,
  render,
}: FormFieldProps<Values, Name>) {
  // schema messages are keys of the errors namespace (docs/conventions §3b); translated here once for every form
  const translateErrors = useTranslations('errors')

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          hint={hint}
          error={fieldState.error?.message ? translateErrors(fieldState.error.message as never) : undefined}
        >
          {render(field)}
        </Field>
      )}
    />
  )
}
