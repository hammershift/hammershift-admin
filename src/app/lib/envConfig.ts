import { z } from "zod";

/**
 * Environment Configuration Validation
 *
 * Validates all required environment variables at startup using Zod.
 * Provides type-safe access to environment variables throughout the application.
 */

// Helper schemas
const nonEmptyString = z.string().min(1, "Cannot be empty");
const urlString = z.string().url("Must be a valid URL");
const emailString = z.string().email("Must be a valid email");
const numberString = z.string().regex(/^\d+$/, "Must be a number");

// Main environment schema
const envSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  MONGODB_URI: urlString.describe("MongoDB connection string"),
  DB_NAME: nonEmptyString.describe("MongoDB database name"),

  // NextAuth
  NEXTAUTH_URL: urlString.describe("NextAuth base URL"),
  NEXTAUTH_SECRET: nonEmptyString
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .describe("NextAuth secret for JWT encryption"),

  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional().describe("Google OAuth client ID"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Google OAuth client secret"),

  // Firebase (all optional - only validate if any are provided)
  FIREBASE_API_KEY: z.string().optional().describe("Firebase API key"),
  FIREBASE_AUTH_DOMAIN: z.string().optional().describe("Firebase auth domain"),
  FIREBASE_PROJECT_ID: z.string().optional().describe("Firebase project ID"),
  FIREBASE_STORAGE_BUCKET: z
    .string()
    .optional()
    .describe("Firebase storage bucket"),
  FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .optional()
    .describe("Firebase messaging sender ID"),
  FIREBASE_APP_ID: z.string().optional().describe("Firebase app ID"),
  FIREBASE_MEASUREMENT_ID: z
    .string()
    .optional()
    .describe("Firebase measurement ID"),

  // Email (optional - for nodemailer)
  SMTP_HOST: z.string().optional().describe("SMTP server host"),
  SMTP_PORT: numberString.optional().describe("SMTP server port"),
  SMTP_USER: z.string().optional().describe("SMTP username"),
  SMTP_PASSWORD: z.string().optional().describe("SMTP password"),
  SMTP_FROM: emailString.optional().describe("Email 'from' address"),

  // Application URLs (optional)
  NEXT_PUBLIC_APP_URL: z
    .string()
    .optional()
    .describe("Public-facing application URL"),

  // Feature flags (optional)
  ENABLE_RATE_LIMITING: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .describe("Enable rate limiting middleware"),
  ENABLE_AUDIT_LOGGING: z
    .enum(["true", "false"])
    .optional()
    .default("true")
    .describe("Enable audit logging"),

  // Third-party integrations (optional)
  STRIPE_SECRET_KEY: z
    .string()
    .optional()
    .describe("Stripe secret key for payments"),
  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .optional()
    .describe("Stripe publishable key"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .describe("Stripe webhook signing secret"),
});

