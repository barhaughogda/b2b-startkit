'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface LayerControlPanelProps {
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
  className?: string;
}

// Anatomical layer definitions
const anatomicalLayers = [
  {
    id: 'skeletal',
    name: 'Skeletal System',
    color: '#8B4513',
    description: 'Bone structure and joints'
  },
  {
    id: 'muscular',
    name: 'Muscular System',
    color: '#FF6B6B',
    description: 'Muscle groups and attachments'
  },
  {
    id: 'nervous',
    name: 'Nervous System',
    color: '#4ECDC4',
    description: 'Brain, spinal cord, nerves'
  },
  {
    id: 'circulatory',
    name: 'Circulatory System',
    color: '#FF4757',
    description: 'Heart, blood vessels'
  },
  {
    id: 'digestive',
    name: 'Digestive System',
    color: '#FFA502',
    description: 'GI tract and organs'
  },
  {
    id: 'respiratory',
    name: 'Respiratory System',
    color: '#3742FA',
    description: 'Lungs and airways'
  },
  {
    id: 'endocrine',
    name: 'Endocrine System',
    color: '#A4B0BE',
    description: 'Hormone-producing glands'
  },
  {
    id: 'urinary',
    name: 'Urinary System',
    color: '#2ED573',
    description: 'Kidneys, bladder, tract'
  },
  {
    id: 'reproductive',
    name: 'Reproductive System',
    color: '#FF3838',
    description: 'Reproductive organs'
  },
  {
    id: 'lymphatic',
    name: 'Lymphatic System',
    color: '#70A1FF',
    description: 'Lymph nodes and vessels'
  }
];

export function LayerControlPanel({
  activeLayers,
  onToggleLayer,
  className
}: LayerControlPanelProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Anatomical Layers</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          data-testid="layer-control-panel"
          role="toolbar"
          aria-label="Anatomical layer controls"
          className="space-y-3"
        >
          <div 
            data-testid="layer-list"
            className="space-y-2"
          >
            {anatomicalLayers.map((layer) => {
              const isActive = activeLayers.includes(layer.id);
              
              return (
                <div
                  key={layer.id}
                  data-testid={`layer-item-${layer.id}`}
                  className={cn(
                    "flex items-center space-x-3 p-2 rounded-lg transition-colors hover:bg-gray-50",
                    isActive && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={layer.id}
                    checked={isActive}
                    onCheckedChange={() => onToggleLayer(layer.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    aria-label={`Toggle ${layer.name}`}
                  />
                  
                  <div className="flex items-center space-x-2 flex-1">
                    <div
                      data-testid={`layer-color-indicator-${layer.id}`}
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: layer.color }}
                      aria-hidden="true"
                    />
                    
                    <label
                      htmlFor={layer.id}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {layer.name}
                    </label>
                  </div>
                  
                  {isActive && (
                    <div
                      data-testid={`layer-toggle-active-${layer.id}`}
                      className="w-2 h-2 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
