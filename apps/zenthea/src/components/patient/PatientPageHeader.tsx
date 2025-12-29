"use client"

import React, { useEffect } from 'react'
import { usePatientHeader } from './PatientHeaderProvider'

interface PatientPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PatientPageHeader({ 
  title, 
  description, 
  actions 
}: PatientPageHeaderProps) {
  const { setHeaderContent } = usePatientHeader()

  useEffect(() => {
    setHeaderContent({ title, description, actions })
    
    // Cleanup when component unmounts
    return () => setHeaderContent(null)
  }, [title, description, actions, setHeaderContent])

  // This component doesn't render anything - it just sets the header content
  return null
}