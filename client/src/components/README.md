# Atomic Design Component Structure

This directory follows the **Atomic Design** methodology for organizing UI components.

## Levels

### Atoms (`/atoms`)
Basic building blocks - smallest functional units that can't be broken down further.

**Examples:**
- Button
- Input
- Text
- Icon
- Label

**When to use:**
- Single-purpose components
- Highly reusable across the app
- No complex logic or state

### Molecules (`/molecules`)
Simple combinations of atoms working together as a unit.

**Examples:**
- FormField (Label + Input)
- SearchBar (Input + Icon)
- Card (Container + Text + Icon)
- ListItem (Icon + Text + Button)

**When to use:**
- Combining 2-3 atoms
- Creating reusable patterns
- Simple interactions

### Organisms (`/organisms`)
Complex components made of molecules and atoms.

**Examples:**
- Navigation Menu
- All Features Grid
- Modal Dialog
- Form with validation
- Data Table

**When to use:**
- Feature-specific components
- Complex interactions
- Multiple molecules combined
- Business logic included

### Templates (`/templates`)
Page-level components defining layout structure (future).

### Pages (`/pages`)
Specific instances of templates with real content.

## Benefits

1. **Consistency** - Reusable components ensure consistent UI
2. **Maintainability** - Changes propagate automatically
3. **Testability** - Small components are easier to test
4. **Documentation** - Clear hierarchy and purpose
5. **Scalability** - Easy to add new components

## Guidelines

- **Start small** - Build atoms first
- **Compose up** - Build molecules from atoms
- **Keep it pure** - Atoms should be stateless when possible
- **Document** - Add JSDoc comments with examples
- **Test** - Write tests for reusable components

## Migration Strategy

The codebase currently has components in a flat structure (`/components`). We're gradually migrating to atomic design:

1. New components → Use atomic structure
2. Existing components → Keep working, migrate when refactoring
3. Shared UI components → Move to `/components/ui` (shadcn/ui pattern)

## Example Usage

```tsx
// Atom
import { Icon } from '@/components/atoms/Icon';

// Molecule
import { SearchBar } from '@/components/molecules/SearchBar';

// Organism
import { NavigationMenu } from '@/components/organisms/NavigationMenu';
```

## Resources

- [Atomic Design by Brad Frost](https://bradfrost.com/blog/post/atomic-web-design/)
- [Component Driven Development](https://www.componentdriven.org/)
