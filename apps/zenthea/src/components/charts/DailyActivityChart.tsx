import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DailyActivityChartProps {
  data: Array<{
    date: string;
    appointments: number;
    newPatients: number;
    records: number;
  }>;
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="responsive-container">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="appointments" fill="#5FBFAF" name="Appointments" />
        <Bar dataKey="newPatients" fill="#5F284A" name="New Patients" />
        <Bar dataKey="records" fill="#E07B7E" name="Records" />
      </BarChart>
    </ResponsiveContainer>
  );
}
