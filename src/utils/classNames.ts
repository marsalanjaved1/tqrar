import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind classes with proper precedence.
 * Handles conditional classes and merges conflicting utilities.
 * 
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged class string with proper Tailwind precedence
 * 
 * @example
 * ```tsx
 * // Basic usage
 * cn('tq-p-4', 'tq-m-2') // => 'tq-p-4 tq-m-2'
 * 
 * // Conditional classes
 * cn('tq-p-4', isActive && 'tq-bg-blue') // => 'tq-p-4 tq-bg-blue' (if isActive is true)
 * 
 * // Conflicting utilities (last one wins)
 * cn('tq-p-4', 'tq-p-2') // => 'tq-p-2'
 * 
 * // Complex example
 * cn(
 *   'tq-btn-primary',
 *   disabled && 'tq-opacity-50 tq-cursor-not-allowed',
 *   className
 * )
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
