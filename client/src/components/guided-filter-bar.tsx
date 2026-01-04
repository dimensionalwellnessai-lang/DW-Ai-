import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface GuidedFilterBarProps {
  filters: FilterOption[];
  selectedFilter: string | null;
  onFilterChange: (filterId: string | null) => void;
  showAllOption?: boolean;
  allLabel?: string;
  variant?: "badge" | "button";
  showClearButton?: boolean;
}

export function GuidedFilterBar({
  filters,
  selectedFilter,
  onFilterChange,
  showAllOption = true,
  allLabel = "All",
  variant = "badge",
  showClearButton = false,
}: GuidedFilterBarProps) {
  const handleFilterClick = (filterId: string | null) => {
    if (selectedFilter === filterId) {
      onFilterChange(null);
    } else {
      onFilterChange(filterId);
    }
  };

  const allFilters = showAllOption
    ? [{ id: "__all__", label: allLabel }, ...filters]
    : filters;

  if (variant === "button") {
    return (
      <div className="flex flex-wrap gap-2">
        {allFilters.map((filter) => {
          const isSelected = filter.id === "__all__" 
            ? selectedFilter === null 
            : selectedFilter === filter.id;
          const Icon = (filter as FilterOption).icon;
          return (
            <Button
              key={filter.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterClick(filter.id === "__all__" ? null : filter.id)}
              data-testid={`button-filter-${filter.id}`}
            >
              {Icon && <Icon className="w-3 h-3 mr-1.5" />}
              {filter.label}
            </Button>
          );
        })}
        {showClearButton && selectedFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(null)}
            data-testid="button-clear-filter"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {allFilters.map((filter) => {
          const isSelected = filter.id === "__all__" 
            ? selectedFilter === null 
            : selectedFilter === filter.id;
          const Icon = (filter as FilterOption).icon;
          return (
            <Badge
              key={filter.id}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => handleFilterClick(filter.id === "__all__" ? null : filter.id)}
              data-testid={`badge-filter-${filter.id}`}
            >
              {Icon && <Icon className="w-3 h-3 mr-1" />}
              {filter.label}
            </Badge>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface MultiFilterGroupProps {
  label: string;
  filters: FilterOption[];
  selectedFilter: string;
  onFilterChange: (filterId: string) => void;
}

export function MultiFilterGroup({
  label,
  filters,
  selectedFilter,
  onFilterChange,
}: MultiFilterGroupProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">{label}:</span>
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant={selectedFilter === filter.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.id)}
          data-testid={`button-${label.toLowerCase()}-${filter.id}`}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

interface CollapsibleFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  activeFiltersCount?: number;
}

export function CollapsibleFilters({
  isOpen,
  onToggle,
  children,
  activeFiltersCount = 0,
}: CollapsibleFiltersProps) {
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        data-testid="button-toggle-filters"
      >
        <Filter className="w-3 h-3 mr-1.5" />
        Filters
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-1.5 text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>
      {isOpen && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-md">
          {children}
        </div>
      )}
    </div>
  );
}
