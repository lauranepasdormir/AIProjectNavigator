import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect if the viewport is considered "mobile" (less than 768px).
 * Returns `true` for mobile, `false` for desktop.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = () => {
      setIsMobile(mediaQuery.matches);
    };

    // Initial check
    handleChange();

    // Listen for screen width changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup on unmount
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Ensure we return a boolean (fallback to false during SSR/hydration mismatch)
  return !!isMobile;
}
