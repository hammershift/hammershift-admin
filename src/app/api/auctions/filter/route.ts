import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Auctions, { Auction } from "@/app/models/auction.model";
import { AggregatePaginateModel, PaginateModel } from "mongoose";
import { SortOrder } from "mongoose";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
export const dynamic = "force-dynamic";

interface SortQuery {
  createdAt?: number;
  "sort.price"?: number;
  "sort.deadline"?: number;
  "sort.bids"?: number;
  display?: number;
}

//Sample URL for tournament: api/auctions/filter?tournament_id=65cd6a5f26debfcee70dd52d

export async function GET(req: NextRequest) {
  try {
    await connectToDB();

    // Pagination parameters
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 7;

    // Search and filtering parameters
    const searchedKeyword = req.nextUrl.searchParams.get("search");

    // Context parameters (see docs/API-PARAMETER-GUIDE.md for detailed explanation)
    // isPlatformTab: Used by admin panel to distinguish between:
    //   - true: "Platform Auctions" tab (shows active OR ended auctions)
    //   - false/omit: "External Feed" tab (shows non-activated auctions)
    const isPlatformTab = req.nextUrl.searchParams.get("isPlatformTab");

    // publicOnly: Used by public website to show only active auctions with future deadlines
    // This is separate from isPlatformTab to maintain different filtering logic for public vs admin
    const publicOnly = req.nextUrl.searchParams.get("publicOnly");

    // Tournament context (special case for tournament-specific auctions)
    const tournamentID = req.nextUrl.searchParams.get("tournament_id");
    let completed = req.nextUrl.searchParams.get("completed") || [1];
    let era: string | string[] = req.nextUrl.searchParams.get("era") || "All";
    let category: string | string[] =
      req.nextUrl.searchParams.get("category") || "All";
    let make: string | string[] = req.nextUrl.searchParams.get("make") || "All";
    let location: string | string[] =
      req.nextUrl.searchParams.get("location") || "All";
    let sort: string | SortQuery =
      req.nextUrl.searchParams.get("sort") || "Newly Listed";

    if (tournamentID) {
      const tournamentAuctions = await Auctions.find({
        tournamentID: new ObjectId(tournamentID),
      });

      if (tournamentAuctions) {
        return NextResponse.json({
          total: tournamentAuctions.length,
          auctions: tournamentAuctions,
        });
      } else {
        return NextResponse.json({ message: "No auctions found" });
      }
    }

    const options = {
      offset: offset,
      limit: limit,
    };
    if (completed) {
      if (completed === "true") {
        completed = [2, 3, 4];
      }
      if (completed === "false") {
        completed = [1];
      }
      if (completed === "all") {
        completed = [1, 2, 3, 4];
      }
    }

    // ============================================================================
    // SEARCH QUERY PATH (MongoDB Atlas Search)
    // ============================================================================
    // NOTE: Search uses MongoDB Atlas Search index "auctionSearchAutocomplete"
    // and CANNOT be combined with other filters (make, category, etc.) due to
    // how Atlas Search works with aggregation pipelines.
    //
    // Valid search queries:
    //   - /api/auctions/filter?search=911 Coupe
    //   - /api/auctions/filter?search=911%20Coupe&completed=true
    //   - /api/auctions/filter?search=land%20cruiser (case insensitive)
    //
    // Search matches against the "attributes.value" field (make, model, year, etc.)
    // ============================================================================
    const now = new Date();
    if (searchedKeyword) {
      const aggregate = Auctions.aggregate([
        {
          $search: {
            index: "auctionSearchAutocomplete",
            text: {
              query: searchedKeyword,
              path: "attributes.value",
              fuzzy: {
                prefixLength: 3,
              },
            },
          },
        },
        {
          // Context-based filtering (see docs/API-PARAMETER-GUIDE.md)
          $match:
            isPlatformTab === "true"
              // ADMIN PLATFORM TAB: Show auctions that have been activated on the platform
              // This includes both currently active auctions AND completed/ended auctions
              // so admins can review historical data
              ? { $or: [{ isActive: true }, { ended: true }] }
              : publicOnly === "true"
              // PUBLIC WEBSITE: Show only auctions that are currently live for predictions
              // Must be: (1) activated on platform AND (2) deadline not yet passed
              ? {
                  isActive: true,
                  "sort.deadline": {
                    $gte: now,  // Future deadlines only
                  },
                }
              // ADMIN EXTERNAL FEED (default): Show auctions NOT yet added to platform
              // This includes auctions where isActive is false or doesn't exist (legacy data)
              // Only show auctions with future deadlines (no stale listings)
              : {
                  $or: [
                    { isActive: { $ne: true } },        // Explicitly not active
                    { isActive: { $exists: false } }    // Field doesn't exist (old data)
                  ],
                  "sort.deadline": {
                    $gte: now,  // Future deadlines only
                  },
                },
        },
        {
          $project: {
            _id: 1,
            auction_id: 1,
            attributes: 1,
            title: 1,
            description: 1,
            images_list: 1,
            listing_details: 1,
            page_url: 1,
            image: 1,
            isActive: 1,
            statusAndPriceChecked: 1,
            website: 1,
            make: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$attributes",
                    cond: { $eq: ["$$this.key", "make"] },
                  },
                },
                0,
              ],
            },
            model: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$attributes",
                    cond: { $eq: ["$$this.key", "model"] },
                  },
                },
                0,
              ],
            },
            year: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$attributes",
                    cond: { $eq: ["$$this.key", "year"] },
                  },
                },
                0,
              ],
            },
            // price: {
            //   $arrayElemAt: [
            //     {
            //       $filter: {
            //         input: "$attributes",
            //         cond: { $eq: ["$$this.key", "price"] },
            //       },
            //     },
            //     0,
            //   ],
            // },
            // bids: {
            //   $arrayElemAt: [
            //     {
            //       $filter: {
            //         input: "$attributes",
            //         cond: { $eq: ["$$this.key", "bids"] },
            //       },
            //     },
            //     0,
            //   ],
            // },
            // deadline: {
            //   $arrayElemAt: [
            //     {
            //       $filter: {
            //         input: "$attributes",
            //         cond: { $eq: ["$$this.key", "deadline"] },
            //       },
            //     },
            //     0,
            //   ],
            // },
          },
        },
        // {
        //   $project: {
        //     auction_id: 1,
        //     make: "$make.value",
        //     model: "$model.value",
        //     year: "$year.value",
        //     price: "$price.value",
        //     bids: "$bids.value",
        //     deadline: "$deadline.value",
        //     image: "$image",
        //     isActive: "$isActive",
        //   },
        // },
      ]);

      const searchedCars = await (
        Auctions as AggregatePaginateModel<Auction>
      ).aggregatePaginate(aggregate, { ...options, sort: { createdAt: -1 } });

      return NextResponse.json({
        total: searchedCars.totalDocs,
        totalPages: searchedCars.totalPages,
        cars: searchedCars.docs,
      });
    }

    if (make !== "All") {
      make = make.split("$");
    }

    if (era !== "All") {
      era = era.split("$");
    }

    if (category !== "All") {
      category = category.split("$");
    }

    if (location !== "All") {
      location = location.split("$");
    }

    // ============================================================================
    // STANDARD FILTER PATH (non-search queries)
    // ============================================================================
    // Filters (make, category, era, location) can be used in combination with each other
    // and with sort parameters.
    //
    // Multi-value filters use "$" as delimiter:
    //   - /api/auctions/filter?make=Porsche$Ferrari
    //   - /api/auctions/filter?location=New%20York$North%20Carolina
    //
    // Example combinations:
    //   - /api/auctions/filter?make=Porsche$Ferrari&sort=Most%20Bids
    //   - /api/auctions/filter?category=Sports%20Car&era=Modern&location=California
    //
    // NOTE: Filters are case-sensitive. Use exact values from database.
    // ============================================================================

    // Sort parameter processing
    if (sort) {
      switch (sort) {
        case "Newly Listed":
          sort = { createdAt: -1 };
          break;
        case "Ending Soon":
          sort = { "sort.deadline": 1 };
          break;
        case "Most Expensive":
          sort = { "sort.price": -1 };
          break;
        case "Least Expensive":
          sort = { "sort.price": 1 };
          break;
        case "Most Bids":
          sort = { "sort.bids": -1 };
          break;
        case "Least Bids":
          sort = { "sort.bids": 1 };
          break;
        // case "On Display":
        //   sort = { display: -1 };
        //   break;
        //other sorts here
        default:
          break;
      }
    }

    // ============================================================================
    // BUILD MONGODB QUERY
    // ============================================================================
    // The query structure combines:
    //   1. Context filtering (isPlatformTab vs publicOnly)
    //   2. Attribute filters (make, category, era, location)
    //   3. Deadline constraints
    //
    // The `attributes.$all` array will be populated with filter conditions below
    // ============================================================================
    let query: any = {};

    if (isPlatformTab === "true") {
      // ADMIN PLATFORM TAB: Show activated auctions (active OR ended)
      // Admins need to see both current and historical auctions for management
      query = {
        attributes: { $all: [] },  // Will be populated with filters below
        $or: [
          { isActive: true },   // Currently accepting predictions
          { ended: true },      // Completed auctions
        ],
      };
    } else if (publicOnly === "true") {
      // PUBLIC WEBSITE: Show only live prediction opportunities
      // Users should only see auctions they can currently predict on
      query = {
        attributes: { $all: [] },  // Will be populated with filters below
        isActive: true,             // Must be activated
        "sort.deadline": {
          $gt: now,                 // Must have future deadline
        },
      };
    } else {
      // ADMIN EXTERNAL FEED (default): Show auctions not yet on platform
      // This is the "staging area" where admins review external auctions
      // before activating them
      query = {
        attributes: { $all: [] },  // Will be populated with filters below
        $or: [
          { isActive: { $ne: true } },        // Explicitly not active
          { isActive: { $exists: false } }    // Legacy data without field
        ],
        "sort.deadline": {
          $gt: now,  // Only show auctions with future deadlines
        },
      };
    }
    // query = {
    //   attributes: { $all: [] },
    //   $or: [
    //     {
    //       isActive:
    //         isPlatformTab === "true"
    //           ? true
    //           : {
    //               $exists: true,
    //             },
    //     },
    //     {
    //       ended: true,
    //     },
    //   ],
    // };

    if (make !== "All") {
      query.attributes.$all.push({
        $elemMatch: { key: "make", value: { $in: make } },
      });
    }

    if (era !== "All") {
      query.attributes.$all.push({
        $elemMatch: { key: "era", value: { $in: era } },
      });
    }

    if (category !== "All") {
      query.attributes.$all.push({
        $elemMatch: { key: "category", value: { $in: category } },
      });
    }

    if (location !== "All") {
      query.attributes.$all.push({
        $elemMatch: { key: "state", value: { $in: location } },
      });
    }
    if (completed) {
      query.attributes.$all.push({
        $elemMatch: { key: "status", value: { $in: completed } },
      });
    }

    //const totalCars = await Auctions.countDocuments(query);

    // const filteredCars = await Auctions.find({
    //   $and: [query],
    // })
    //   .limit(limit)
    //   .skip(offset)
    //   .sort(sort as { [key: string]: SortOrder | { $meta: any } });

    const filteredCars = await (Auctions as PaginateModel<Auction>).paginate(
      query,
      {
        ...options,
        sort: sort as { [key: string]: SortOrder | { $meta: any } },
      }
    );

    return NextResponse.json({
      total: filteredCars.totalDocs,
      cars: filteredCars.docs,
      totalPages: filteredCars.totalPages,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
