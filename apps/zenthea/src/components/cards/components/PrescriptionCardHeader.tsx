'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Pill, 
  User, 
  Stethoscope, 
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { BaseCardProps, CardEventHandlers } from '../types';
import { cn } from '@/lib/utils';

interface PrescriptionCardHeaderProps extends BaseCardProps {
  prescriptionData: {
    id: string;
    patientId: string;
    patientName: string;
    patientDateOfBirth: string;
    medication: {
      name: string;
      genericName: string;
      strength: string;
      form: string;
      ndc: string;
      manufacturer: string;
      drugClass: string;
      controlledSubstance: boolean;
      schedule: string;
    };
    prescription: {
      dosage: string;
      frequency: string;
      quantity: number;
      refills: number;
      daysSupply: number;
      instructions: string;
      indication: string;
      startDate: string;
      endDate: string;
      status: 'active' | 'discontinued' | 'completed' | 'cancelled';
    };
    prescriber: {
      name: string;
      npi: string;
      specialty: string;
      dea: string;
      phone: string;
      email: string;
    };
    pharmacy: {
      name: string;
      address: string;
      phone: string;
      ncpdp: string;
      preferred: boolean;
    };
  };
  handlers?: CardEventHandlers;
}

export const PrescriptionCardHeader: React.FC<PrescriptionCardHeaderProps> = ({
  prescriptionData,
  handlers
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'discontinued':
        return 'destructive';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="prescription-card-header space-y-6">
      {/* Medication Information */}
      <div className="medication-info">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Pill className="h-5 w-5 text-blue-600" />
          Medication Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-medium text-gray-900">{prescriptionData.medication.name}</h4>
              <Badge variant={getStatusVariant(prescriptionData.prescription.status)}>
                {prescriptionData.prescription.status.charAt(0).toUpperCase() + prescriptionData.prescription.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Generic: {prescriptionData.medication.genericName}</p>
            <p className="text-sm text-gray-600">{prescriptionData.medication.strength} {prescriptionData.medication.form}</p>
            <p className="text-sm text-gray-600">{prescriptionData.medication.drugClass}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">NDC: {prescriptionData.medication.ndc}</p>
            <p className="text-sm text-gray-600">Manufacturer: {prescriptionData.medication.manufacturer}</p>
            {prescriptionData.medication.controlledSubstance && (
              <div className="flex items-center gap-2 text-amber-600">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Controlled Substance - Schedule {prescriptionData.medication.schedule}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="patient-info">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-green-600" />
          Patient Information
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/avatars/${prescriptionData.patientId}.jpg`} />
              <AvatarFallback>
                {prescriptionData.patientName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-gray-900">{prescriptionData.patientName}</h4>
              <p className="text-sm text-gray-600">DOB: {prescriptionData.patientDateOfBirth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prescriber Information */}
      <div className="prescriber-info">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-purple-600" />
          Prescriber Information
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/avatars/${prescriptionData.prescriber.name.replace('Dr. ', '').toLowerCase().replace(' ', '-')}.jpg`} />
              <AvatarFallback>
                {prescriptionData.prescriber.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{prescriptionData.prescriber.name}</h4>
              <p className="text-sm text-gray-600">{prescriptionData.prescriber.specialty}</p>
              <p className="text-sm text-gray-500">NPI: {prescriptionData.prescriber.npi}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pharmacy Information */}
      <div className="pharmacy-info">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Pill className="h-5 w-5 text-orange-600" />
          Pharmacy Information
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{prescriptionData.pharmacy.name}</h4>
              <p className="text-sm text-gray-600">{prescriptionData.pharmacy.address}</p>
              <p className="text-sm text-gray-500">Phone: {prescriptionData.pharmacy.phone}</p>
            </div>
            {prescriptionData.pharmacy.preferred && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Preferred
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Details */}
      <div className="prescription-details">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Prescription Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Dosage:</span> {prescriptionData.prescription.dosage} {prescriptionData.prescription.frequency}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Quantity:</span> {prescriptionData.prescription.quantity} tablets • {prescriptionData.prescription.refills} refills remaining
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Days Supply:</span> {prescriptionData.prescription.daysSupply} days
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Start Date:</span> {formatDate(prescriptionData.prescription.startDate)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">End Date:</span> {formatDate(prescriptionData.prescription.endDate)}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Indication:</span> {prescriptionData.prescription.indication}
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Instructions:</span> {prescriptionData.prescription.instructions}
          </p>
        </div>
      </div>
    </div>
  );
};
