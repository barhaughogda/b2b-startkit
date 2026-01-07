'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';
import { useState } from 'react';
import { config } from '@/lib/config';

export function DemoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  
  if (!config.ui.showDemoBanner || isDismissed) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
      <Info className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-orange-300 text-orange-700">
            DEMO MODE
          </Badge>
          <span className="text-sm font-medium">
            {config.ui.demoBannerText}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="h-6 w-6 p-0 hover:bg-orange-100"
        >
          <X className="h-3 w-3" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
