# Visual Hierarchy & Content Organization Guide

This guide explains how to organize cards and content by importance/relevance to help users navigate and comprehend the interface more easily.

## Overview

Good visual hierarchy helps users:
- **Prioritize** what needs attention first
- **Navigate** to important content quickly
- **Comprehend** relationships between items
- **Focus** on what matters most in the moment

## Priority System

### Card Priority Prop

The Card component now supports a `priority` prop to visually indicate importance:

```tsx
import { Card } from "@/components/ui/card";

// High priority - emphasized with border and shadow
<Card priority="high">
  {/* Most important content */}
</Card>

// Medium priority - standard appearance (default)
<Card priority="medium">
  {/* Normal content */}
</Card>

// Low priority - subtle with reduced opacity
<Card priority="low">
  {/* Less important content */}
</Card>
```

### Visual Indicators

**High Priority Cards:**
- Thicker border (2px) in primary color
- Enhanced shadow for depth
- Subtle glow effect in dark mode
- Draws immediate attention

**Medium Priority Cards:**
- Standard border and shadow
- Default appearance
- Most common use case

**Low Priority Cards:**
- Reduced opacity (85%)
- Lighter border color
- Increases opacity on hover
- De-emphasizes secondary content

## CSS Classes

You can also apply priority classes directly:

```tsx
<div className="card-priority-high">High priority content</div>
<div className="card-priority-medium">Normal content</div>
<div className="card-priority-low">Low priority content</div>
```

### Priority Badge

For numerical or icon-based importance indicators:

```tsx
<div className="relative">
  <Card>
    <span className="priority-badge">1</span>
    {/* Card content */}
  </Card>
</div>
```

## Content Organization Strategies

### 1. Importance-Based Ordering

**Principle:** Most important items first, least important last.

```tsx
const dimensionsWithPriority = [
  { ...dimension, priority: "high", order: 1 },   // Needs attention
  { ...dimension, priority: "high", order: 2 },   // Critical
  { ...dimension, priority: "medium", order: 3 }, // Normal
  { ...dimension, priority: "low", order: 4 },    // Optional
];

// Sort by order and render
dimensionsWithPriority
  .sort((a, b) => a.order - b.order)
  .map(dim => (
    <Card key={dim.id} priority={dim.priority}>
      {/* Content */}
    </Card>
  ));
```

### 2. Status-Based Priority

Assign priority based on completion or health status:

```tsx
const getPriority = (dimension) => {
  if (dimension.needsAttention) return "high";
  if (dimension.isComplete) return "low";
  return "medium";
};

dimensions.map(dim => (
  <Card priority={getPriority(dim)}>
    {/* Content */}
  </Card>
));
```

### 3. User Context Priority

Adjust priority based on user state:

```tsx
const getPriorityForUser = (item, userState) => {
  // High energy user - show challenging content first
  if (userState.energy === "high" && item.difficulty === "hard") {
    return "high";
  }
  
  // Low energy user - emphasize easy wins
  if (userState.energy === "low" && item.difficulty === "easy") {
    return "high";
  }
  
  return "medium";
};
```

### 4. Temporal Priority

Based on time-sensitivity:

```tsx
const getTimePriority = (item) => {
  const hoursUntilDue = getHoursUntilDue(item.dueDate);
  
  if (hoursUntilDue < 2) return "high";    // Due soon
  if (hoursUntilDue < 24) return "medium"; // Due today
  return "low";                             // Due later
};
```

## Layout Patterns

### Grid with Priority

Organize items in a grid with high-priority items at the start:

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {sortedByPriority.map(item => (
    <Card 
      key={item.id}
      priority={item.priority}
      size="md"
    >
      {/* Content */}
    </Card>
  ))}
</div>
```

### Featured + Grid Layout

Highlight most important item, then show grid:

```tsx
<div className="space-y-6">
  {/* Featured high-priority item */}
  <Card priority="high" size="lg">
    <CardHeader>
      <Badge>Recommended</Badge>
      <CardTitle>{featuredItem.title}</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Featured content */}
    </CardContent>
  </Card>
  
  {/* Grid of remaining items */}
  <div className="grid grid-cols-2 gap-3">
    {remainingItems.map(item => (
      <Card key={item.id} priority="medium" size="md">
        {/* Content */}
      </Card>
    ))}
  </div>
</div>
```

### Sectioned by Priority

Group by priority level with headers:

```tsx
<div className="space-y-8">
  {/* High priority section */}
  {highPriorityItems.length > 0 && (
    <section>
      <h2 className="text-lg font-semibold mb-3">Needs Attention</h2>
      <div className="grid grid-cols-1 gap-3">
        {highPriorityItems.map(item => (
          <Card key={item.id} priority="high">
            {/* Content */}
          </Card>
        ))}
      </div>
    </section>
  )}
  
  {/* Medium priority section */}
  <section>
    <h2 className="text-lg font-semibold mb-3">Active</h2>
    <div className="grid grid-cols-2 gap-3">
      {mediumPriorityItems.map(item => (
        <Card key={item.id} priority="medium">
          {/* Content */}
        </Card>
      ))}
    </div>
  </section>
  
  {/* Low priority section */}
  {lowPriorityItems.length > 0 && (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">
        Optional
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {lowPriorityItems.map(item => (
          <Card key={item.id} priority="low" size="sm">
            {/* Content */}
          </Card>
        ))}
      </div>
    </section>
  )}
