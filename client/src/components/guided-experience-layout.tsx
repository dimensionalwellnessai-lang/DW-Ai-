import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Clock, Calendar, Check, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { saveCalendarEvent, type WellnessDimension } from "@/lib/guest-storage";

export interface GuidedExperienceItem {
  id: string;
  title: string;
  description: string;
  duration?: number;
  category: string;
  tags?: string[];
  thumbnailUrl?: string;
  reason?: string;
}

export interface GuidedExperienceCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface GuidedExperienceFilter {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface AIPick {
  item: GuidedExperienceItem;
  why: string;
}

interface GuidedExperienceLayoutProps {
  title: string;
  subtitle?: string;
  aiPicks: AIPick[];
  categories: GuidedExperienceCategory[];
  items: GuidedExperienceItem[];
  filters?: GuidedExperienceFilter[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  filterValues?: Record<string, string>;
  onFilterChange?: (filterId: string, value: string) => void;
  onSave: (item: GuidedExperienceItem) => void;
  onStart?: (item: GuidedExperienceItem) => void;
  dimension?: WellnessDimension;
  getCategoryIcon?: (category: string) => LucideIcon;
  getCategoryColor?: (category: string) => string;
}

export function GuidedExperienceLayout({
  title,
  subtitle,
  aiPicks,
  categories,
  items,
  filters,
  selectedCategory,
  onCategoryChange,
  filterValues,
  onFilterChange,
  onSave,
  onStart,
  dimension,
  getCategoryIcon,
  getCategoryColor,
}: GuidedExperienceLayoutProps) {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmCalendarOpen, setConfirmCalendarOpen] = useState(false);
  
  const selectedItem = items.find(i => i.id === selectedItemId) || 
                       aiPicks.find(p => p.item.id === selectedItemId)?.item;

  const filteredItems = selectedCategory 
    ? items.filter(item => item.category === selectedCategory)
    : items;

  const handleItemClick = (item: GuidedExperienceItem) => {
    if (selectedItemId === item.id) {
      setSelectedItemId(null);
    } else {
      setSelectedItemId(item.id);
    }
  };

  const handleSave = () => {
    if (!selectedItem) return;
    onSave(selectedItem);
    toast({
      title: "Saved.",
      description: `"${selectedItem.title}" added to your system.`,
    });
    setSelectedItemId(null);
  };

  const handleAddToCalendar = () => {
    if (!selectedItem) return;
    setConfirmCalendarOpen(true);
  };

  const confirmAddToCalendar = () => {
    if (!selectedItem) return;
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + (selectedItem.duration || 30));
    
    saveCalendarEvent({
      title: selectedItem.title,
      description: selectedItem.description,
      dimension: dimension || null,
      startTime: tomorrow.getTime(),
      endTime: endTime.getTime(),
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: selectedItem.tags || [selectedItem.category],
    });
    
    toast({
      title: "Added to calendar.",
      description: `"${selectedItem.title}" scheduled for tomorrow.`,
    });
    setConfirmCalendarOpen(false);
    setSelectedItemId(null);
  };

  const handleViewDetails = (item: GuidedExperienceItem) => {
    setSelectedItemId(item.id);
    setDetailDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={title} />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}

          {aiPicks.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Picked for You</h2>
              </div>
              <div className="grid gap-3">
                {aiPicks.slice(0, 3).map((pick) => {
                  const isSelected = selectedItemId === pick.item.id;
                  const CategoryIcon = getCategoryIcon?.(pick.item.category);
                  
                  return (
                    <Card 
                      key={pick.item.id}
                      className={`transition-all cursor-pointer ${
                        isSelected 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => handleItemClick(pick.item)}
                      data-testid={`card-ai-pick-${pick.item.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {CategoryIcon && (
                                <CategoryIcon className={`h-4 w-4 ${getCategoryColor?.(pick.item.category) || "text-muted-foreground"}`} />
                              )}
                              <h3 className="font-medium truncate">{pick.item.title}</h3>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {pick.item.description}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {pick.item.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {pick.item.duration} min
                                </span>
                              )}
                              {pick.item.tags?.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-primary mt-2 italic">
                              {pick.why}
                            </p>
                          </div>
                          {pick.item.thumbnailUrl && (
                            <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                              <img 
                                src={pick.item.thumbnailUrl} 
                                alt={pick.item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Categories</h2>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(null)}
                data-testid="button-category-all"
              >
                All
              </Button>
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onCategoryChange(cat.id)}
                    className="gap-1"
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className={`h-4 w-4 ${selectedCategory !== cat.id ? cat.color : ""}`} />
                    {cat.name}
                  </Button>
                );
              })}
            </div>
          </section>

          {filters && filters.length > 0 && onFilterChange && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Filters</h2>
              <div className="flex gap-3 flex-wrap">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{filter.label}:</span>
                    <div className="flex gap-1">
                      {filter.options.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={filterValues?.[filter.id] === opt.value ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onFilterChange(filter.id, opt.value)}
                          data-testid={`button-filter-${filter.id}-${opt.value}`}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              {selectedCategory 
                ? categories.find(c => c.id === selectedCategory)?.name || "Results"
                : "All Options"
              }
            </h2>
            {filteredItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No options found. Try a different category or filter.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredItems.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const CategoryIcon = getCategoryIcon?.(item.category);
                  
                  return (
                    <Card 
                      key={item.id}
                      className={`transition-all cursor-pointer ${
                        isSelected 
                          ? "ring-2 ring-primary bg-primary/5" 
                          : "hover-elevate"
                      }`}
                      onClick={() => handleItemClick(item)}
                      data-testid={`card-item-${item.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {item.thumbnailUrl && (
                            <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                              <img 
                                src={item.thumbnailUrl} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {CategoryIcon && !item.thumbnailUrl && (
                                <CategoryIcon className={`h-4 w-4 ${getCategoryColor?.(item.category) || "text-muted-foreground"}`} />
                              )}
                              <h3 className="font-medium truncate">{item.title}</h3>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {item.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.duration} min
                                </span>
                              )}
                              {item.tags?.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <div className="h-24" />
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedItemId 
              ? `Selected: ${selectedItem?.title}`
              : "Pick 1 option to save."
            }
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedItemId}
              onClick={handleAddToCalendar}
              data-testid="button-add-to-calendar"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Add to Calendar
            </Button>
            <Button
              disabled={!selectedItemId}
              onClick={handleSave}
              data-testid="button-save-selection"
            >
              Save Selection
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmCalendarOpen} onOpenChange={setConfirmCalendarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Calendar</DialogTitle>
            <DialogDescription>
              Would you like to schedule "{selectedItem?.title}" for tomorrow at 9 AM?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmCalendarOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddToCalendar} data-testid="button-confirm-calendar">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <DialogDescription>{selectedItem?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {selectedItem?.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedItem.duration} minutes
                </span>
              )}
              <Badge variant="secondary">{selectedItem?.category}</Badge>
            </div>
            {selectedItem?.tags && selectedItem.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selectedItem.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {onStart && (
              <Button onClick={() => {
                if (selectedItem) {
                  onStart(selectedItem);
                  setDetailDialogOpen(false);
                }
              }} data-testid="button-start">
                Start
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
