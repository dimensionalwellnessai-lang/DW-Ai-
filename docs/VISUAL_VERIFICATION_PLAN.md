# Visual Verification Plan

Since the development environment isn't fully set up for running the application, here's what to verify when the app is running:

## Test Scenarios

### 1. Life Blueprint Page (`/life-blueprint`)

#### Test: Dimension Selection
1. Navigate to Life Blueprint page
2. Click on any dimension card (e.g., "Body")
3. **Expected**: Page smoothly scrolls to show the dimension detail card below
4. **Visual**: Detail card should be centered in viewport

#### Test: Save Blueprint
1. Select a dimension
2. Click "Create Blueprint" or "Edit"
3. Fill in the form fields
4. Click "Save Blueprint"
5. **Expected**: 
   - Toast appears: "Blueprint updated successfully! Your dimension values have been saved."
   - Page smoothly scrolls to show the saved content
   - Detail card shows the saved values

#### Test: Reset Protocol
1. Switch to "Reset Protocol" tab
2. Click "Create Reset Protocol"
3. Fill in the fields
4. Click "Save Reset Protocol"
5. **Expected**:
   - Toast appears: "Reset Protocol updated successfully! Your recovery system has been saved."
   - Page scrolls to show the saved reset protocol view

### 2. Blueprint Page (`/blueprint`)

#### Test: Explore Foundations
1. Navigate to Blueprint page
2. Go to "Foundations" tab
3. Click "Explore My Foundations" button
4. **Expected**: Page smoothly scrolls to show the first question
5. **Visual**: Question card should be at the top of viewport

#### Test: Dimension Assessment
1. Go to "Dimensions" tab
2. Click on any wellness dimension card
3. **Expected**: Page smoothly scrolls to show the dimension detail form
4. **Visual**: Detail form should be at the top of viewport

#### Test: Dimension Level Update
1. Select a dimension
2. Click on any level (1-5)
3. **Expected**: Toast appears: "Level updated [Dimension] dimension has been updated."

#### Test: Baseline Save
1. Go to "Baseline" tab
2. Add some baseline signs
3. Click "Save"
4. **Expected**: 
   - Toast appears: "Baseline saved Your baseline profile has been updated successfully."
   - Page may scroll to show saved content (if element with id 'baseline-content' exists)

### 3. Card Size Consistency

#### Areas to Check:
1. **Life Blueprint**: 
   - Dimension selector cards in grid (should be consistent height)
   - Progress card (should be consistent)
   
2. **Blueprint**:
   - Wellness dimension cards in grid
   - Foundation cards
   
3. **Home/Dashboard**:
   - Recent switches cards
   - System cards

#### Using Size Variants:
If any page uses the new size props, verify:
- `size="sm"` cards are 100px min height
- `size="md"` cards are 150px min height
- `size="lg"` cards are 200px min height
- `size="tile"` cards are square (1:1 aspect ratio)

### 4. ScrollIndicator Component

**Note**: ScrollIndicator component is created but not yet integrated into any pages. To test it, you would need to:

```tsx
import { ScrollIndicator } from "@/components/scroll-indicator";

// In your component:
<ScrollIndicator 
  show={someCondition}
  message="More below"
  targetId="content-below"
/>
```

Expected behavior:
- Indicator appears at bottom of viewport
- Shows "More below" text
- Has bouncing arrow animation
- Clicking scrolls to target element
- Auto-hides when user scrolls down 100px

### 5. Visual Smoothness

All scroll behaviors should:
- Be smooth (not instant jumps)
- Feel natural (not too slow, not too fast)
- Not interfere with user interaction
- Work consistently across pages

### 6. Mobile Testing

Test all above scenarios on mobile:
- Scroll behavior works on touch devices
- Cards look consistent on small screens
- Toast notifications are readable
- Animations are smooth

### 7. Dark Mode

Verify in dark mode:
- ScrollIndicator is visible
- Toast notifications are readable
- Card borders are visible
- No contrast issues

## Common Issues to Watch For

❌ **Scroll not happening**: Check console for errors, ensure element exists
❌ **Scroll too fast/slow**: Adjust delay parameter
❌ **Scroll to wrong position**: Check block alignment parameter
❌ **Toasts not showing**: Check useToast hook setup
❌ **Cards different sizes**: Check if size prop is applied

## Performance Check

Monitor:
- Page load time (should be negligible impact)
- Scroll smoothness (should be 60fps)
- Memory usage (should not leak)
- Console for warnings/errors

## Acceptance Criteria Verification

- [ ] Clicking dimension cards scrolls to detail view
- [ ] Saving forms shows toast and scrolls to result
- [ ] All toasts have clear, descriptive messages
- [ ] Card sizes are consistent within sections
- [ ] Scroll behavior is smooth and natural
- [ ] Works on both desktop and mobile
- [ ] Works in both light and dark mode
- [ ] No console errors
- [ ] No performance issues

## Screenshot Checklist

Capture screenshots of:
1. Life Blueprint dimension selection (before/after scroll)
2. Blueprint foundations flow (before/after clicking "Explore")
3. Toast notification examples
4. Card grid consistency examples
5. Mobile view of scroll behavior
6. Dark mode examples

## Next Steps After Manual Testing

If issues are found:
1. Document the specific issue
2. Note which browser/device
3. Check console for errors
4. Verify element IDs match
5. Test delay adjustments if needed
6. Create follow-up fixes if required

## Additional Integration Opportunities

The ScrollIndicator component is ready but not yet used. Consider adding it to:
- Long forms (show when submit button is below fold)
- Life Blueprint (show when detail card is below fold)
- Any page with expandable content

Example integration:
```tsx
const [showScrollHint, setShowScrollHint] = useState(false);

useEffect(() => {
  if (isExpanded) {
    setShowScrollHint(isElementBelowViewport('expanded-content'));
  }
}, [isExpanded]);

return (
  <>
    {/* Page content */}
    <ScrollIndicator 
      show={showScrollHint}
      targetId="expanded-content"
    />
  </>
);
```
