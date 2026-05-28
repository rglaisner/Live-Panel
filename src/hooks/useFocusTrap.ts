/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useEffect, useRef, RefObject } from 'react';

/**
 * A custom hook to trap focus within a specific container element.
 * This is essential for accessibility in modals and dialogs.
 * @param ref A React ref attached to the container element.
 * @param isOpen A boolean indicating if the trap is active (e.g., if the modal is open).
 */
export const useFocusTrap = <T extends HTMLElement>(
  ref: RefObject<T>,
  isOpen: boolean,
  initialFocusRef?: RefObject<HTMLElement>
) => {
  const firstFocusableElement = useRef<HTMLElement | null>(null);
  const lastFocusableElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && ref.current) {
      const focusableElements = ref.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length > 0) {
        firstFocusableElement.current = focusableElements[0];
        lastFocusableElement.current =
          focusableElements[focusableElements.length - 1];
        
        // Automatically focus the specified element or the first element when the trap becomes active
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          firstFocusableElement.current.focus();
        }
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        // If the trap is not active or there are no focusable elements, do nothing
        if (!isOpen || focusableElements.length === 0) return;

        if (e.key === 'Tab') {
          if (e.shiftKey) { // Handle Shift + Tab
            if (document.activeElement === firstFocusableElement.current) {
              lastFocusableElement.current?.focus();
              e.preventDefault();
            }
          } else { // Handle Tab
            if (document.activeElement === lastFocusableElement.current) {
              firstFocusableElement.current?.focus();
              e.preventDefault();
            }
          }
        }
      };
      
      const currentRef = ref.current;
      currentRef.addEventListener('keydown', handleKeyDown);

      return () => {
        currentRef.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, ref]);
};
