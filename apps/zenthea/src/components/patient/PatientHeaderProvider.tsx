"use client"

import React, { createContext, useContext, useState } from 'react'

interface HeaderContent {
  title: string
  description?: string
  actions?: React.ReactNode
}

interface PatientHeaderContextType {
  headerContent: HeaderContent | null
  setHeaderContent: (content: HeaderContent | null) => void
}

const PatientHeaderContext = createContext<PatientHeaderContextType | null>(null)

export function PatientHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<HeaderContent | null>(null)

  return (
    <PatientHeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </PatientHeaderContext.Provider>
  )
}

export function usePatientHeader() {
  const context = useContext(PatientHeaderContext)
  if (!context) {
    throw new Error('usePatientHeader must be used within PatientHeaderProvider')
  }
  return context
}