</div>
```

## Visual Enhancement Techniques

### 1. Size + Priority

Combine size and priority for stronger hierarchy:

```tsx
<Card size="lg" priority="high">Large, important card</Card>
<Card size="md" priority="medium">Medium card</Card>
<Card size="sm" priority="low">Small, less important</Card>
```

### 2. Icons + Priority

Use icons to reinforce importance:

```tsx
<Card priority="high">
  <CardContent className="flex items-start gap-3">
    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
    <div>High priority content</div>
  </CardContent>
</Card>
```

### 3. Color + Priority

Subtle background colors for additional context:

```tsx
<Card 
  priority="high" 
  className="bg-red-500/5 dark:bg-red-500/10"
>
  {/* Urgent content */}
</Card>

<Card 
  priority="medium" 
  className="bg-blue-500/5 dark:bg-blue-500/10"
>
  {/* Active content */}
</Card>
```

### 4. Badges + Priority

Add status badges for quick scanning:

```tsx
<Card priority="high">
  <CardHeader className="flex-row items-center justify-between">
    <CardTitle>Title</CardTitle>
    <Badge variant="destructive">Urgent</Badge>
  </CardHeader>
</Card>
```

## Real-World Example: Dimension Assessment

```tsx
function DimensionGrid() {
  const dimensions = useDimensions();
  
  // Calculate priority based on user's assessment
  const dimensionsWithPriority = dimensions.map(dim => ({
    ...dim,
    priority: getDimensionPriority(dim)
  }));
  
  // Sort: high priority first, then by name
  const sorted = dimensionsWithPriority.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {sorted.map(dim => {
        const Icon = dim.icon;
        return (
          <Card 
            key={dim.id}
            priority={dim.priority}
            size="tile"
            className="cursor-pointer transition-all hover:scale-105"
          >
            <CardContent className="pt-6 flex flex-col items-center gap-2">
              <div className={`p-3 rounded-lg ${dim.bgColor}`}>
                <Icon className={`h-6 w-6 ${dim.color}`} />
              </div>
              <p className="font-medium text-sm">{dim.name}</p>
              {dim.priority === "high" && (
                <Badge variant="outline" className="text-xs">
                  Focus Here
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getDimensionPriority(dimension) {
  // High priority: struggling or needs attention
  if (dimension.level <= 2) return "high";
  
  // Low priority: thriving or complete
  if (dimension.level >= 4) return "low";
  
  // Medium: everything else
  return "medium";
}
```

## Accessibility Considerations

### Screen Readers

Priority should be communicated semantically:

```tsx
<Card priority="high" aria-label="High priority: Needs attention">
  <CardContent>
    <span className="sr-only">High priority item</span>
    {/* Visible content */}
  </CardContent>
</Card>
```

### Keyboard Navigation

Ensure high-priority items are reachable via keyboard:

```tsx
<Card 
  priority="high"
  tabIndex={0}
  role="button"
  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
>
  {/* Content */}
</Card>
```

### Focus Indicators

High-priority items should have clear focus states:

```tsx
<Card 
  priority="high"
  className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  {/* Content */}
</Card>
```

## Best Practices

### Do's

✅ **Use priority sparingly** - Too many high-priority items defeats the purpose
✅ **Be consistent** - Use same criteria across the app
✅ **Consider context** - Priority can change based on user state
✅ **Test with users** - Validate that hierarchy makes sense
✅ **Update dynamically** - Priority should reflect current state

### Don'ts

❌ **Don't mark everything high priority**
❌ **Don't use priority for decoration**
❌ **Don't ignore user preferences**
❌ **Don't make low-priority items inaccessible**
❌ **Don't forget mobile users** - Hierarchy is even more critical on small screens

## Performance Considerations

Priority calculation should be efficient:

```tsx
// ✅ Good: Memoize priority calculation
const dimensionsWithPriority = useMemo(() => 
  dimensions.map(d => ({
    ...d,
    priority: calculatePriority(d, userState)
  })),
  [dimensions, userState]
);

// ❌ Bad: Calculate on every render
const dimensionsWithPriority = dimensions.map(d => ({
  ...d,
  priority: calculatePriority(d, userState)
}));
```

## Testing Checklist

- [ ] High-priority items are visually distinct
- [ ] Priority levels are meaningful and consistent
- [ ] Layout works on mobile and desktop
- [ ] Screen readers announce priority
- [ ] Focus order follows priority
- [ ] Dark mode maintains visibility
- [ ] Performance is acceptable with many items
- [ ] Priority updates when state changes

## Summary

Visual hierarchy through priority helps users:
1. **Quickly identify** what needs attention
2. **Navigate efficiently** to important content
3. **Understand relationships** between items
4. **Focus their energy** on what matters most

Use the `priority` prop on Card components combined with thoughtful content ordering to create interfaces that guide users naturally to what's most important for them right now.
