/**
 * RBAC (Role-Based Access Control) integration
 *
 * Re-exports RBAC utilities from @be-in-digital/core
 * for easy use throughout the themes app.
 *
 * @example
 * ```ts
 * import { hasPermission, Role, PERMISSIONS } from '@/lib/rbac'
 *
 * const canEdit = hasPermission(user.role, 'products:write')
 * ```
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
} from '@be-in-digital/core'

// Auth Types
export type {
  AuthUser,
  AuthSession,
  AuthSessionData,
} from '@be-in-digital/core'

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
} from '@be-in-digital/core'
