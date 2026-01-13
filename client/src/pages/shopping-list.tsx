import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Check, 
  Loader2,
  ChevronRight,
  Sparkles,
  Apple,
  Drumstick,
  Milk,
  Wheat,
  Cookie,
  Snowflake,
  Coffee,
  MoreHorizontal
} from "lucide-react";
import type { ShoppingList, ShoppingListItem, MealPlan } from "@shared/schema";
import {
  getGroceryLists,
  createGroceryList,
  addItemToGroceryList,
  toggleGroceryItemChecked,
  removeGroceryItem,
  deleteGroceryList,
  type GroceryList,
  type GroceryItem,
} from "@/lib/guest-storage";

type ShoppingListWithItems = ShoppingList & { items: ShoppingListItem[] };

interface LocalShoppingList {
  id: string;
  title: string;
  status: string;
  items: LocalShoppingItem[];
}

interface LocalShoppingItem {
  id: string;
  ingredient: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  isChecked: boolean;
  notes: string | null;
}

const CATEGORY_ICONS: Record<string, typeof Apple> = {
  produce: Apple,
  protein: Drumstick,
  dairy: Milk,
  grains: Wheat,
  pantry: Cookie,
  frozen: Snowflake,
  beverages: Coffee,
  other: MoreHorizontal,
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  protein: "Protein",
  dairy: "Dairy",
  grains: "Grains & Bread",
  pantry: "Pantry",
  frozen: "Frozen",
  beverages: "Beverages",
  other: "Other",
};

function convertGroceryListToLocal(list: GroceryList): LocalShoppingList {
  return {
    id: list.id,
    title: list.name,
    status: list.isActive ? "active" : "completed",
    items: list.items.map((item: GroceryItem) => ({
      id: item.id,
      ingredient: item.name,
      quantity: item.amount || null,
      unit: item.unit || null,
      category: item.category || null,
      isChecked: item.isChecked,
      notes: item.notes || null,
    })),
  };
}

