/**
 * Dashboard Actions - Main Module
 * 
 * ✅ REFACTORED: This file has been modularized for better maintainability
 * 
 * The original monolithic file has been split into focused modules:
 * - dashboard/dashboard-filter-actions.ts: Filter and search functionality
 * - dashboard/dashboard-export-actions.ts: Data export operations  
 * - dashboard/dashboard-widget-actions.ts: Widget configuration and state management
 * - dashboard/dashboard-data-actions.ts: Data fetching and refresh operations
 * - dashboard/types.ts: Dashboard-specific types and schemas
 * - dashboard/utils.ts: Dashboard-specific utilities
 * 
 * This file now re-exports everything for backward compatibility.
 * New code should import directly from the specific modules.
 */

// Re-export everything from the modular dashboard actions
export * from './dashboard'
