/**
 * RBAC (Role-Based Access Control)
 *
 * Re-exports from @be-in-digital/core
 */

// RBAC Core
export {
  Role,
  Resource,
  Action,
  type Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  parseRole,
  isValidRole,
  PermissionDeniedError,
} from "@be-in-digital/core"

// Auth Types
export type {
  AuthUser,
  AuthSession,
  AuthSessionData,
} from "@be-in-digital/core"

// Server Utilities
export {
  getServerSession,
  getServerUser,
  requireAuth,
  requireRole,
  requireAnyRole,
  requirePermissionGuard,
  requireAnyPermissionGuard,
  requireAllPermissionsGuard,
  canAccessRestaurant,
  requireRestaurantAccess,
  handleAuthError,
  withAuthRoute,
  UnauthorizedError,
  ForbiddenError,
} from "@be-in-digital/core"
