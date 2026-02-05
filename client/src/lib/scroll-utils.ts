/**
 * Utility functions for smooth scrolling behavior
 */

import { RefObject } from 'react';

/**
 * Scrolls to an element by ID with smooth behavior
 * @param elementId - The ID of the element to scroll to
 * @param delay - Optional delay before scrolling (default: 100ms)
 * @param block - Scroll alignment: 'start', 'center', 'end', or 'nearest' (default: 'start')
 */
export const scrollToElement = (
  elementId: string,
  delay: number = 100,
  block: ScrollLogicalPosition = 'start'
): void => {
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block,
      });
    }
  }, delay);
};

/**
 * Scrolls to a ref element with smooth behavior
 * @param ref - React ref to the element
 * @param delay - Optional delay before scrolling (default: 100ms)
 * @param block - Scroll alignment: 'start', 'center', 'end', or 'nearest' (default: 'start')
 */
export const scrollToRef = (
  ref: RefObject<HTMLElement>,
  delay: number = 100,
  block: ScrollLogicalPosition = 'start'
): void => {
  setTimeout(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block,
      });
    }
  }, delay);
};

/**
 * Checks if an element is below the viewport
 * @param elementId - The ID of the element to check
 * @returns true if the element is below the current viewport
 */
export const isElementBelowViewport = (elementId: string): boolean => {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  
  return rect.top > viewportHeight;
};
