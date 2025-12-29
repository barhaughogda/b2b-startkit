'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Calendar,
} from 'lucide-react';
import { getLucideIcon, type ServiceIcon } from '@/lib/services/icons';
import { formatServicePrice, type ServicePricing } from '@/lib/services/pricing';

export interface ServiceCardData {
  id: string;
  name: string;
  duration: number;
  description?: string;
  enabled: boolean;
  allowOnline: boolean;
  pricing?: ServicePricing;
  price?: number; // Legacy field
  icon?: ServiceIcon;
}

interface ServiceCardProps {
  service: ServiceCardData;
  tenantCurrency?: string;
  onEdit: (service: ServiceCardData) => void;
  onDuplicate: (service: ServiceCardData) => void;
  onDelete: (serviceId: string) => void;
  onToggleEnabled: (serviceId: string, enabled: boolean) => void;
}

export function ServiceCard({
  service,
  tenantCurrency = 'USD',
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
}: ServiceCardProps) {
  // Render icon
  const renderIcon = () => {
    if (!service.icon) {
      return <Calendar className="h-5 w-5 text-text-tertiary" />;
    }

    if (service.icon.kind === 'lucide') {
      const IconComponent = getLucideIcon(service.icon.name);
      if (IconComponent) {
        return <IconComponent className="h-5 w-5 text-zenthea-teal" />;
      }
    }

    if (service.icon.kind === 'customSvg') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.icon.url}
          alt=""
          className="h-5 w-5 object-contain"
        />
      );
    }

    return <Calendar className="h-5 w-5 text-text-tertiary" />;
  };

  // Format price for display
  const priceDisplay = formatServicePrice(
    service.pricing,
    service.price,
    tenantCurrency
  );

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border border-border-primary transition-colors ${
        service.enabled
          ? 'bg-surface-primary'
          : 'bg-surface-secondary opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="p-2 bg-zenthea-teal/10 rounded-lg flex-shrink-0">
          {renderIcon()}
        </div>

        {/* Content */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-text-primary truncate">
              {service.name}
            </h4>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {service.duration} min
            </Badge>
            {priceDisplay && (
              <Badge
                variant="secondary"
                className="text-xs flex-shrink-0 bg-zenthea-teal/10 text-zenthea-teal border-zenthea-teal/20"
              >
                {priceDisplay}
              </Badge>
            )}
            {!service.allowOnline && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                Phone only
              </Badge>
            )}
          </div>
          {service.description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-1">
              {service.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <Switch
          checked={service.enabled}
          onCheckedChange={(checked) => onToggleEnabled(service.id, checked)}
          aria-label={service.enabled ? 'Disable service' : 'Enable service'}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(service)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(service)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(service.id)}
              className="text-status-error focus:text-status-error"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

