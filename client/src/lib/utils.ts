// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using `clsx` and then merges them using `tailwind-merge`.
 * This helps avoid duplicate/conflicting Tailwind utility classes.
 *
 * @param inputs - A list of conditional class values.
 * @returns A merged string of class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
