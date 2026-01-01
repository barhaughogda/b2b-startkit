'use client';

import React, { useState, useMemo } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { User, Phone, Mail, Calendar, MoreHorizontal, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTable, Column, FilterOption } from '@/components/ui/data-table';
import { usePatients, PatientWithComputedFields } from '@/hooks/usePatients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PatientsPage() {
  const { data: session } = useZentheaSession();
  const router = useRouter();
  const { patients, isLoading, error } = usePatients();
  const [patientFilter, setPatientFilter] = useState<'all' | 'my-primary'>('all');
  
  const currentUserId = session?.user?.id;
  
  // Filter patients based on selected tab
  const filteredPatients = useMemo(() => {
    if (patientFilter === 'all') {
      return patients;
    }
    
    if (patientFilter === 'my-primary' && currentUserId) {
      return patients.filter((p: PatientWithComputedFields) => p.primaryProviderId === currentUserId);
    }
    
    return patients;
  }, [patients, patientFilter, currentUserId]);

  const myPrimaryCount = useMemo(() => {
    if (!currentUserId) return 0;
    return patients.filter((p: PatientWithComputedFields) => p.primaryProviderId === currentUserId).length;
  }, [patients, currentUserId]);

  // Define table columns
  const columns: Column<PatientWithComputedFields>[] = [
    {
      key: 'name',
      label: 'Patient',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={row.avatar || undefined} alt={row.name} />
            <AvatarFallback className="bg-zenthea-teal text-white">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-sm text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
    },
    {
      key: 'age',
      label: 'Age',
      sortable: true,
      render: (value, row) => (
        <div>
          <div>{row.age}</div>
          <div className="text-sm text-muted-foreground">{row.gender}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <Badge 
          variant={value === 'Active' ? 'default' : 'secondary'}
          className={value === 'Active' 
            ? 'bg-status-success/10 text-status-success border-status-success/20' 
            : 'bg-status-warning/10 text-status-warning border-status-warning/20'
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'lastVisit',
      label: 'Last Visit',
      sortable: true,
    },
    {
      key: 'nextAppointment',
      label: 'Next Appointment',
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value ? value : <span className="text-muted-foreground">Not scheduled</span>}
        </div>
      ),
    },
    {
      key: 'actions' as keyof PatientWithComputedFields,
      label: 'Actions',
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/company/patients/${row.id}`)}>
              View Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Define filter options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'gender',
      label: 'Gender',
      type: 'select',
      options: [
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
      ],
    },
    {
      key: 'lastVisit',
      label: 'Last Visit Date',
      type: 'date-range',
    },
  ];

  const handleRowClick = (patient: PatientWithComputedFields) => {
    router.push(`/company/patients/${patient.id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64" role="status" aria-live="polite" aria-busy="true">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading patients...</span>
              </div>
            </div>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-status-error mb-2">Error Loading Patients</h2>
              <p className="text-muted-foreground">Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-text-primary">Patients</h1>
                <p className="text-text-secondary mt-1">Manage your patient records and information</p>
              </div>
              
              {/* Patient Filter Tabs */}
              <Tabs value={patientFilter} onValueChange={(v) => setPatientFilter(v as 'all' | 'my-primary')}>
                <TabsList>
                  <TabsTrigger value="all">
                    All Patients
                    <Badge variant="secondary" className="ml-2">
                      {patients.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="my-primary" className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    My Primary Patients
                    <Badge variant="secondary" className="ml-2">
                      {myPrimaryCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            data={filteredPatients}
            columns={columns}
            searchKeys={['name', 'email', 'phone']}
            filterOptions={filterOptions}
            onRowClick={handleRowClick}
            searchPlaceholder="Search patients..."
            entityLabel="patients"
          />
        </div>
      </div>
    </ClinicLayout>
  );
}

