'use client'

import * as React from 'react'
import {
  useForm,
  UseFormReturn,
  FormProvider,
  FieldValues,
  FieldPath,
  Controller,
  ControllerProps,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '../lib/utils'
import { FormField } from './form-field'

export interface FormProps<T extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** React Hook Form methods (if managing form externally) */
  form?: UseFormReturn<T>
  /** Zod schema for validation */
  schema?: z.ZodSchema<T>
  /** Form submission handler */
  onSubmit?: (data: T) => void | Promise<void>
  /** Default form values */
  defaultValues?: Partial<T>
  /** Form mode - 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all' */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
  /** Children - form fields */
  children: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode)
}

/**
 * Form component wrapper that integrates React Hook Form with Zod validation
 * Provides form context to all child components
 *
 * @example
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * })
 *
 * <Form schema={schema} onSubmit={(data) => console.log(data)}>
 *   <FormField label="Email" name="email">
 *     <Input {...register('email')} />
 *   </FormField>
 * </Form>
 */
export function Form<T extends FieldValues>({
  form: externalForm,
  schema,
  onSubmit,
  defaultValues,
  mode = 'onSubmit',
  children,
  className,
  ...props
}: FormProps<T>) {
  const internalForm = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues,
    mode,
  })

  const form = externalForm || internalForm

  const handleSubmit = form.handleSubmit(async (data) => {
    if (onSubmit) {
      await onSubmit(data)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className={cn('space-y-6', className)} {...props}>
        {typeof children === 'function' ? children(form) : children}
      </form>
    </FormProvider>
  )
}

/**
 * FormField with React Hook Form integration
 * Automatically connects to form context and displays validation errors
 */
export interface FormFieldControllerProps<T extends FieldValues> {
  /** Field name (must match form schema) */
  name: FieldPath<T>
  /** Label text */
  label: string
  /** Helper text */
  description?: string
  /** Whether field is required */
  required?: boolean
  /** Additional className */
  className?: string
  /** Children - the input component */
  children: React.ReactNode | ((field: ControllerProps<T>['field']) => React.ReactNode)
}

/**
 * FormField component that integrates with React Hook Form
 * Automatically handles registration, validation, and error display
 *
 * @example
 * <FormFieldController name="email" label="Email Address" required>
 *   {(field) => <Input {...field} type="email" />}
 * </FormFieldController>
 */
export function FormFieldController<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children,
}: FormFieldControllerProps<T>) {
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <FormField
          label={label}
          error={fieldState.error?.message}
          description={description}
          required={required}
          className={className}
          name={field.name}
        >
          {typeof children === 'function' ? children(field) : children}
        </FormField>
      )}
    />
  )
}

/**
 * Hook to access form context
 * Use this in custom components that need form state
 */
export function useFormContext<T extends FieldValues>() {
  return React.useContext(FormProvider.Context) as UseFormReturn<T> | undefined
}
