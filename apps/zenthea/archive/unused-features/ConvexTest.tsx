'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ConvexTest() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Convex Integration Test</CardTitle>
        <CardDescription>Testing Convex database connectivity</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Convex integration is configured. Database operations will be available once authentication is set up.
        </p>
      </CardContent>
    </Card>
  );
}
