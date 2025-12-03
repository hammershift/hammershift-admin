import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";

/**
 * Authorization middleware utilities
 */

export type UserRole = "owner" | "admin" | "moderator" | "user";

export interface AuthSession {
  user: {
    id: string;
    email: string;
    username: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
  };
}

/**
 * Check if user has required role
 */
export function hasRole(
  session: AuthSession | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session?.user?.role) return false;
  return allowedRoles.includes(session.user.role);
}

/**
 * Get current session or return unauthorized response
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<{ session: AuthSession } | { error: NextResponse }> {
  const session = (await getServerSession(authOptions)) as AuthSession | null;

  if (!session) {
    return {
      error: NextResponse.json(
        { message: "Unauthorized. Please sign in." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !hasRole(session, allowedRoles)) {
    return {
      error: NextResponse.json(
        {
          message: `Unauthorized. Required roles: ${allowedRoles.join(", ")}`,
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Wrapper for API route handlers with role-based authorization
 */
export function withAuth<T = any>(
  handler: (req: NextRequest, context: T, session: AuthSession) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest, context: T): Promise<NextResponse> => {
    const authResult = await requireAuth(allowedRoles);

    if ("error" in authResult) {
      return authResult.error;
    }

    return handler(req, context, authResult.session);
  };
}
