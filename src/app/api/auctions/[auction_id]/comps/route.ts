import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auctions/[auction_id]/comps
 *
 * Returns comparable sales data for an auction.
 * Currently returns empty array as feature is not yet implemented.
 *
 * TODO: Implement comparable sales logic:
 * - Find similar auctions (same make, model, year range)
 * - Filter by recent sales (last 6-12 months)
 * - Return price data and auction details
 */
export async function GET(
  req: NextRequest,
  context: { params: { auction_id: string } }
) {
  try {
    const { auction_id } = context.params;

    // TODO: Implement comparable sales query
    // For now, return empty array to prevent frontend errors
    return NextResponse.json(
      {
        auction_id,
        comps: [],
        message: "Comparable sales feature not yet implemented",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching comps:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
