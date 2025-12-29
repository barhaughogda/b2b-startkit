'use client';

import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseCardComponent } from './BaseCard';
import { BaseCardProps, CardEventHandlers, Document, TeamMember, Tag as CardTag, CardComment } from './types';

// Import extracted components
import { LabResultTabs } from './components/LabResultTabs';
import { LabResultValues } from './components/LabResultValues';
import { LabResultTrends } from './components/LabResultTrends';
import { LabResultDetails } from './components/LabResultDetails';
import { useLabResultHandlers } from './hooks/useLabResultHandlers';
import { renderCareTeam, renderDueDate, renderDocuments, renderNotes, renderActivity } from './components/LabResultTabRenderers';

// FHIR-compliant Lab Result Data Structure
export interface LabResultData {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  
  // Test Information (FHIR DiagnosticReport)
  testName: string;
  testType: 'routine' | 'stat' | 'critical';
  collectionDate: string;
  resultsDate: string;
  status: 'pending' | 'reviewed' | 'critical' | 'flagged';
  
  // Lab Categories and Panels
  labCategories: {
    id: string;
    name: string;
    isActive: boolean;
    tests: string[];
  }[];
  activeCategory: string;
  
  // Search and Filtering
  searchQuery: string;
  timePeriod: 'past-year' | 'past-6-months' | 'past-3-months' | 'past-month';
  
  // Laboratory Information (FHIR Organization)
  laboratoryName: string;
  laboratoryContact: string;
  laboratoryAddress: string;
  labAccreditation: string;
  
  // Ordering Physician (FHIR Practitioner)
  orderingPhysician: string;
  orderingPhysicianSpecialty: string;
  
  // Results Data (FHIR Observation)
  results: {
    testName: string;
    value: number;
    units: string;
    referenceRange: string;
    flag: 'normal' | 'high' | 'low' | 'critical';
    trend: 'improving' | 'worsening' | 'stable';
    interpretation?: string;
  }[];
  
  // Clinical Context
  clinicalNotes: string;
  followUpRequired: boolean;
  followUpRecommendations: string;
  criticalAlerts: string[];
  
  // Trend Data
  trends: {
    testName: string;
    historicalData: {
      date: string;
      value: number;
      flag: string;
    }[];
  }[];
  
  // Actions and Workflow
  canReview: boolean;
  canAddNotes: boolean;
  canOrderFollowUp: boolean;
  canNotifyPatient: boolean;
  canPrint: boolean;
  
  // Universal Card Data
  careTeam?: TeamMember[];
  tags?: CardTag[];
  documents?: Document[];
  comments?: CardComment[];
}

interface LabResultCardProps extends BaseCardProps {
  labData: LabResultData;
}

export function LabResultCard({ 
  labData, 
  handlers,
  activeTab = 'info',
  onTabChange,
  ...props 
}: LabResultCardProps & { handlers: CardEventHandlers; activeTab?: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity'; onTabChange?: (tab: 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity') => void }) {
  const [activeCategory, setActiveCategory] = useState(labData.activeCategory || 'basic-metabolic');

  // Use the extracted handlers hook
  const {
    onValueClick,
    onToggleTrends,
    onCategoryChange,
    onSearchChange,
    showTrends,
    searchQuery,
    timePeriod
  } = useLabResultHandlers({
    initialSearchQuery: labData.searchQuery,
    initialTimePeriod: labData.timePeriod,
    onValueClick: handlers.onValueClick,
    onCategoryChange: (categoryId) => {
      setActiveCategory(categoryId);
      handlers.onCategoryChange?.(categoryId);
    },
    onSearchChange: handlers.onSearchChange,
    onToggleTrends: handlers.onToggleTrends,
    onReview: handlers.onReview,
    onOrderFollowUp: handlers.onOrderFollowUp,
    onNotifyPatient: handlers.onNotifyPatient,
    onPrint: handlers.onPrint
  });

  // Filter results based on active category
  const getFilteredResults = () => {
    const activeCategoryData = labData.labCategories.find(cat => cat.id === activeCategory);
    if (!activeCategoryData) return labData.results;
    
    return labData.results.filter(result => 
      activeCategoryData.tests.some(testName => 
        result.testName.toLowerCase().includes(testName.toLowerCase()) ||
        testName.toLowerCase().includes(result.testName.toLowerCase())
      )
    );
  };

  const filteredResults = getFilteredResults();


  // Enhanced Lab Results Display
  const renderEnhancedLabResults = () => (
    <div className="p-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 border border-border-primary rounded-md text-sm bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-zenthea-teal"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => e.stopPropagation()}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lab Categories Tabs */}
      <LabResultTabs
        categories={labData.labCategories}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />

      {/* Lab Results Values */}
      <LabResultValues
        results={filteredResults}
        trends={labData.trends}
        resultsDate={labData.resultsDate}
        onValueClick={onValueClick}
      />
    </div>
  );

  const renderInfo = () => (
    <div className="p-4">
      {/* Use enhanced lab results display */}
      {renderEnhancedLabResults()}
      
      <div className="space-y-4 mt-6">
        {/* Lab Result Details */}
        <LabResultDetails
          testName={labData.testName}
          testType={labData.testType}
          status={labData.status}
          collectionDate={labData.collectionDate}
          resultsDate={labData.resultsDate}
          labInfo={{
            laboratoryName: labData.laboratoryName,
            laboratoryContact: labData.laboratoryContact,
            laboratoryAddress: labData.laboratoryAddress,
            labAccreditation: labData.labAccreditation,
            orderingPhysician: labData.orderingPhysician,
            orderingPhysicianSpecialty: labData.orderingPhysicianSpecialty
          }}
          clinicalNotes={labData.clinicalNotes}
          followUpRequired={labData.followUpRequired}
          followUpRecommendations={labData.followUpRecommendations}
          criticalAlerts={labData.criticalAlerts}
          canReview={labData.canReview}
          canOrderFollowUp={labData.canOrderFollowUp}
          canNotifyPatient={labData.canNotifyPatient}
          canPrint={labData.canPrint}
        />

        {/* Trends Toggle and Visualization */}
        <LabResultTrends
          trends={labData.trends}
          showTrends={showTrends}
          onToggleTrends={onToggleTrends}
        />
      </div>
    </div>
  );

  // State for notes
  const [clinicalNotes, setClinicalNotes] = useState(labData.clinicalNotes || '');

  // Main Content Renderer
  const renderContent = () => (
    <div className="space-y-0">
      {/* Tab Content */}
      {activeTab === 'info' && renderInfo()}
      {activeTab === 'members' && renderCareTeam({ labData })}
      {activeTab === 'dueDate' && renderDueDate()}
      {activeTab === 'attachments' && renderDocuments({ labData })}
      {activeTab === 'notes' && renderNotes({ clinicalNotes, onNotesChange: setClinicalNotes })}
      {activeTab === 'activity' && renderActivity()}
    </div>
  );

  return (
    <BaseCardComponent 
      {...props} 
      activeTab={activeTab}
      onTabChange={onTabChange}
      handlers={handlers || {} as CardEventHandlers}
    >
      {renderContent()}
    </BaseCardComponent>
  );
}
