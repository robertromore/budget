import type { PasswordValidationResult } from "$lib/server/domains/auth";
import type { UserPreferences } from "$lib/schema/users";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

export const authKeys = createQueryKeys("auth", {
  me: () => ["auth", "me"] as const,
  emailAvailable: (email: string) => ["auth", "emailAvailable", email] as const,
  preferences: () => ["auth", "preferences"] as const,
});

/**
 * Get current authenticated user
 */
export const getCurrentUser = () =>
  defineQuery<{
    id: string;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean | null;
    image: string | null;
    role: string | null;
  } | null>({
    queryKey: authKeys.me(),
    queryFn: () => trpc().authRoutes.me.query(),
  });

/**
 * Check if email is available for registration
 */
export const checkEmailAvailable = defineQuery<
  { email: string },
  { available: boolean }
>({
  queryKey: (params: { email: string }) => authKeys.emailAvailable(params.email),
  queryFn: (params: { email: string }) => trpc().authRoutes.checkEmailAvailable.query(params),
});

/**
 * Validate password strength
 */
export const validatePassword = defineMutation<
  { password: string },
  PasswordValidationResult
>({
  mutationFn: (input) => trpc().authRoutes.validatePassword.mutate(input),
});

/**
 * Request password reset
 */
export const forgotPassword = defineMutation<{ email: string }, { success: boolean }>({
  mutationFn: (input) => trpc().authRoutes.forgotPassword.mutate(input),
  successMessage: "If an account exists with this email, you will receive a password reset link.",
});

/**
 * Reset password with token
 */
export const resetPassword = defineMutation<
  { token: string; newPassword: string },
  { success: boolean }
>({
  mutationFn: (input) => trpc().authRoutes.resetPassword.mutate(input),
  successMessage: "Password reset successfully. You can now log in.",
  errorMessage: (error) => error.message || "Failed to reset password",
});

/**
 * Update user profile
 */
export const updateProfile = defineMutation<
  { displayName?: string; image?: string },
  { success: boolean }
>({
  mutationFn: (input) => trpc().authRoutes.updateProfile.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(authKeys.me());
  },
  successMessage: "Profile updated",
  errorMessage: (error) => error.message || "Failed to update profile",
});

/**
 * Get user preferences (only explicitly saved values, not merged with defaults)
 */
export const getPreferences = () =>
  defineQuery<Partial<UserPreferences> | null>({
    queryKey: authKeys.preferences(),
    queryFn: () => trpc().authRoutes.getPreferences.query(),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

/**
 * Update user preferences (partial update)
 */
export const updatePreferences = defineMutation<Partial<UserPreferences>, UserPreferences>({
  mutationFn: (input) => trpc().authRoutes.updatePreferences.mutate(input),
  onSuccess: () => {
    cachePatterns.invalidatePrefix(authKeys.preferences());
  },
  // No toast - preferences sync silently in background
});
