"use client";

import React, { useEffect, useState } from "react";
import AuctionsPage from "@/app/ui/dashboard/auctionsPage/AuctionsPage";
import { getCarsWithFilter } from "../../lib/data";
// import sampleData from "../../sample_data.json";

interface CarData {
    auction_id: string;
    price: number;
    year: string;
    make: string;
    model: string;
    category: string;
    location: string;
    bids: number;
    isActive: boolean;
    deadline: Date;
}

const Auctions = () => {
    const [carData, setCarData] = useState<CarData[]>([]);
    const [displayCount, setDisplayCount] = useState(7);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getCarsWithFilter({ limit: displayCount });

                if (data && "cars" in data) {
                    console.log(data);
                    setCarData(data.cars as CarData[]);
                    setIsLoading(false);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [displayCount]);

    const handleLoadMore = () => {
        setDisplayCount((prevCount) => prevCount + 7);
    };

    return (
        <AuctionsPage
            auctionData={carData}
            handleLoadMore={handleLoadMore}
            isLoading={isLoading}
        />
    );
};

export default Auctions;
