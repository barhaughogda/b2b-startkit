"use client"

import React from 'react'
import { usePatientHeader } from './PatientHeaderProvider'

export function PatientHeaderContent() {
  const { headerContent } = usePatientHeader()

  if (!headerContent) return null

  return (
    <div className="flex items-start justify-between w-full">
      <div className="flex items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {headerContent.title}
          </h1>
          {headerContent.description && (
            <p className="text-sm text-muted-foreground">
              {headerContent.description}
            </p>
          )}
        </div>
      </div>
      {headerContent.actions && (
        <div className="flex items-center gap-2">
          {headerContent.actions}
        </div>
      )}
    </div>
  )
}
