'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import { Label } from './label'
import { Input } from './input'
import { Textarea } from './textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Checkbox } from './checkbox'
import { Switch } from './switch'

export interface FormFieldProps {
  /** Label text for the field */
  label: string
  /** Error message to display below the field */
  error?: string
  /** Helper text to display below the field */
  description?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional className for the wrapper */
  className?: string
  /** Field name for accessibility */
  name?: string
  /** Children - the actual input component */
  children: React.ReactNode
}

/**
 * FormField wrapper component that combines Label + Input + Error display
 * Provides consistent spacing and error handling for form fields
 *
 * @example
 * <FormField label="Email" error={errors.email?.message} required>
 *   <Input type="email" {...register('email')} />
 * </FormField>
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, description, required, className, name, children }, ref) => {
    const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <Label htmlFor={fieldId} className={required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ''}>
          {label}
        </Label>
        {children}
        {description && !error && (
          <p id={`${fieldId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
FormField.displayName = 'FormField'

/**
 * FormField.Input - Convenience wrapper for Input fields
 */
export interface FormFieldInputProps extends Omit<FormFieldProps, 'children'> {
  inputProps?: React.ComponentProps<typeof Input>
}

export const FormFieldInput = React.forwardRef<HTMLInputElement, FormFieldInputProps>(
  ({ label, error, description, required, className, name, inputProps }, ref) => {
    const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <FormField
        label={label}
        error={error}
        description={description}
        required={required}
        className={className}
        name={fieldId}
      >
        <Input
          id={fieldId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...inputProps}
        />
      </FormField>
    )
  }
)
FormFieldInput.displayName = 'FormFieldInput'

/**
 * FormField.Textarea - Convenience wrapper for Textarea fields
 */
export interface FormFieldTextareaProps extends Omit<FormFieldProps, 'children'> {
  textareaProps?: React.ComponentProps<typeof Textarea>
}

export const FormFieldTextarea = React.forwardRef<HTMLTextAreaElement, FormFieldTextareaProps>(
  ({ label, error, description, required, className, name, textareaProps }, ref) => {
    const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <FormField
        label={label}
        error={error}
        description={description}
        required={required}
        className={className}
        name={fieldId}
      >
        <Textarea
          id={fieldId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...textareaProps}
        />
      </FormField>
    )
  }
)
FormFieldTextarea.displayName = 'FormFieldTextarea'

/**
 * FormField.Select - Convenience wrapper for Select fields
 */
export interface FormFieldSelectProps extends Omit<FormFieldProps, 'children'> {
  selectProps?: React.ComponentProps<typeof Select>
  selectTriggerProps?: React.ComponentProps<typeof SelectTrigger>
  placeholder?: string
  options: Array<{ value: string; label: string }>
}

export const FormFieldSelect = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  FormFieldSelectProps
>(({ label, error, description, required, className, name, selectProps, selectTriggerProps, placeholder, options }, ref) => {
  const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <FormField
      label={label}
      error={error}
      description={description}
      required={required}
      className={className}
      name={fieldId}
    >
      <Select {...selectProps}>
        <SelectTrigger
          id={fieldId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...selectTriggerProps}
        >
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
})
FormFieldSelect.displayName = 'FormFieldSelect'

/**
 * FormField.Checkbox - Convenience wrapper for Checkbox fields
 */
export interface FormFieldCheckboxProps extends Omit<FormFieldProps, 'children'> {
  checkboxProps?: React.ComponentProps<typeof Checkbox>
}

export const FormFieldCheckbox = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  FormFieldCheckboxProps
>(({ label, error, description, required, className, name, checkboxProps }, ref) => {
  const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <FormField
      label={label}
      error={error}
      description={description}
      required={required}
      className={className}
      name={fieldId}
    >
      <div className="flex items-center space-x-2">
        <Checkbox
          id={fieldId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...checkboxProps}
        />
        <Label htmlFor={fieldId} className="font-normal cursor-pointer">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
    </FormField>
  )
})
FormFieldCheckbox.displayName = 'FormFieldCheckbox'

/**
 * FormField.Switch - Convenience wrapper for Switch fields
 */
export interface FormFieldSwitchProps extends Omit<FormFieldProps, 'children'> {
  switchProps?: React.ComponentProps<typeof Switch>
}

export const FormFieldSwitch = React.forwardRef<
  React.ElementRef<typeof Switch>,
  FormFieldSwitchProps
>(({ label, error, description, required, className, name, switchProps }, ref) => {
  const fieldId = name || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <FormField
      label={label}
      error={error}
      description={description}
      required={required}
      className={className}
      name={fieldId}
    >
      <div className="flex items-center space-x-2">
        <Switch
          id={fieldId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined
          }
          {...switchProps}
        />
        <Label htmlFor={fieldId} className="font-normal cursor-pointer">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      </div>
    </FormField>
  )
})
FormFieldSwitch.displayName = 'FormFieldSwitch'
