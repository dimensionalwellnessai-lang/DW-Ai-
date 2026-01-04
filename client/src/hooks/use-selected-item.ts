import { useEffect, useRef, useState } from "react";
import { useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface UseSelectedItemOptions {
  onNotFound?: () => void;
}

export function useSelectedItem<T extends { id: string }>(
  items: T[] | undefined,
  options: UseSelectedItemOptions = {}
) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const selectedId = params.get("selected");
  const { toast } = useToast();
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const selectedItem = items?.find(item => item.id === selectedId) || null;
  const isItemMissing = selectedId && items && !selectedItem;

  useEffect(() => {
    if (isItemMissing && !hasScrolled) {
      toast({
        title: "Item not found",
        description: "That item may have been moved or deleted.",
        variant: "destructive",
      });
      options.onNotFound?.();
      setHasScrolled(true);
    }
  }, [isItemMissing, hasScrolled, toast, options]);

  useEffect(() => {
    if (selectedItem && highlightedRef.current && !hasScrolled) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setHasScrolled(true);
    }
  }, [selectedItem, hasScrolled]);

  const isHighlighted = (itemId: string) => itemId === selectedId;

  const getHighlightProps = (itemId: string) => ({
    ref: itemId === selectedId ? highlightedRef : undefined,
    className: itemId === selectedId ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
  });

  return {
    selectedId,
    selectedItem,
    isItemMissing,
    isHighlighted,
    getHighlightProps,
    highlightedRef,
  };
}
