'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Calendar, Activity, Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for diagnoses
const mockDiagnoses = [
  {
    id: 'rotator-cuff-1',
    name: 'Rotator cuff injury',
    icdCode: 'ICD-10-CM R03',
    bodyRegion: 'shoulder-right',
    position: { x: 65, y: 25 },
    visits: 44,
    complaint: 'Disturb sleep, arm weakness',
    latestUpdate: '2024-01-22',
    status: 'active',
    severity: 'moderate'
  },
  {
    id: 'knee-injury-1',
    name: 'Knee ligament strain',
    icdCode: 'ICD-10-CM S83.4',
    bodyRegion: 'knee-right',
    position: { x: 55, y: 75 },
    visits: 12,
    complaint: 'Pain during movement, swelling',
    latestUpdate: '2024-01-15',
    status: 'healing',
    severity: 'mild'
  },
  {
    id: 'back-pain-1',
    name: 'Lower back pain',
    icdCode: 'ICD-10-CM M54.5',
    bodyRegion: 'lower-back',
    position: { x: 50, y: 60 },
    visits: 28,
    complaint: 'Chronic pain, limited mobility',
    latestUpdate: '2024-01-10',
    status: 'chronic',
    severity: 'moderate'
  },
  {
    id: 'chest-pain-1',
    name: 'Chest wall pain',
    icdCode: 'ICD-10-CM R07.9',
    bodyRegion: 'chest-left',
    position: { x: 35, y: 35 },
    visits: 8,
    complaint: 'Sharp pain on deep breathing',
    latestUpdate: '2024-01-05',
    status: 'resolved',
    severity: 'mild'
  }
];

const bodySystems = [
  { id: 'muscular', name: 'Muscular', color: 'bg-red-500' },
  { id: 'skeletal', name: 'Skeletal', color: 'bg-gray-500' },
  { id: 'circulatory', name: 'Circulatory', color: 'bg-red-600' },
  { id: 'nervous', name: 'Nervous', color: 'bg-yellow-500' },
  { id: 'digestive', name: 'Digestive', color: 'bg-orange-500' },
  { id: 'respiratory', name: 'Respiratory', color: 'bg-blue-500' },
  { id: 'endocrine', name: 'Endocrine', color: 'bg-purple-500' },
  { id: 'urinary', name: 'Urinary', color: 'bg-cyan-500' },
  { id: 'reproductive', name: 'Reproductive', color: 'bg-pink-500' },
  { id: 'lymphatic', name: 'Lymphatic', color: 'bg-green-500' }
];

interface DiagnosisMarkerProps {
  diagnosis: typeof mockDiagnoses[0];
  isActive: boolean;
  onClick: (diagnosis: typeof mockDiagnoses[0]) => void;
}

