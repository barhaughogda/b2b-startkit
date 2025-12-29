import { useCallback, useState, useMemo, useEffect } from 'react';

export type TabName = 'info' | 'members' | 'tags' | 'dueDate' | 'attachments' | 'notes' | 'activity';

export interface TabState {
  activeTab: TabName;
}

export interface TabConfig {
  name: TabName;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const defaultTabConfigs: TabConfig[] = [
  { name: 'info', label: 'Info' },
  { name: 'members', label: 'Members' },
  { name: 'tags', label: 'Tags' },
  { name: 'dueDate', label: 'Due Date' },
  { name: 'attachments', label: 'Attachments' },
  { name: 'notes', label: 'Notes' },
  { name: 'activity', label: 'Activity' }
];

export class CardTabManager {
  private tabState: TabState;
  private setTabState: (state: TabState) => void;
  private onTabChange?: (tab: TabName) => void;

  constructor(
    tabState: TabState,
    setTabState: (state: TabState) => void,
    onTabChange?: (tab: TabName) => void
  ) {
    this.tabState = tabState;
    this.setTabState = setTabState;
    this.onTabChange = onTabChange;
  }

  handleTabChange = (tab: TabName) => {
    this.setTabState({ activeTab: tab });
    this.onTabChange?.(tab);
  };

  isActiveTab = (tab: TabName) => {
    return this.tabState.activeTab === tab;
  };

  getActiveTab = () => {
    return this.tabState.activeTab;
  };

  // Get tab configuration for rendering
  getTabConfigs = (tabs: TabConfig[] = defaultTabConfigs) => {
    return tabs.map(tab => ({
      ...tab,
      isActive: this.isActiveTab(tab.name)
    }));
  };
}

// Hook for using the tab manager
export const useCardTabs = (
  initialTab: TabName = 'info',
  onTabChange?: (tab: TabName) => void
) => {
  const [tabState, setTabState] = useState<TabState>({
    activeTab: initialTab
  });

  // Sync internal state with external prop changes
  useEffect(() => {
    if (initialTab !== tabState.activeTab) {
      setTabState({ activeTab: initialTab });
    }
  }, [initialTab, tabState.activeTab]);

  const tabManager = useMemo(
    () => new CardTabManager(tabState, setTabState, onTabChange),
    [tabState, onTabChange]
  );

  return {
    tabState,
    tabManager,
    setTabState
  };
};
