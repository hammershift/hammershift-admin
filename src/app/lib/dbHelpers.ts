import mongoose from "mongoose";

/**
 * Database helper utilities for transaction management
 */

/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success and rolls back on error
 */
export async function withTransaction<T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Convert string ID to ObjectId with validation
 */
export function toObjectId(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Check if value is a valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}