function DiagnosisMarker({ diagnosis, isActive, onClick }: DiagnosisMarkerProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'severe': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div
      className={cn(
        'absolute w-6 h-6 rounded-full border-2 border-white cursor-pointer transition-all duration-200 hover:scale-110',
        getSeverityColor(diagnosis.severity),
        isActive && 'ring-4 ring-primary/50 scale-110'
      )}
      style={{
        left: `${diagnosis.position.x}%`,
        top: `${diagnosis.position.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={() => onClick(diagnosis)}
      title={`${diagnosis.name} - ${diagnosis.visits} visits`}
    >
      <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  );
}


interface DiagnosisHistoryBodyMapProps {
  onDiagnosisClick?: (diagnosis: typeof mockDiagnoses[0]) => void;
  className?: string;
}

export function DiagnosisHistoryBodyMap({ 
  onDiagnosisClick, 
  className 
}: DiagnosisHistoryBodyMapProps) {
  const [selectedSystem, setSelectedSystem] = useState('muscular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [isRecentDiagnosesExpanded, setIsRecentDiagnosesExpanded] = useState(false);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [dragRangeStart, setDragRangeStart] = useState(0);

  const filteredDiagnoses = mockDiagnoses.filter(diagnosis => {
    const matchesSearch = diagnosis.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diagnosis.icdCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const diagnosisYear = parseInt(diagnosis.latestUpdate.split('-')[0]);
    
    const matchesYear = selectedYear === null || 
      diagnosis.latestUpdate.includes(selectedYear.toString());
    
    const matchesRange = selectedRange === null || 
      (diagnosisYear >= selectedRange.start && diagnosisYear <= selectedRange.end);
    
    return matchesSearch && matchesYear && matchesRange;
  });

  const handleDiagnosisClick = useCallback((diagnosis: typeof mockDiagnoses[0]) => {
    onDiagnosisClick?.(diagnosis);
  }, [onDiagnosisClick]);


  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search diagnoses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border-none bg-transparent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedYear && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedYear(null)}
            >
              Clear Year Filter
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {/* Timeline Range Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 h-96">
              <div className="text-center">
                <h4 className="font-semibold text-sm text-gray-800 mb-3">Timeline Range</h4>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedRange) {
                        setSelectedRange({
                          start: Math.max(2011, selectedRange.start - 1),
                          end: Math.max(selectedRange.start + 1, selectedRange.end - 1)
                        });
                      }
                    }}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    -
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRange(null)}
                    className="h-6 px-2 text-xs"
                  >
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedRange) {
                        setSelectedRange({
                          start: Math.min(selectedRange.start + 1, selectedRange.end - 1),
                          end: Math.min(2024, selectedRange.end + 1)
                        });
                      }
                    }}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    +
                  </Button>
                </div>
              </div>
              
                     {/* Vertical Timeline Bar */}
                     <div
                       className="relative w-8 h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer mx-auto"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const clickPercent = clickY / rect.height;
                  const clickYear = Math.round(2011 + (clickPercent * 13)); // 2011 to 2024
                  
                  if (!selectedRange) {
                    // Create initial range
                    setSelectedRange({
                      start: Math.max(2011, clickYear - 2),
                      end: Math.min(2024, clickYear + 2)
                    });
                  } else {
                    // Update range based on click
                    const rangeWidth = selectedRange.end - selectedRange.start;
                    setSelectedRange({
                      start: Math.max(2011, clickYear - Math.floor(rangeWidth / 2)),
                      end: Math.min(2024, clickYear + Math.ceil(rangeWidth / 2))
                    });
                  }
                }}
              >
                {/* Background timeline */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-full bg-gray-300 rounded-full" />
                </div>
                
                {/* Year markers */}
                {Array.from({ length: 14 }, (_, i) => 2011 + i).map((year) => {
                  const position = ((year - 2011) / 13) * 100;
                  const hasDiagnoses = mockDiagnoses.some(d => 
                    d.latestUpdate.includes(year.toString())
                  );
                  
                  return (
                    <div
                      key={year}
                      className="absolute left-1/2 transform -translate-x-1/2"
                      style={{ top: `${position}%` }}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        hasDiagnoses ? "bg-green-500" : "bg-gray-400"
                      )} />
                    </div>
                  );
                })}
                
                {/* Selected range highlight */}
                {selectedRange && (
                  <div
                    className="absolute left-0 w-full bg-blue-200 border border-blue-300 rounded"
                    style={{
                      top: `${((selectedRange.start - 2011) / 13) * 100}%`,
                      height: `${((selectedRange.end - selectedRange.start) / 13) * 100}%`
                    }}
                  />
                )}
              </div>
              
              {/* Selected range display */}
              {selectedRange && (
                <div className="text-center">
                  <p className="text-xs text-gray-600">
                    Selected range: {selectedRange.start} - {selectedRange.end} years
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Body Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="relative w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
                {/* Anatomical Body SVG */}
                <svg
                  viewBox="0 0 200 300"
                  className="w-full h-full bg-gradient-to-br from-background-secondary to-background-tertiary"
                >
                  {/* More detailed human body outline */}
                  <g fill="none" stroke="var(--color-border-secondary)" strokeWidth="2">
                    {/* Head */}
                    <ellipse cx="100" cy="25" rx="12" ry="18" />
                    
                    {/* Neck */}
                    <rect x="88" y="43" width="24" height="8" rx="4" />
                    
                    {/* Torso */}
                    <rect x="75" y="51" width="50" height="70" rx="8" />
                    
                    {/* Shoulders */}
                    <ellipse cx="60" cy="60" rx="8" ry="12" />
                    <ellipse cx="140" cy="60" rx="8" ry="12" />
                    
                    {/* Arms */}
                    <rect x="45" y="65" width="18" height="50" rx="9" />
                    <rect x="137" y="65" width="18" height="50" rx="9" />
                    
                    {/* Hands */}
                    <ellipse cx="54" cy="120" rx="6" ry="8" />
                    <ellipse cx="146" cy="120" rx="6" ry="8" />
                    
                    {/* Hips */}
                    <ellipse cx="85" cy="120" rx="8" ry="6" />
                    <ellipse cx="115" cy="120" rx="8" ry="6" />
                    
                    {/* Legs */}
                    <rect x="80" y="126" width="18" height="70" rx="9" />
                    <rect x="102" y="126" width="18" height="70" rx="9" />
                    
                    {/* Feet */}
                    <ellipse cx="89" cy="200" rx="8" ry="6" />
                    <ellipse cx="111" cy="200" rx="8" ry="6" />
                  </g>
                  
                  {/* Body regions with subtle shading for different systems */}
                  <g opacity="0.1">
                    {/* Muscular system highlighting */}
                    <rect x="75" y="51" width="50" height="70" rx="8" fill="var(--color-status-error)" />
                    <rect x="45" y="65" width="18" height="50" rx="9" fill="var(--color-status-error)" />
                    <rect x="137" y="65" width="18" height="50" rx="9" fill="var(--color-status-error)" />
                    <rect x="80" y="126" width="18" height="70" rx="9" fill="var(--color-status-error)" />
                    <rect x="102" y="126" width="18" height="70" rx="9" fill="var(--color-status-error)" />
                  </g>
                  
                  {/* Anatomical landmarks */}
                  <g fill="var(--color-text-tertiary)" opacity="0.6">
                    {/* Joint markers */}
                    <circle cx="60" cy="60" r="2" />
                    <circle cx="140" cy="60" r="2" />
                    <circle cx="54" cy="120" r="2" />
                    <circle cx="146" cy="120" r="2" />
                    <circle cx="89" cy="126" r="2" />
                    <circle cx="111" cy="126" r="2" />
                    <circle cx="89" cy="200" r="2" />
                    <circle cx="111" cy="200" r="2" />
                  </g>
                </svg>

                {/* Diagnosis Markers */}
                {filteredDiagnoses.map((diagnosis) => (
                  <DiagnosisMarker
                    key={diagnosis.id}
                    diagnosis={diagnosis}
                    isActive={false}
                    onClick={handleDiagnosisClick}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Body Systems */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-gray-600">All Systems</h3>
            <div className="space-y-2">
              {bodySystems.map((system) => (
                <Button
                  key={system.id}
                  variant={selectedSystem === system.id ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedSystem(system.id)}
                >
                  <div className={cn("w-3 h-3 rounded-full mr-2", system.color)}></div>
                  {system.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Diagnoses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-gray-600">Recent Diagnoses</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRecentDiagnosesExpanded(!isRecentDiagnosesExpanded)}
              className="h-6 w-6 p-0"
            >
              {isRecentDiagnosesExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectedYear && (
              <Badge variant="outline" className="text-xs">
                Year: {selectedYear}
              </Badge>
            )}
            {selectedRange && (
              <Badge variant="outline" className="text-xs">
                Range: {selectedRange.start}-{selectedRange.end}
              </Badge>
            )}
          </div>
        </div>
        {isRecentDiagnosesExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDiagnoses.map((diagnosis) => (
              <Card
                key={diagnosis.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleDiagnosisClick(diagnosis)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{diagnosis.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {diagnosis.visits} visits
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{diagnosis.icdCode}</p>
                  <p className="text-xs text-gray-500">{diagnosis.latestUpdate}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
