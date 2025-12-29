'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LabCategory {
  id: string;
  name: string;
  isActive: boolean;
  tests: string[];
}

interface LabResultTabsProps {
  categories: LabCategory[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function LabResultTabs({
  categories,
  activeCategory,
  onCategoryChange
}: LabResultTabsProps) {
  return (
    <div className="mb-4">
      <div className="flex space-x-1 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeCategory === category.id
                ? "border-green-500 text-green-600"
                : "border-transparent text-text-secondary hover:text-text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onCategoryChange(category.id);
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
