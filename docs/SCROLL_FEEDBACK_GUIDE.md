# Scroll Feedback Implementation Guide

This guide documents the scroll feedback improvements added to enhance user experience across the application.

## Overview

Users were experiencing confusion because:
1. They didn't know to scroll down after pressing buttons
2. No visual feedback when content was added below the fold
3. Inconsistent card/tile sizes throughout the app

## New Features

### 1. Scroll Utilities (`client/src/lib/scroll-utils.ts`)

A set of utility functions for implementing smooth scrolling behavior:

#### `scrollToElement(elementId, delay?, block?)`
Scrolls to an element by ID with smooth behavior.
```typescript
import { scrollToElement } from "@/lib/scroll-utils";

// Basic usage
scrollToElement('my-element-id');

// With custom delay and alignment
scrollToElement('my-element-id', 200, 'center');
```

#### `scrollToRef(ref, delay?, block?)`
Scrolls to a React ref element.
```typescript
const myRef = useRef<HTMLDivElement>(null);
scrollToRef(myRef, 150, 'start');
```

#### `isElementBelowViewport(elementId)`
Checks if an element is below the current viewport.
```typescript
if (isElementBelowViewport('results-section')) {
  // Show scroll indicator
}
```

#### `scrollToNewContent(elementId, delay?)`
Convenience function for scrolling to newly added content with center alignment.
```typescript
scrollToNewContent('new-item-123');
```

### 2. ScrollIndicator Component (`client/src/components/scroll-indicator.tsx`)

A subtle animated indicator that shows when there's more content below the viewport.

#### Props
- `show: boolean` - Whether to show the indicator
- `message?: string` - Custom message (default: "More below")
- `targetId?: string` - Element ID to scroll to when clicked
- `bottomOffset?: number` - Position from bottom in pixels (default: 100)

#### Usage
```typescript
import { ScrollIndicator } from "@/components/scroll-indicator";

function MyPage() {
  const [showScrollHint, setShowScrollHint] = useState(false);

  return (
    <>
      {/* Your content */}
      <ScrollIndicator 
        show={showScrollHint}
        message="See results below"
        targetId="results-section"
      />
    </>
  );
}
```

### 3. Standardized Card Sizes

New CSS utility classes for consistent card heights:

```css
.card-sm   /* min-height: 100px */
.card-md   /* min-height: 150px */
.card-lg   /* min-height: 200px */
.card-tile /* aspect-ratio: 1 (square) */
```

#### Using with Card Component
The Card component now supports a `size` prop:

```typescript
import { Card } from "@/components/ui/card";

<Card size="md">
  {/* Content */}
</Card>
```

### 4. Highlight Animation

A subtle animation class for newly added items:

```typescript
<div className="highlight-new">
  {/* New content */}
</div>
```

## Implementation Examples

### Example 1: Scroll After Form Submission

```typescript
import { scrollToElement } from "@/lib/scroll-utils";
import { useToast } from "@/hooks/use-toast";

const saveMutation = useMutation({
  mutationFn: async (data) => {
    // Save data
  },
  onSuccess: () => {
    toast({ 
      title: "Saved successfully!",
      description: "Your changes have been saved."
    });
    // Scroll to show the saved content with center alignment for better visibility
    scrollToElement('saved-content', 200, 'center');
  },
});
```

### Example 2: Scroll When Expanding Content

```typescript
import { useRef } from "react";

function MyComponent() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = () => {
    setIsExpanded(true);
    // Scroll to expanded content after it appears
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  return (
    <>
      <Button onClick={handleExpand}>Show More</Button>
      {isExpanded && (
        <div ref={contentRef}>
          {/* Expanded content */}
        </div>
      )}
    </>
  );
}
```

### Example 3: Dimension Selection with Scroll

```typescript
function DimensionSelector() {
  const detailRef = useRef<HTMLDivElement>(null);
  const [selectedDimension, setSelectedDimension] = useState(null);

  const handleSelect = (dimension) => {
    setSelectedDimension(dimension);
    // Scroll to detail view
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }, 100);
  };

  return (
    <>
      {/* Dimension cards */}
      {dimensions.map(d => (
        <Card onClick={() => handleSelect(d)} />
      ))}
      
      {/* Detail view */}
      {selectedDimension && (
        <div ref={detailRef}>
          {/* Details */}
        </div>
      )}
    </>
  );
}
```

## Pages Updated

### ✅ life-blueprint.tsx
- Scrolls to dimension detail when selecting a dimension
- Scrolls to saved content after blueprint update
- Enhanced toast messages with descriptions

### ✅ blueprint.tsx
- Scrolls to questions when "Explore My Foundations" is clicked
- Scrolls to dimension detail when selecting from grid
- Better feedback after saving baseline
- Toast on dimension level update

## Best Practices

### 1. Use Appropriate Delays
- Simple content reveals: 100ms
- After mutations/saves: 150-200ms
- Complex content with animations: 200-300ms

### 2. Choose the Right Block Alignment
- `'start'` - Align element to top of viewport (default)
- `'center'` - Center element in viewport (best for forms/details)
- `'end'` - Align element to bottom
- `'nearest'` - Minimal scroll to bring into view

### 3. Toast Message Guidelines
```typescript
// ✅ Good - Clear and actionable
toast({
  title: "Blueprint saved",
  description: "Your dimension values have been saved successfully."
});

// ❌ Avoid - Too vague
toast({ title: "Saved" });
```

### 4. Refs vs IDs
- Use refs when the element is in the same component
- Use IDs when scrolling across component boundaries
- Always check for null before scrolling

### 5. Consider Mobile UX
- Test scroll behavior on mobile devices
- Ensure adequate spacing around scroll targets
- Use `'center'` alignment for better mobile experience

## Testing Checklist

- [ ] Button reveals content → page scrolls to show it
- [ ] Form submission → scrolls to result with toast
- [ ] Dimension/item selection → scrolls to detail view
- [ ] Cards have consistent sizes within sections
- [ ] Animations are smooth (not jarring)
- [ ] Works on mobile and desktop
- [ ] Scroll indicator appears/disappears correctly
- [ ] Toast messages are clear and helpful

## Future Enhancements

- Auto-detect when content is below fold and show scroll indicator
- Configurable scroll easing functions
- Scroll progress indicator for long forms
- Smart scroll that considers keyboard visibility on mobile
