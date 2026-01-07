"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin } from "lucide-react";

// Mock data for appointments
const appointments = [
  {
    id: "1",
    patientName: "John Doe",
    time: "9:00 AM",
    duration: "30 min",
    type: "Follow-up",
    status: "confirmed",
    location: "Room 101"
  },
  {
    id: "2", 
    patientName: "Jane Smith",
    time: "10:30 AM",
    duration: "45 min",
    type: "Consultation",
    status: "confirmed",
    location: "Room 102"
  },
  {
    id: "3",
    patientName: "Bob Johnson",
    time: "2:00 PM",
    duration: "30 min",
    type: "Check-up",
    status: "pending",
    location: "Room 103"
  }
];

// Helper function to get status color
function getStatusColor(status: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-status-success text-white';
    case 'pending':
      return 'bg-status-warning text-white';
    case 'cancelled':
      return 'bg-status-error text-white';
    default:
      return 'bg-status-info text-white';
  }
}

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Appointments</h1>
        <p className="text-text-secondary mt-1">Manage your daily schedule and patient appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{appointment.patientName}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    {appointment.time} • {appointment.duration}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Calendar className="h-4 w-4" />
                  {appointment.type}
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4" />
                  {appointment.location}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline">
                  View Details
                </Button>
                <Button size="sm">
                  Start Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common appointment management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule New Appointment
            </Button>
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Add Patient
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
