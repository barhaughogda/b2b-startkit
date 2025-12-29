import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PrescriptionCardProps } from '../types';
import {
  Pill,
  Clipboard,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Activity,
  Shield,
  Clock,
} from 'lucide-react';

interface PrescriptionInfoTabProps {
  prescriptionData: PrescriptionCardProps['prescriptionData'];
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'severe':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'moderate':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'mild':
      return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
};

const getInteractionSeverityColor = (severity: string) => {
  switch (severity) {
    case 'severe':
      return 'bg-red-100 text-red-800';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800';
    case 'mild':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const PrescriptionInfoTab: React.FC<PrescriptionInfoTabProps> = ({ prescriptionData }) => {
  const { prescription, medication, prescriber, pharmacy, interactions, allergies, monitoring } = prescriptionData;

  return (
    <div className="space-y-6">
      {/* Medication Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <Pill className="h-5 w-5 text-blue-600" />
          <span>Medication Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Medication Name</label>
              <p className="text-sm text-gray-900 font-medium">{medication.name}</p>
              <p className="text-xs text-gray-500">Generic: {medication.genericName}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Strength & Form</label>
              <p className="text-sm text-gray-900">{medication.strength} {medication.form}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Drug Class</label>
              <p className="text-sm text-gray-900">{medication.drugClass}</p>
            </div>
            
            {medication.controlledSubstance && (
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600 font-medium">
                  Controlled Substance - Schedule {medication.schedule}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">NDC Number</label>
              <p className="text-sm text-gray-900 font-mono">{medication.ndc}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Manufacturer</label>
              <p className="text-sm text-gray-900">{medication.manufacturer}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Indication</label>
              <p className="text-sm text-gray-900">{prescription.indication}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <Clipboard className="h-5 w-5 text-blue-600" />
          <span>Prescription Details</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Dosage & Frequency</label>
              <p className="text-sm text-gray-900">{prescription.dosage} {prescription.frequency}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Quantity & Refills</label>
              <p className="text-sm text-gray-900">
                {prescription.quantity} tablets • {prescription.refills} refills remaining
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Days Supply</label>
              <p className="text-sm text-gray-900">{prescription.daysSupply} days</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <p className="text-sm text-gray-900">
                {new Date(prescription.startDate).toLocaleDateString()}
              </p>
            </div>
            
            {prescription.endDate && (
              <div>
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(prescription.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-gray-700">Instructions</label>
              <p className="text-sm text-gray-900">{prescription.instructions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prescriber Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <User className="h-5 w-5 text-green-600" />
          <span>Prescriber Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Prescriber</label>
              <p className="text-sm text-gray-900 font-medium">{prescriber.name}</p>
              <p className="text-xs text-gray-500">{prescriber.specialty}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">NPI Number</label>
              <p className="text-sm text-gray-900 font-mono">{prescriber.npi}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">DEA Number</label>
              <p className="text-sm text-gray-900 font-mono">{prescriber.dea}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Contact</label>
              <p className="text-sm text-gray-900">{prescriber.phone}</p>
              <p className="text-xs text-gray-500">{prescriber.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pharmacy Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <ShieldCheck className="h-5 w-5 text-purple-600" />
          <span>Pharmacy Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Pharmacy</label>
              <p className="text-sm text-gray-900 font-medium">{pharmacy.name}</p>
              {pharmacy.preferred && (
                <Badge className="text-xs bg-green-100 text-green-800">Preferred</Badge>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Address</label>
              <p className="text-sm text-gray-900">{pharmacy.address}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <p className="text-sm text-gray-900">{pharmacy.phone}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">NCPDP ID</label>
              <p className="text-sm text-gray-900 font-mono">{pharmacy.ncpdp}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Drug Interactions */}
      {interactions.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Drug Interactions</span>
          </h3>
          
          <div className="space-y-3">
            {interactions.map((interaction, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  {getSeverityIcon(interaction.severity)}
                  <Badge className={cn("text-xs", getInteractionSeverityColor(interaction.severity))}>
                    {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-900 mb-2">{interaction.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {allergies.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span>Known Allergies</span>
          </h3>
          
          <div className="space-y-2">
            {allergies.map((allergy, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div>
                  <span className="text-sm font-medium text-gray-900">{allergy.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({allergy.reaction})</span>
                </div>
                <Badge className={cn("text-xs", 
                  allergy.severity === 'severe' ? 'bg-red-100 text-red-800' :
                  allergy.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                )}>
                  {allergy.severity}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Requirements */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span>Monitoring Requirements</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Lab Tests</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {monitoring.labTests.map((test, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {test}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Vital Signs</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {monitoring.vitalSigns.map((vital, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {vital}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Symptoms to Watch</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {monitoring.symptoms.map((symptom, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Monitoring Frequency</label>
            <p className="text-sm text-gray-900 mt-1">{monitoring.frequency}</p>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Follow-up</label>
          <p className="text-sm text-gray-900">{monitoring.followUp}</p>
        </div>
      </div>

      {/* Refill History */}
      {prescriptionData.refillHistory && prescriptionData.refillHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span>Refill History</span>
          </h3>
          
          <div className="space-y-2">
            {prescriptionData.refillHistory.map((refill, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(refill.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">{refill.pharmacy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{refill.quantity} tablets</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
