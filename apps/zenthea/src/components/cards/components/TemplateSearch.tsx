import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export interface TemplateSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (query: string) => void;
}

export const TemplateSearch: React.FC<TemplateSearchProps> = ({ 
  searchQuery, 
  onSearchChange, 
  onSearchSubmit 
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    onSearchChange(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
  };

  return (
    <form data-testid="template-search" onSubmit={handleSubmit} className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="text"
        placeholder="Search templates..."
        value={localQuery}
        onChange={handleInputChange}
        className="flex-grow"
        data-testid="template-search-input"
      />
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
      {localQuery && (
        <Button type="button" variant="ghost" size="icon" onClick={handleClear}>
          <span className="sr-only">Clear</span>
          ×
        </Button>
      )}
    </form>
  );
};

export default TemplateSearch;