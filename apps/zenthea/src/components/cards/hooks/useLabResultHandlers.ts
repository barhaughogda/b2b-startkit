import { useState, useCallback } from 'react';

interface LabResultHandlers {
  onValueClick: (testName: string) => void;
  onToggleTrends: () => void;
  onCategoryChange: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
  onTimePeriodChange: (period: string) => void;
  onReview: () => void;
  onOrderFollowUp: () => void;
  onNotifyPatient: () => void;
  onPrint: () => void;
  showTrends: boolean;
  searchQuery: string;
  timePeriod: string;
}

interface UseLabResultHandlersProps {
  initialSearchQuery?: string;
  initialTimePeriod?: string;
  onValueClick?: (testName: string) => void;
  onToggleTrends?: () => void;
  onCategoryChange?: (categoryId: string) => void;
  onSearchChange?: (query: string) => void;
  onTimePeriodChange?: (period: string) => void;
  onReview?: () => void;
  onOrderFollowUp?: () => void;
  onNotifyPatient?: () => void;
  onPrint?: () => void;
}

export function useLabResultHandlers({
  initialSearchQuery = '',
  initialTimePeriod = 'past-year',
  onValueClick,
  onToggleTrends,
  onCategoryChange,
  onSearchChange,
  onTimePeriodChange,
  onReview,
  onOrderFollowUp,
  onNotifyPatient,
  onPrint
}: UseLabResultHandlersProps = {}): LabResultHandlers {
  const [showTrends, setShowTrends] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [timePeriod, setTimePeriod] = useState(initialTimePeriod);

  const handleValueClick = useCallback((testName: string) => {
    onValueClick?.(testName);
  }, [onValueClick]);

  const handleToggleTrends = useCallback(() => {
    setShowTrends(prev => !prev);
    onToggleTrends?.();
  }, [onToggleTrends]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    onCategoryChange?.(categoryId);
  }, [onCategoryChange]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
  }, [onSearchChange]);

  const handleTimePeriodChange = useCallback((period: string) => {
    setTimePeriod(period);
    onTimePeriodChange?.(period);
  }, [onTimePeriodChange]);

  const handleReview = useCallback(() => {
    onReview?.();
  }, [onReview]);

  const handleOrderFollowUp = useCallback(() => {
    onOrderFollowUp?.();
  }, [onOrderFollowUp]);

  const handleNotifyPatient = useCallback(() => {
    onNotifyPatient?.();
  }, [onNotifyPatient]);

  const handlePrint = useCallback(() => {
    onPrint?.();
  }, [onPrint]);

  return {
    onValueClick: handleValueClick,
    onToggleTrends: handleToggleTrends,
    onCategoryChange: handleCategoryChange,
    onSearchChange: handleSearchChange,
    onTimePeriodChange: handleTimePeriodChange,
    onReview: handleReview,
    onOrderFollowUp: handleOrderFollowUp,
    onNotifyPatient: handleNotifyPatient,
    onPrint: handlePrint,
    showTrends,
    searchQuery,
    timePeriod
  };
}
