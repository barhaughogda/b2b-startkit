import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface ProviderSpecialtiesChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = ['#5FBFAF', '#5F284A', '#E07B7E', '#F2DDC9', '#8B5CF6'];

export function ProviderSpecialtiesChart({ data }: ProviderSpecialtiesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} data-testid="responsive-container">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
