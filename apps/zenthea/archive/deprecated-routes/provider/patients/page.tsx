'use client';

import React, { useState, useMemo, useCallback } from 'react';

// Convex API with intelligent fallback system
let api: any = null;

// Always use mock API for now - this prevents build-time import issues
// In production, this will be replaced by the actual Convex API
api = {
  patients: {
    listPatients: "patients:listPatients",
    getPatient: "patients:getPatient"
  }
}

// Production safeguard: Ensure we have a valid API structure
if (!api || typeof api !== 'object') {
  console.error("Invalid API structure detected. Using emergency fallback.");
  api = {
    patients: {
      listPatients: "patients:listPatients",
      getPatient: "patients:getPatient"
    }
  };
};

// TODO: Replace with actual Convex API when available
// const convexApi = require('../../convex/_generated/api');
// api = convexApi.api;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Download, 
  Plus, 
  Eye, 
  Phone, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Users,
  Filter,
  X
} from 'lucide-react';
import { Patient } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Mock data for testing
const mockPatients: Patient[] = [
  {
    id: '1',
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily.johnson@example.com',
    phone: '+1-555-0123',
    dateOfBirth: new Date('1990-05-15'),
    address: '123 Main St, City, State 12345',
    emergencyContact: 'John Johnson - +1-555-0124',
    medicalHistory: ['Hypertension'],
    allergies: ['Penicillin'],
    currentMedications: ['Lisinopril 10mg'],
    insuranceProvider: 'Blue Cross Blue Shield',
    insuranceNumber: 'BC123456789',
    preferredLanguage: 'English',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-12-01'),
    status: 'active',
    department: 'Cardiology',
    lastVisit: new Date('2023-11-15'),
    conditions: ['Hypertension', 'High Cholesterol'],
    tenantId: 'demo-tenant'
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@example.com',
    phone: '+1-555-0124',
    dateOfBirth: new Date('1985-08-22'),
    address: '456 Oak Ave, City, State 12345',
    emergencyContact: 'Sarah Chen - +1-555-0125',
    medicalHistory: ['Diabetes Type 2'],
    allergies: ['None'],
    currentMedications: ['Metformin 500mg'],
    insuranceProvider: 'Aetna',
    insuranceNumber: 'AE987654321',
    preferredLanguage: 'English',
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date('2023-11-20'),
    status: 'active',
    department: 'Endocrinology',
    lastVisit: new Date('2023-11-20'),
    conditions: ['Diabetes Type 2'],
    tenantId: 'demo-tenant-2'
  }
];

type SortField = 'firstName' | 'age' | 'department' | 'lastVisit' | 'status';
type SortDirection = 'asc' | 'desc';

export default function PatientListPage() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  // Mock data - in real app, this would come from Convex
  const patients = mockPatients;

  // Filter and search logic
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesSearch = !searchQuery || 
        patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (patient.conditions && patient.conditions.some(condition => 
          condition.toLowerCase().includes(searchQuery.toLowerCase())
        ));

      const matchesDepartment = departmentFilter === 'all' || 
        patient.department === departmentFilter;

      const matchesStatus = statusFilter === 'all' || 
        patient.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [patients, searchQuery, departmentFilter, statusFilter]);

  // Sorting logic
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'firstName':
          aValue = a.firstName;
          bValue = b.firstName;
          break;
        case 'age':
          aValue = new Date().getFullYear() - new Date(a.dateOfBirth).getFullYear();
          bValue = new Date().getFullYear() - new Date(b.dateOfBirth).getFullYear();
          break;
        case 'department':
          aValue = a.department;
          bValue = b.department;
          break;
        case 'lastVisit':
          aValue = a.lastVisit;
          bValue = b.lastVisit;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPatients, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + itemsPerPage);

  // Event handlers
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedPatients(paginatedPatients.map(p => p.id));
    } else {
      setSelectedPatients([]);
    }
  }, [paginatedPatients]);

  const handleSelectPatient = useCallback((patientId: string, checked: boolean) => {
    if (checked) {
      setSelectedPatients(prev => [...prev, patientId]);
    } else {
      setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    const csvContent = [
      ['Name', 'Email', 'ID', 'Age', 'Department', 'Last Visit', 'Status'],
      ...filteredPatients.map(patient => [
        `${patient.firstName} ${patient.lastName}`,
        patient.email || '',
        patient.id,
        new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear(),
        patient.department,
        patient.lastVisit ? format(patient.lastVisit, 'MMM dd, yyyy') : 'N/A',
        patient.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'patients.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredPatients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'discharged': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient List</h1>
          <p className="text-gray-600 mt-1">Manage and view all patient records</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search patients by name, ID, or condition..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search patients by name, ID, or condition"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block" htmlFor="department-filter">Department</label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger id="department-filter" aria-label="Filter by department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                    <SelectItem value="Endocrinology">Endocrinology</SelectItem>
                    <SelectItem value="Neurology">Neurology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block" htmlFor="status-filter">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" aria-label="Filter by status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4" scope="col">
                    <Checkbox
                      checked={selectedPatients.length === paginatedPatients.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('firstName')}
                    scope="col"
                  >
                    <div className="flex items-center gap-2">
                      Patient
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th className="p-4" scope="col">ID</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('age')}
                    scope="col"
                  >
                    <div className="flex items-center gap-2">
                      Age
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('department')}
                    scope="col"
                  >
                    <div className="flex items-center gap-2">
                      Department
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('lastVisit')}
                    scope="col"
                  >
                    <div className="flex items-center gap-2">
                      Last Visit
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('status')}
                    scope="col"
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </th>
                  <th className="p-4" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => (
                  <tr key={patient.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedPatients.includes(patient.id)}
                        onCheckedChange={(checked) => handleSelectPatient(patient.id, checked as boolean)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/avatars/${patient.id}.jpg`} />
                          <AvatarFallback>
                            {patient.firstName[0]}{patient.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                          <div className="text-sm text-muted-foreground">{patient.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{patient.id}</td>
                    <td className="p-4">
                      {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()}
                    </td>
                    <td className="p-4">{patient.department}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {patient.lastVisit ? format(patient.lastVisit, 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(patient.status || 'inactive')}>
                        {patient.status || 'inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No patients found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || departmentFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first patient'
              }
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedPatients.length)} of {sortedPatients.length} patients
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Rows per page:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}