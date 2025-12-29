'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  User,
  Heart,
  Activity,
  Pill,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Stethoscope
} from 'lucide-react';
import { 
  LabStatus, 
  VitalStatus, 
  AlertSeverity,
  TreatmentStatus
} from '@/components/ui/healthcare-status';

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  date: string;
  provider: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'discontinued' | 'completed';
  provider: string;
  instructions: string;
}

interface Allergy {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  date: string;
  status: 'active' | 'resolved';
}

interface VitalSign {
  id: string;
  type: string;
  value: number;
  unit: string;
  status: 'normal' | 'elevated' | 'low' | 'critical';
  date: string;
  trend: 'up' | 'down' | 'stable';
}

export function HealthRecordsOverview() {
  const [activeTab, setActiveTab] = useState('lab-results');

  // Mock data - in real app, this would come from API
  const labResults: LabResult[] = [
    {
      id: '1',
      testName: 'Hemoglobin',
      value: '14.2',
      unit: 'g/dL',
      referenceRange: '12.0-16.0',
      status: 'normal',
      date: '2024-01-05',
      provider: 'Lab Services'
    },
    {
      id: '2',
      testName: 'Cholesterol',
      value: '220',
      unit: 'mg/dL',
      referenceRange: '<200',
      status: 'abnormal',
      date: '2024-01-05',
      provider: 'Lab Services'
    },
    {
      id: '3',
      testName: 'Blood Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70-100',
      status: 'normal',
      date: '2024-01-05',
      provider: 'Lab Services'
    },
    {
      id: '4',
      testName: 'White Blood Cell Count',
      value: '8.5',
      unit: 'K/μL',
      referenceRange: '4.5-11.0',
      status: 'normal',
      date: '2024-01-05',
      provider: 'Lab Services'
    }
  ];

  const medications: Medication[] = [
    {
      id: '1',
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      startDate: '2023-06-15',
      status: 'active',
      provider: 'Dr. Sarah Johnson',
      instructions: 'Take with food, monitor blood pressure'
    },
    {
      id: '2',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      startDate: '2023-08-20',
      status: 'active',
      provider: 'Dr. Sarah Johnson',
      instructions: 'Take with meals to reduce stomach upset'
    },
    {
      id: '3',
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'Once daily',
      startDate: '2023-09-10',
      status: 'active',
      provider: 'Dr. Sarah Johnson',
      instructions: 'Take in the evening, avoid grapefruit'
    }
  ];

  const allergies: Allergy[] = [
    {
      id: '1',
      allergen: 'Penicillin',
      severity: 'severe',
      reaction: 'Hives, difficulty breathing',
      date: '2020-03-15',
      status: 'active'
    },
    {
      id: '2',
      allergen: 'Shellfish',
      severity: 'moderate',
      reaction: 'Nausea, vomiting',
      date: '2019-07-22',
      status: 'active'
    }
  ];

  const vitalSigns: VitalSign[] = [
    {
      id: '1',
      type: 'Blood Pressure',
      value: 120,
      unit: 'mmHg',
      status: 'normal',
      date: '2024-01-05',
      trend: 'stable'
    },
    {
      id: '2',
      type: 'Heart Rate',
      value: 72,
      unit: 'bpm',
      status: 'normal',
      date: '2024-01-05',
      trend: 'stable'
    },
    {
      id: '3',
      type: 'Temperature',
      value: 98.6,
      unit: '°F',
      status: 'normal',
      date: '2024-01-05',
      trend: 'stable'
    },
    {
      id: '4',
      type: 'Weight',
      value: 165,
      unit: 'lbs',
      status: 'normal',
      date: '2024-01-05',
      trend: 'down'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <TrendingUp className="h-4 w-4 text-[hsl(var(--healthcare-normal))]" />;
      case 'abnormal':
        return <AlertTriangle className="h-4 w-4 text-[hsl(var(--healthcare-abnormal))]" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-[hsl(var(--healthcare-critical))]" />;
      case 'elevated':
        return <TrendingUp className="h-4 w-4 text-[hsl(var(--healthcare-vital-elevated))]" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-[hsl(var(--healthcare-vital-low))]" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-[hsl(var(--healthcare-abnormal))]" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-[hsl(var(--healthcare-normal))]" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Health Records Overview</h2>
          <p className="text-muted-foreground">
            Comprehensive view of your medical information
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lab-results">Lab Results</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
        </TabsList>

        {/* Lab Results Tab */}
        <TabsContent value="lab-results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Lab Results
              </CardTitle>
              <CardDescription>
                Latest laboratory test results and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {labResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{result.testName}</h3>
                      <LabStatus>
                        {result.status}
                      </LabStatus>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Value: <strong>{result.value} {result.unit}</strong></span>
                      <span>Range: {result.referenceRange}</span>
                      <span>{result.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Current Medications
              </CardTitle>
              <CardDescription>
                Your active medications and prescriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {medications.map((medication) => (
                <div key={medication.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{medication.name}</h3>
                      <TreatmentStatus>
                        {medication.status}
                      </TreatmentStatus>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Dosage:</strong> {medication.dosage} - {medication.frequency}</p>
                      <p><strong>Started:</strong> {medication.startDate}</p>
                      <p><strong>Provider:</strong> {medication.provider}</p>
                      <p><strong>Instructions:</strong> {medication.instructions}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allergies Tab */}
        <TabsContent value="allergies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Known Allergies
              </CardTitle>
              <CardDescription>
                Important allergy information for your care team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allergies.map((allergy) => (
                <div key={allergy.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{allergy.allergen}</h3>
                      <AlertSeverity>
                        {allergy.severity}
                      </AlertSeverity>
                      <Badge variant={allergy.status === 'active' ? 'destructive' : 'secondary'}>
                        {allergy.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Reaction:</strong> {allergy.reaction}</p>
                      <p><strong>Date Recorded:</strong> {allergy.date}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vital Signs Tab */}
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Vital Signs
              </CardTitle>
              <CardDescription>
                Your most recent vital signs measurements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {vitalSigns.map((vital) => (
                <div key={vital.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{vital.type}</h3>
                      <VitalStatus>
                        {vital.status}
                      </VitalStatus>
                      {getTrendIcon(vital.trend)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span><strong>{vital.value} {vital.unit}</strong></span>
                      <span>{vital.date}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Trends
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your health records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Download className="h-6 w-6" />
              <span>Download Records</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span>Request Records</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <User className="h-6 w-6" />
              <span>Update Information</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
