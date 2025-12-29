import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AppointmentTrendsChartProps {
  data: Array<{
    date: string;
    appointments: number;
    completed: number;
  }>;
}

export function AppointmentTrendsChart({ data }: AppointmentTrendsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="responsive-container">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="appointments" 
          stroke="#5FBFAF" 
          strokeWidth={2}
          name="Appointments"
        />
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke="#5F284A" 
          strokeWidth={2}
          name="Completed"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
