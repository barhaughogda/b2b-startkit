import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  testId?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  subtitleColor = 'text-muted-foreground',
  testId 
}: MetricCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className={`text-xs ${subtitleColor}`}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
