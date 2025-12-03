import { z } from "zod";

/**
 * Validation schemas for API requests
 */

// Common validations
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
export const emailSchema = z.string().email("Invalid email address");
export const positiveNumberSchema = z.number().positive("Must be positive");
export const nonNegativeNumberSchema = z.number().nonnegative("Must be non-negative");

// Wager validations
export const createWagerSchema = z.object({
  auctionID: objectIdSchema,
  priceGuessed: positiveNumberSchema,
  wagerAmount: z.number().min(1, "Minimum wager is 1").max(100000, "Maximum wager is 100,000"),
  user: z.object({
    fullName: z.string().min(1),
    username: z.string().min(1),
    image: z.string().optional(),
  }),
});

export const updateWagerSchema = z.object({
  priceGuessed: positiveNumberSchema.optional(),
  wagerAmount: z.number().min(1).max(100000).optional(),
  isActive: z.boolean().optional(),
});

// Auction validations
export const updateAuctionSchema = z.object({
  title: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  ended: z.boolean().optional(),
  pot: nonNegativeNumberSchema.optional(),
  statusAndPriceChecked: z.boolean().optional(),
  sort: z.object({
    price: nonNegativeNumberSchema.optional(),
    bids: nonNegativeNumberSchema.optional(),
    deadline: z.string().datetime().optional(),
  }).optional(),
});

// Tournament validations
export const createTournamentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  banner: z.string().url().optional().or(z.literal("")),
  type: z.string().min(1),
  prizePool: nonNegativeNumberSchema,
  buyInFee: nonNegativeNumberSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  auction_ids: z.array(objectIdSchema).min(1, "At least one auction required"),
  maxUsers: z.number().int().min(2, "Minimum 2 users"),
});

export const updateTournamentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  banner: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  haveWinners: z.boolean().optional(),
});

// Prediction validations
export const createPredictionSchema = z.object({
  auction_id: objectIdSchema,
  tournament_id: objectIdSchema.optional(),
  predictedPrice: positiveNumberSchema,
  reasoning: z.string().optional(),
  predictionType: z.enum(["free_play", "paid"]),
  wagerAmount: nonNegativeNumberSchema,
  user: z.object({
    userId: objectIdSchema,
    fullName: z.string().min(1),
    username: z.string().min(1),
    role: z.enum(["USER", "AGENT"]),
  }),
});

// Transaction validations
export const createTransactionSchema = z.object({
  userID: objectIdSchema,
  wagerID: objectIdSchema.optional(),
  auctionID: objectIdSchema.optional(),
  tournamentID: objectIdSchema.optional(),
  transactionType: z.enum([
    "wager",
    "deposit",
    "withdraw",
    "winnings",
    "refund",
    "tournament buy-in",
    "processing_fee",
  ]),
  amount: positiveNumberSchema,
  type: z.enum(["+", "-"]),
  status: z.enum(["processing", "success", "failed"]).optional(),
});

// User validations
export const updateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  fullName: z.string().min(1).optional(),
  email: emailSchema.optional(),
  balance: nonNegativeNumberSchema.optional(),
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  about: z.string().optional(),
});

// Agent validations
export const createAgentSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(1, "Full name is required"),
  email: emailSchema,
  agentProperties: z.object({
    systemInstruction: z.string().min(10, "System instruction must be at least 10 characters"),
  }),
});

export const updateAgentSchema = z.object({
  _id: objectIdSchema,
  username: z.string().min(3).optional(),
  fullName: z.string().min(1).optional(),
  email: emailSchema.optional(),
  agentProperties: z.object({
    systemInstruction: z.string().min(10).optional(),
  }).optional(),
});

// Admin validations
export const createAdminSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: emailSchema,
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["owner", "admin", "moderator"]),
});

// Comment validations
export const createCommentSchema = z.object({
  comment: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
  pageID: z.string().min(1),
  pageType: z.string().min(1),
  parentID: objectIdSchema.optional(),
  user: z.object({
    userId: z.string().min(1),
    username: z.string().min(1),
    profilePicture: z.string().optional(),
  }),
});

// Withdraw request validations
export const approveWithdrawSchema = z.object({
  transactionId: objectIdSchema,
  transactionNote: z.string().optional(),
});

export const refundWagerSchema = z.object({
  wager_id: objectIdSchema,
});

/**
 * Helper to validate request body
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: string }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }
    return { error: "Invalid request body" };
  }
}

/**
 * Helper to validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T } | { error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      };
    }
    return { error: "Invalid query parameters" };
  }
}
