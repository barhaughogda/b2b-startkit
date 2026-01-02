'use client';

import React, { useState } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useParams, useRouter } from 'next/navigation';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { ArrowLeft, User, Phone, Mail, Calendar, FileText, Activity, Heart, AlertTriangle, Plus, Users, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PatientStatus } from '@/components/ui/healthcare-status';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatients, PatientWithComputedFields } from '@/hooks/usePatients';
import { Loader2 } from 'lucide-react';
import { PatientHistoryTimeline } from '@/components/patient/PatientHistoryTimeline';
import { PatientEventHistory } from '@/components/patient/PatientEventHistory';
import { PatientMessagesList } from '@/components/patient/PatientMessagesList';
import { PatientAppointmentsList } from '@/components/patient/PatientAppointmentsList';
import { InteractiveBodyMap } from '@/components/patient/InteractiveBodyMap';
import { PatientCareTeamTab } from '@/components/patient/PatientCareTeamTab';
import { PatientActivityTab } from '@/components/patient/PatientActivityTab';
import { ProviderModalProvider, useProviderPatientModals } from '@/components/provider/ProviderModalSystem';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { Priority, TaskStatus } from '@/components/cards/types';

function PatientProfileContent() {
  const { data: session } = useZentheaSession();
  const params = useParams();
  const router = useRouter();
  const { patients, isLoading, error } = usePatients();
  const { openCreateMessageModal } = useProviderPatientModals();
  const { openCard } = useCardSystem();
  const [activeMedicalTab, setActiveMedicalTab] = useState('timeline');
  
  const patientId = params.patientId as string;
  const patient = patients?.find(p => p.id === patientId);
  
  // Convert dateOfBirth from timestamp (number) to string format (YYYY-MM-DD)
  const patientDateOfBirth = patient?.dateOfBirth 
    ? new Date(patient.dateOfBirth).toISOString().split('T')[0]! 
    : undefined;

  // Handle creating a new appointment - opens AppointmentCard in create mode with patient pre-filled
  const handleCreateAppointment = () => {
    if (!patient) return;

    const baseProps = {
      patientId: patient.id,
      patientName: patient.name,
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment', {
      id: 'new',
      patientId: patient.id,
      patientName: patient.name,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toISOString().split('T')[0]!,
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: new Date(),
    }, baseProps);
  };

  if (isLoading) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading patient profile...</p>
            </div>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  if (error || !patient) {
    return (
      <ClinicLayout showSearch={true}>
        <div className="flex-1 pb-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Patient Not Found</h2>
              <p className="text-muted-foreground mb-4">The requested patient profile could not be found.</p>
              <Button onClick={() => router.push('/company/patients')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patients
              </Button>
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
            <div className="flex items-center gap-4 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/company/patients')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Patients
              </Button>
            </div>
            
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={patient.avatar || undefined} alt={patient.name} />
                <AvatarFallback className="bg-zenthea-teal text-white text-xl">
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-text-primary">{patient.name}</h1>
                <p className="text-text-secondary mt-1">{patient.email}</p>
                <div className="flex items-center gap-4 mt-3">
                  <PatientStatus status={patient.status}>
                    {patient.status}
                  </PatientStatus>
                  <span className="text-sm text-muted-foreground">
                    {patient.age} years old • {patient.gender}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="medical">Medical Records</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="care-team" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Care Team
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <History className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient Information */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                          <p className="text-sm">{patient.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="text-sm">{patient.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="text-sm">{patient.phone}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                          <p className="text-sm">{patient.dateOfBirth || 'Not specified'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Age</label>
                          <p className="text-sm">{patient.age} years old</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Gender</label>
                          <p className="text-sm">{patient.gender}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Last Visit</p>
                            <p className="text-xs text-muted-foreground">{patient.lastVisit || 'No recent visits'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Next Appointment</p>
                            <p className="text-xs text-muted-foreground">{patient.nextAppointment || 'No upcoming appointments'}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions & Stats */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="hover:text-white w-full justify-start" 
                        onClick={handleCreateAppointment}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Appointment
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Medical Records
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Health Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-status-success" />
                          <span className="text-sm">Blood Pressure: Normal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-status-info" />
                          <span className="text-sm">Heart Rate: 72 bpm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-status-warning" />
                          <span className="text-sm">Last Lab: 2 weeks ago</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="medical" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Medical Records</CardTitle>
                  <CardDescription>Patient&apos;s comprehensive medical history and timeline</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Medical Records Navigation */}
                  <div className="flex space-x-1 mb-6">
                    <Button
                      variant={activeMedicalTab === 'timeline' ? 'default' : 'outline'}
                      onClick={() => setActiveMedicalTab('timeline')}
                      className="flex-1"
                    >
                      Timeline
                    </Button>
                    <Button
                      variant={activeMedicalTab === 'event-history' ? 'default' : 'outline'}
                      onClick={() => setActiveMedicalTab('event-history')}
                      className="flex-1"
                    >
                      Event History
                    </Button>
                    <Button
                      variant={activeMedicalTab === 'bodymap-timeline' ? 'default' : 'outline'}
                      onClick={() => setActiveMedicalTab('bodymap-timeline')}
                      className="flex-1"
                    >
                      Bodymap Timeline
                    </Button>
                  </div>

                  {/* Timeline View */}
                  {activeMedicalTab === 'timeline' && (
                    <div className="space-y-6">
                      <PatientHistoryTimeline 
                        patientId={patientId}
                        patientName={patient.name}
                        patientDateOfBirth={patientDateOfBirth}
                      />
                    </div>
                  )}

                  {/* Event History View */}
                  {activeMedicalTab === 'event-history' && (
                    <div data-testid="event-history-view" className="space-y-6">
                      <PatientEventHistory 
                        patientId={patientId}
                        patientName={patient.name}
                        patientDateOfBirth={patientDateOfBirth}
                      />
                    </div>
                  )}

                  {/* Bodymap Timeline View */}
                  {activeMedicalTab === 'bodymap-timeline' && (
                    <div data-testid="bodymap-timeline-view" className="space-y-6">
                      <InteractiveBodyMap 
                        patientId={patientId}
                        onBodyPartClick={(bodyPart) => {
                          console.log('Body part clicked:', bodyPart);
                        }}
                        onDiagnosisClick={(diagnosis) => {
                          console.log('Diagnosis clicked:', diagnosis);
                        }}
                        selectedDiagnoses={[]}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appointments" className="space-y-6">
              <Card>
                <CardHeader className="border-b border-border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Appointments</CardTitle>
                      <CardDescription>Patient&apos;s appointment history and upcoming appointments</CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hover:text-white"
                      onClick={handleCreateAppointment}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Appointment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <PatientAppointmentsList 
                    patientId={patientId}
                    patientName={patient.name}
                    patientDateOfBirth={patientDateOfBirth}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <Card>
                <CardHeader className="border-b border-border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Messages</CardTitle>
                      <CardDescription>Communication history with this patient</CardDescription>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="hover:text-white"
                      onClick={openCreateMessageModal}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Create New Message
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <PatientMessagesList 
                    patientId={patientId}
                    patientName={patient.name}
                    patientDateOfBirth={patientDateOfBirth}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="care-team" className="space-y-6">
              <PatientCareTeamTab
                patientId={patientId}
                tenantId={session?.user?.tenantId || ''}
                canEdit={true}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <PatientActivityTab
                patientId={patientId}
                tenantId={session?.user?.tenantId || ''}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ClinicLayout>
  );
}

export default function PatientProfilePage() {
  return (
    <ProviderModalProvider>
      <PatientProfileContent />
    </ProviderModalProvider>
  );
}

