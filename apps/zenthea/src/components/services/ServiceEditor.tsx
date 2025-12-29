'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Loader2, Save } from 'lucide-react';
import type { ServicePricing, PricingMode } from '@/lib/services/pricing';
import type { ServiceIcon } from '@/lib/services/icons';
import { ServiceIconPicker } from './ServiceIconPicker';

/** Service data structure */
export interface ServiceData {
  id?: string;
  name: string;
  duration: number;
  description?: string;
  enabled: boolean;
  allowOnline: boolean;
  pricing?: ServicePricing;
  icon?: ServiceIcon;
}

interface ServiceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceData;
  onSave: (data: ServiceData) => Promise<void>;
  mode: 'create' | 'edit' | 'duplicate';
  tenantCurrency?: string;
  tenantId?: string;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export function ServiceEditor({
  open,
  onOpenChange,
  service,
  onSave,
  mode,
  tenantCurrency = 'USD',
  tenantId,
}: ServiceEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [allowOnline, setAllowOnline] = useState(true);
  
  // Pricing state
  const [pricingMode, setPricingMode] = useState<PricingMode>('hidden');
  const [amountCents, setAmountCents] = useState<number>(0);
  const [minCents, setMinCents] = useState<number>(0);
  const [maxCents, setMaxCents] = useState<number>(0);
  
  // Icon state
  const [icon, setIcon] = useState<ServiceIcon | undefined>(undefined);

  // Reset form when service changes or sheet opens
  useEffect(() => {
    if (open) {
      if (service) {
        setName(mode === 'duplicate' ? `${service.name} (Copy)` : service.name);
        setDuration(service.duration);
        setDescription(service.description || '');
        setEnabled(mode === 'duplicate' ? true : service.enabled);
        setAllowOnline(service.allowOnline);
        setIcon(service.icon);
        
        // Set pricing
        if (service.pricing) {
          setPricingMode(service.pricing.mode);
          setAmountCents(service.pricing.amountCents || 0);
          setMinCents(service.pricing.minCents || 0);
          setMaxCents(service.pricing.maxCents || 0);
        } else {
          setPricingMode('hidden');
          setAmountCents(0);
          setMinCents(0);
          setMaxCents(0);
        }
      } else {
        // Reset for new service
        setName('');
        setDuration(30);
        setDescription('');
        setEnabled(true);
        setAllowOnline(true);
        setPricingMode('hidden');
        setAmountCents(0);
        setMinCents(0);
        setMaxCents(0);
        setIcon(undefined);
      }
    }
  }, [open, service, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      const pricing: ServicePricing = {
        mode: pricingMode,
        currency: tenantCurrency,
        ...(pricingMode === 'fixed' || pricingMode === 'from' ? { amountCents } : {}),
        ...(pricingMode === 'range' ? { minCents, maxCents } : {}),
      };
      
      await onSave({
        id: mode === 'edit' ? service?.id : undefined,
        name: name.trim(),
        duration,
        description: description.trim() || undefined,
        enabled,
        allowOnline,
        pricing: pricingMode !== 'hidden' ? pricing : undefined,
        icon,
      });
      
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Add Service';
      case 'edit': return 'Edit Service';
      case 'duplicate': return 'Duplicate Service';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create': return 'Create a new service that patients can book.';
      case 'edit': return 'Update this service\'s details.';
      case 'duplicate': return 'Create a copy of this service with a new name.';
    }
  };

  // Convert dollars to cents for input
  const dollarsToCents = (dollars: string) => {
    const value = parseFloat(dollars) || 0;
    return Math.round(value * 100);
  };

  // Convert cents to dollars for display
  const centsToDollars = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{getTitle()}</SheetTitle>
            <SheetDescription>{getDescription()}</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <ServiceIconPicker
                value={icon}
                onChange={setIcon}
                tenantId={tenantId}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="service-name">Name *</Label>
              <Input
                id="service-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="General Checkup"
                required
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="service-duration">Duration</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={duration === preset ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDuration(preset)}
                  >
                    {preset} min
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="service-duration"
                  type="number"
                  min={5}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  className="w-24"
                />
                <span className="text-sm text-text-secondary">minutes</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="service-description">Description (optional)</Label>
              <Textarea
                id="service-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this service"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <Label>Pricing</Label>
              <Select value={pricingMode} onValueChange={(v) => setPricingMode(v as PricingMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hidden">Hidden (no price shown)</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="fixed">Fixed price</SelectItem>
                  <SelectItem value="from">From price (starting at)</SelectItem>
                  <SelectItem value="range">Price range</SelectItem>
                </SelectContent>
              </Select>

              {(pricingMode === 'fixed' || pricingMode === 'from') && (
                <div className="space-y-2">
                  <Label htmlFor="price-amount">
                    {pricingMode === 'fixed' ? 'Price' : 'Starting at'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">$</span>
                    <Input
                      id="price-amount"
                      type="number"
                      min={0}
                      step={0.01}
                      value={centsToDollars(amountCents)}
                      onChange={(e) => setAmountCents(dollarsToCents(e.target.value))}
                      className="w-32"
                    />
                  </div>
                </div>
              )}

              {pricingMode === 'range' && (
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price-min">Minimum</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">$</span>
                      <Input
                        id="price-min"
                        type="number"
                        min={0}
                        step={0.01}
                        value={centsToDollars(minCents)}
                        onChange={(e) => setMinCents(dollarsToCents(e.target.value))}
                        className="w-28"
                      />
                    </div>
                  </div>
                  <span className="text-text-tertiary mt-6">–</span>
                  <div className="space-y-2">
                    <Label htmlFor="price-max">Maximum</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">$</span>
                      <Input
                        id="price-max"
                        type="number"
                        min={0}
                        step={0.01}
                        value={centsToDollars(maxCents)}
                        onChange={(e) => setMaxCents(dollarsToCents(e.target.value))}
                        className="w-28"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div>
                  <Label htmlFor="allow-online" className="cursor-pointer">Allow online booking</Label>
                  <p className="text-xs text-text-tertiary">Patients can book this service online</p>
                </div>
                <Switch
                  id="allow-online"
                  checked={allowOnline}
                  onCheckedChange={setAllowOnline}
                />
              </div>

              {mode === 'edit' && (
                <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                  <div>
                    <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
                    <p className="text-xs text-text-tertiary">Service is active and bookable</p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {mode === 'edit' ? 'Save Changes' : 'Create Service'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