// Refined validations for interdependent fields
const envSchemaRefined = envSchema
  .refine(
    (data) => {
      // If any Firebase env var is provided, warn if others are missing
      const firebaseVars = [
        data.FIREBASE_API_KEY,
        data.FIREBASE_AUTH_DOMAIN,
        data.FIREBASE_PROJECT_ID,
        data.FIREBASE_STORAGE_BUCKET,
        data.FIREBASE_APP_ID,
      ];

      const hasAnyFirebase = firebaseVars.some((v) => v !== undefined && v !== 'test');
      const hasAllFirebase = firebaseVars.every((v) => v !== undefined && v !== 'test');

      // If Firebase is partially configured, that's okay in development or test
      if (hasAnyFirebase && !hasAllFirebase && data.NODE_ENV === "production") {
        return false;
      }

      return true;
    },
    {
      message:
        "Firebase is partially configured. In production, all Firebase variables must be set if any are set.",
    }
  )
  .refine(
    (data) => {
      // If any SMTP env var is provided, all must be provided
      const smtpVars = [
        data.SMTP_HOST,
        data.SMTP_PORT,
        data.SMTP_USER,
        data.SMTP_PASSWORD,
        data.SMTP_FROM,
      ];

      const hasAnySmtp = smtpVars.some((v) => v !== undefined);
      const hasAllSmtp = smtpVars.every((v) => v !== undefined);

      if (hasAnySmtp && !hasAllSmtp) {
        return false;
      }

      return true;
    },
    {
      message:
        "SMTP is partially configured. All SMTP variables (HOST, PORT, USER, PASSWORD, FROM) must be set if any are set.",
    }
  )
  .refine(
    (data) => {
      // If any Stripe env var is provided, all must be provided
      const stripeVars = [
        data.STRIPE_SECRET_KEY,
        data.STRIPE_PUBLISHABLE_KEY,
        data.STRIPE_WEBHOOK_SECRET,
      ];

      const hasAnyStripe = stripeVars.some((v) => v !== undefined);
      const hasAllStripe = stripeVars.every((v) => v !== undefined);

      if (hasAnyStripe && !hasAllStripe && data.NODE_ENV === "production") {
        return false;
      }

      return true;
    },
    {
      message:
        "Stripe is partially configured. In production, all Stripe variables must be set if any are set.",
    }
  )
  .refine(
    (data) => {
      // Google OAuth must have both client ID and secret, or neither
      const hasClientId = data.GOOGLE_CLIENT_ID !== undefined;
      const hasClientSecret = data.GOOGLE_CLIENT_SECRET !== undefined;

      if (hasClientId !== hasClientSecret) {
        return false;
      }

      return true;
    },
    {
      message:
        "Google OAuth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    }
  );

// Infer TypeScript type from schema
export type Env = z.infer<typeof envSchema>;

// Validated environment variables
let validatedEnv: Env | null = null;

/**
 * Validate environment variables
 * Call this at application startup
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchemaRefined.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join(".");
        return `  - ${path}: ${err.message}`;
      });

      console.error("\n❌ Environment variable validation failed:\n");
      console.error(errorMessages.join("\n"));
      console.error("\nPlease check your .env.local file.\n");

      // In production, fail fast
      if (process.env.NODE_ENV === "production") {
        throw new Error("Invalid environment configuration");
      }

      // In development, warn but continue
      console.warn("⚠️  Continuing with invalid environment in development mode\n");
      throw error;
    }

    throw error;
  }
}

/**
 * Get validated environment variables
 * Throws if validation hasn't been run yet
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error(
      "Environment variables not validated. Call validateEnv() first."
    );
  }

  return validatedEnv;
}

/**
 * Check if a specific environment variable is set
 */
export function hasEnv(key: keyof Env): boolean {
  const env = getEnv();
  return env[key] !== undefined && env[key] !== "";
}

/**
 * Get environment variable or default value
 */
export function getEnvOrDefault<K extends keyof Env>(
  key: K,
  defaultValue: string
): string {
  const env = getEnv();
  const value = env[key];
  return value !== undefined && value !== "" ? String(value) : defaultValue;
}

/**
 * Check if Firebase is fully configured
 */
export function isFirebaseConfigured(): boolean {
  try {
    const env = getEnv();
    return !!(
      env.FIREBASE_API_KEY &&
      env.FIREBASE_AUTH_DOMAIN &&
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_STORAGE_BUCKET &&
      env.FIREBASE_APP_ID
    );
  } catch {
    return false;
  }
}

/**
 * Check if SMTP is configured
 */
export function isSmtpConfigured(): boolean {
  try {
    const env = getEnv();
    return !!(
      env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASSWORD &&
      env.SMTP_FROM
    );
  } catch {
    return false;
  }
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  try {
    const env = getEnv();
    return !!(
      env.STRIPE_SECRET_KEY &&
      env.STRIPE_PUBLISHABLE_KEY &&
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return false;
  }
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  try {
    const env = getEnv();
    return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  } catch {
    return false;
  }
}

/**
 * Get feature flag value
 */
export function isFeatureEnabled(feature: "rateLimiting" | "auditLogging"): boolean {
  try {
    const env = getEnv();
    switch (feature) {
      case "rateLimiting":
        return env.ENABLE_RATE_LIMITING === "true";
      case "auditLogging":
        return env.ENABLE_AUDIT_LOGGING === "true";
      default:
        return false;
    }
  } catch {
    return true; // Default to enabled if env not validated
  }
}

/**
 * Pretty print environment configuration (safe for logging)
 */
export function printEnvConfig(): void {
  try {
    const env = getEnv();

    console.log("\n📋 Environment Configuration:");
    console.log(`  Node Environment: ${env.NODE_ENV}`);
    console.log(`  Database: ${env.DB_NAME}`);
    console.log(`  NextAuth URL: ${env.NEXTAUTH_URL}`);
    console.log(`  Firebase: ${isFirebaseConfigured() ? "✅ Configured" : "❌ Not configured"}`);
    console.log(`  SMTP: ${isSmtpConfigured() ? "✅ Configured" : "❌ Not configured"}`);
    console.log(`  Stripe: ${isStripeConfigured() ? "✅ Configured" : "❌ Not configured"}`);
    console.log(`  Google OAuth: ${isGoogleOAuthConfigured() ? "✅ Configured" : "❌ Not configured"}`);
    console.log(`  Rate Limiting: ${isFeatureEnabled("rateLimiting") ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`  Audit Logging: ${isFeatureEnabled("auditLogging") ? "✅ Enabled" : "❌ Disabled"}\n`);
  } catch (error) {
    console.error("Could not print environment configuration:", error);
  }
}

// Export schema for testing
export { envSchema, envSchemaRefined };
