'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { User, Users } from 'lucide-react';

export interface GenderModelSelectorProps {
  currentModel: 'male' | 'female';
  onModelChange: (model: 'male' | 'female') => void;
  className?: string;
}

export function GenderModelSelector({
  currentModel,
  onModelChange,
  className
}: GenderModelSelectorProps) {
  const handleModelClick = (model: 'male' | 'female') => {
    if (model !== currentModel) {
      onModelChange(model);
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Anatomical Model</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          data-testid="gender-model-selector"
          role="radiogroup"
          aria-label="Anatomical model selection"
          className="space-y-3"
        >
          <div 
            data-testid="model-options"
            className="grid grid-cols-1 gap-2"
          >
            <Button
              variant={currentModel === 'male' ? 'default' : 'outline'}
              className={cn(
                "model-button justify-start h-auto p-4",
                currentModel === 'male' && 'active'
              )}
              onClick={() => handleModelClick('male')}
              aria-pressed={currentModel === 'male'}
              role="radio"
              aria-checked={currentModel === 'male'}
            >
              <div className="flex items-center space-x-3">
                <User 
                  data-testid="male-model-icon"
                  className="h-5 w-5" 
                />
                <div className="text-left">
                  <div className="font-medium">Male Model</div>
                  <div className="text-xs text-muted-foreground">
                    Male anatomical model
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant={currentModel === 'female' ? 'default' : 'outline'}
              className={cn(
                "model-button justify-start h-auto p-4",
                currentModel === 'female' && 'active'
              )}
              onClick={() => handleModelClick('female')}
              aria-pressed={currentModel === 'female'}
              role="radio"
              aria-checked={currentModel === 'female'}
            >
              <div className="flex items-center space-x-3">
                <Users 
                  data-testid="female-model-icon"
                  className="h-5 w-5" 
                />
                <div className="text-left">
                  <div className="font-medium">Female Model</div>
                  <div className="text-xs text-muted-foreground">
                    Female anatomical model
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