export default function ShoppingListPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: userLoading } = useUserRole();
  
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [localLists, setLocalLists] = useState<LocalShoppingList[]>([]);
  const [localListsLoading, setLocalListsLoading] = useState(true);
  
  const loadLocalLists = useCallback(() => {
    const groceryLists = getGroceryLists();
    const converted = groceryLists.map(convertGroceryListToLocal);
    setLocalLists(converted);
    setLocalListsLoading(false);
  }, []);
  
  useEffect(() => {
    if (!isAuthenticated && !userLoading) {
      loadLocalLists();
    }
  }, [isAuthenticated, userLoading, loadLocalLists]);

  const { data: lists = [], isLoading: listsLoading } = useQuery<ShoppingList[]>({
    queryKey: ["/api/shopping-lists"],
    enabled: isAuthenticated,
  });

  const { data: mealPlans = [], isLoading: plansLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
    enabled: isAuthenticated,
  });

  const { data: selectedList, isLoading: listLoading } = useQuery<ShoppingListWithItems>({
    queryKey: ["/api/shopping-lists", selectedListId],
    enabled: isAuthenticated && !!selectedListId,
  });
  
  const localSelectedList = !isAuthenticated && selectedListId 
    ? localLists.find(l => l.id === selectedListId) || null 
    : null;

  const createListMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!isAuthenticated) {
        const newList = createGroceryList(title);
        return convertGroceryListToLocal(newList);
      }
      const res = await apiRequest("POST", "/api/shopping-lists", { title });
      return res.json();
    },
    onSuccess: (newList) => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      } else {
        loadLocalLists();
      }
      setSelectedListId(newList.id);
      toast({ title: "List created", description: "Your new shopping list is ready." });
    },
  });

  const generateFromPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", `/api/shopping-lists/generate-from-plan/${planId}`);
      return res.json();
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      setSelectedListId(newList.id);
      setShowGenerateDialog(false);
      toast({ 
        title: "Shopping list generated", 
        description: `Added ${newList.items.length} items from your meal plan.` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not generate shopping list.", variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ listId, ingredient }: { listId: string; ingredient: string }) => {
      if (!isAuthenticated) {
        const item = addItemToGroceryList(listId, {
          name: ingredient,
          amount: "",
          unit: "",
          category: "other",
          isChecked: false,
          isInPantry: false,
          sourceRecipeIds: [],
          sourceMealPlanIds: [],
          notes: "",
        });
        return item;
      }
      const res = await apiRequest("POST", `/api/shopping-lists/${listId}/items`, { ingredient });
      return res.json();
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", selectedListId] });
      } else {
        loadLocalLists();
      }
      setNewItemText("");
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ listId, itemId, isChecked }: { listId: string; itemId: string; isChecked: boolean }) => {
      if (!isAuthenticated) {
        toggleGroceryItemChecked(listId, itemId);
        return { isChecked };
      }
      const res = await apiRequest("PATCH", `/api/shopping-lists/${listId}/items/${itemId}`, { isChecked });
      return res.json();
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", selectedListId] });
      } else {
        loadLocalLists();
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ listId, itemId }: { listId: string; itemId: string }) => {
      if (!isAuthenticated) {
        removeGroceryItem(listId, itemId);
        return;
      }
      await apiRequest("DELETE", `/api/shopping-lists/${listId}/items/${itemId}`);
    },
    onSuccess: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists", selectedListId] });
      } else {
        loadLocalLists();
      }
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!isAuthenticated) {
        deleteGroceryList(listId);
        return;
      }
      await apiRequest("DELETE", `/api/shopping-lists/${listId}`);
    },
    onSuccess: () => {
      setSelectedListId(null);
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ["/api/shopping-lists"] });
      } else {
        loadLocalLists();
      }
      toast({ title: "List deleted" });
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !selectedListId) return;
    addItemMutation.mutate({ listId: selectedListId, ingredient: newItemText.trim() });
  };

  const displayLists = isAuthenticated ? lists : localLists;
  const displaySelectedList = isAuthenticated ? selectedList : localSelectedList;
  const isListsLoading = isAuthenticated ? listsLoading : localListsLoading;
  const isListLoading = isAuthenticated ? listLoading : false;

  const groupedItems = displaySelectedList?.items.reduce((acc, item) => {
    const category = item.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, (ShoppingListItem | LocalShoppingItem)[]>) || {};

  const completedCount = displaySelectedList?.items.filter(i => i.isChecked).length || 0;
  const totalCount = displaySelectedList?.items.length || 0;

  if (userLoading || isListsLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Shopping Lists" />
      
      <div className="flex-1 overflow-hidden flex">
        <aside className="w-64 border-r p-4 flex flex-col gap-3">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => createListMutation.mutate("New Shopping List")}
            disabled={createListMutation.isPending}
            data-testid="button-create-list"
          >
            {createListMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New List
          </Button>
          
          {isAuthenticated && (
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => setShowGenerateDialog(true)}
              data-testid="button-generate-from-plan"
            >
              <Sparkles className="w-4 h-4" />
              From Meal Plan
            </Button>
          )}
          
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {displayLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover-elevate ${
                    selectedListId === list.id 
                      ? "bg-accent text-accent-foreground" 
                      : ""
                  }`}
                  data-testid={`button-select-list-${list.id}`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="truncate flex-1">{list.title}</span>
                    {list.status === "completed" && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                </button>
              ))}
              
              {displayLists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No shopping lists yet
                </p>
              )}
            </div>
          </ScrollArea>
        </aside>
        
        <main className="flex-1 overflow-auto p-6">
          {!selectedListId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-sm">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground" />
                <h2 className="text-lg font-medium">Select or create a list</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a shopping list from the sidebar, or create a new one to get started.
                </p>
              </div>
            </div>
          ) : isListLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : displaySelectedList ? (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-semibold">{displaySelectedList.title}</h1>
                  {totalCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {completedCount} of {totalCount} items checked
                    </p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  data-testid="button-delete-list"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              
              <form onSubmit={handleAddItem} className="flex gap-2">
                <Input
                  placeholder="Add an item..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="flex-1"
                  data-testid="input-add-item"
                />
                <Button 
                  type="submit" 
                  disabled={!newItemText.trim() || addItemMutation.isPending}
                  data-testid="button-add-item"
                >
                  {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </form>
              
              {Object.keys(groupedItems).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Your list is empty. Add items above{isAuthenticated ? " or generate from a meal plan" : ""}.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedItems).map(([category, items]) => {
                    const Icon = CATEGORY_ICONS[category] || MoreHorizontal;
                    return (
                      <Card key={category}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {CATEGORY_LABELS[category] || category}
                            <Badge variant="secondary" className="ml-auto">
                              {items.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 space-y-1">
                          {items.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center gap-3 py-2 hover-elevate rounded-md px-2 -mx-2 group"
                              data-testid={`shopping-item-${item.id}`}
                            >
                              <Checkbox
                                checked={item.isChecked || false}
                                onCheckedChange={(checked) => {
                                  toggleItemMutation.mutate({
                                    listId: selectedListId,
                                    itemId: item.id,
                                    isChecked: !!checked,
                                  });
                                }}
                                data-testid={`checkbox-item-${item.id}`}
                              />
                              <span className={`flex-1 text-sm ${item.isChecked ? "line-through text-muted-foreground" : ""}`}>
                                {item.ingredient}
                                {item.quantity && ` (${item.quantity}${item.unit ? ` ${item.unit}` : ""})`}
                              </span>
                              {item.notes && (
                                <span className="text-xs text-muted-foreground">{item.notes}</span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-7 w-7"
                                onClick={() => deleteItemMutation.mutate({ listId: selectedListId, itemId: item.id })}
                                data-testid={`button-delete-item-${item.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
      
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate from Meal Plan</DialogTitle>
            <DialogDescription>
              Select a meal plan to automatically create a shopping list with all the ingredients you need.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-64 overflow-auto">
            {plansLoading ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : mealPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No meal plans found. Create a meal plan first.
              </p>
            ) : (
              mealPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => generateFromPlanMutation.mutate(plan.id)}
                  disabled={generateFromPlanMutation.isPending}
                  className="w-full text-left p-3 rounded-md border hover-elevate flex items-center gap-3"
                  data-testid={`button-generate-from-${plan.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{plan.title}</p>
                    {plan.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{plan.summary}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shopping List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this shopping list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Keep List
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedListId) {
                  deleteListMutation.mutate(selectedListId);
                }
                setShowDeleteConfirm(false);
              }}
              disabled={deleteListMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteListMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
