import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import { SortOrder } from "mongoose";
import { ObjectId } from "mongodb";

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SortQuery {
    createdAt?: number;
    "sort.price"?: number;
    "sort.deadline"?: number;
    "sort.bids"?: number;
}

//Sample URL for tournament: api/auctions/filter?tournament_id=65cd6a5f26debfcee70dd52d

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        // await connectToDB();
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit")) || 7;
        const searchedKeyword = req.nextUrl.searchParams.get("search");
        const tournamentID = req.nextUrl.searchParams.get("tournament_id");
        let completed = req.nextUrl.searchParams.get("completed") || [1];
        let era: string | string[] =
            req.nextUrl.searchParams.get("era") || "All";
        let category: string | string[] =
            req.nextUrl.searchParams.get("category") || "All";
        let make: string | string[] =
            req.nextUrl.searchParams.get("make") || "All";
        let location: string | string[] =
            req.nextUrl.searchParams.get("location") || "All";
        let sort: string | SortQuery =
            req.nextUrl.searchParams.get("sort") || "Newly Listed";

        if (tournamentID) {
            const tournamentAuctions = await Auctions.find({
                tournamentID: tournamentID,
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

        if (completed) {
            if (completed === "true") {
                completed = [2];
            }
            if (completed === "false") {
                completed = [1];
            }
            if (completed === "all") {
                completed = [1, 2];
            }
        }

        // SEARCH is NOT used in combination with other filters EXCEPT completed filter (completed=true === status: 2 and vice versa)
        //api/cars/filter?search=911 Coupe or api/cars/filter?search=911%20Coupe
        //api/cars/filter?search=911%20Coupe&completed=true
        //(search queries are case insensitive) api/cars/filter?search=land%20cruiser&completed=true

        if (searchedKeyword) {
            const searchedCars = await Auctions.aggregate([
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
                    $project: {
                        _id: 0,
                        auction_id: 1,
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
                        price: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$attributes",
                                        cond: { $eq: ["$$this.key", "price"] },
                                    },
                                },
                                0,
                            ],
                        },
                        bids: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$attributes",
                                        cond: { $eq: ["$$this.key", "bids"] },
                                    },
                                },
                                0,
                            ],
                        },
                        deadline: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$attributes",
                                        cond: {
                                            $eq: ["$$this.key", "deadline"],
                                        },
                                    },
                                },
                                0,
                            ],
                        },
                    },
                },
                {
                    $project: {
                        auction_id: 1,
                        make: "$make.value",
                        model: "$model.value",
                        year: "$year.value",
                        price: "$price.value",
                        bids: "$bids.value",
                        deadline: "$deadline.value",
                    },
                },
            ]);

            return NextResponse.json({
                total: searchedCars.length,
                cars: searchedCars,
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

        //ALL filters can be used in combination with other filters including sort (filters and sort are case sensitive)
        //use the delimiter "$" when filter mutiple makes, era, category or location
        //use "%20" or " " for 2-word queries
        //for ex. api/cars/filter?make=Porsche$Ferrari&location=New%20York$North%20Carolina&sort=Most%20Bids
        //if you don't add a sort query, it automatically defaults to sorting by Newly Listed for now

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
                //other sorts here
                default:
                    break;
            }
        }

        //ALL filters can be used in combination with other filters including sort (filters and sort are case sensitive)
        //use the delimiter "$" when filter mutiple makes, era, category or location
        //use "%20" or " " for 2-word queries
        //for ex. api/cars/filter?make=Porsche$Ferrari&location=New%20York$North%20Carolina&sort=Most%20Bids
        //if you don't add a sort query, it automatically defaults to sorting by Newly Listed for now
        let query: any = { attributes: { $all: [] } };

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

        const totalCars = await db.collection("auctions").countDocuments(query);

        const filteredCars = await db
            .collection("auctions")
            .find({
                $and: [query, { isActive: true }],
            })
            .limit(limit)
            .skip(offset)
            .sort(sort as { [key: string]: SortOrder | { $meta: any } });

        const arrayCars = await filteredCars.toArray();

        console.log(filteredCars);
        return NextResponse.json({ total: totalCars, cars: arrayCars });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
