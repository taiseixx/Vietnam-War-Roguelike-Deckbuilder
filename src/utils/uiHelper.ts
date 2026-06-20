/**
 * UI Helper utilities for responsive design and layout calculations.
 */

/**
 * Simple debounce utility to limit function execution frequency.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Calculates a responsive card width based on the current window width.
 * Follows a standard formula to ensure cards look good on both mobile and desktop.
 * 
 * @param windowWidth The current width of the window in pixels.
 * @returns The calculated width for the card in pixels.
 */
export function calculateResponsiveCardWidth(windowWidth: number): number {
  const isMobile = windowWidth < 640;
  // If mobile: limit width to roughly half screen width minus padding, max 130px
  // If desktop: max 180px, or based on available space
  return isMobile
    ? Math.min(130, (windowWidth - 40) / 2)
    : Math.min(180, (windowWidth - 48) / 2);
}
