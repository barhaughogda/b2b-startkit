import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface RecordsByTypeChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export function RecordsByTypeChart({ data }: RecordsByTypeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="responsive-container">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#F2DDC9" name="Count" />
      </BarChart>
    </ResponsiveContainer>
  );
}
