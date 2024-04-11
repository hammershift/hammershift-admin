"use client";

import { getCarsWithFilter } from "@/app/lib/data";
import LiveGamesPage from "@/app/ui/dashboard/liveGamesPage/LiveGamesPage";
import React, { useEffect, useState } from "react";

export interface LiveAuctions {
  [key: string]: any;
  image: string;
  auction_id: string;
  price: number;
  year: string;
  make: string;
  model: string;
  bids: number;
  isActive: boolean;
  deadline: Date;
  display: boolean;
}

const LiveGames = () => {
  const [liveAuctionsData, setLiveAuctionsData] = useState<LiveAuctions[]>([]);
  const [displayCount, setDisplayCount] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAuctions, setTotalAuctions] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCarsWithFilter({ limit: displayCount });

        if (data && "cars" in data) {
          console.log(data);
          setTotalAuctions(data.total);
          setLiveAuctionsData(data.cars as LiveAuctions[]);
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

  console.log("live auctions: ", liveAuctionsData)

  const handleLoadMore = () => {
    setDisplayCount((prevCount) => prevCount + 7);
  };

  return (
    <LiveGamesPage
      liveAuctionsData={liveAuctionsData}
      handleLoadMore={handleLoadMore}
      isLoading={isLoading}
      displayCount={displayCount}
      totalAuctions={totalAuctions}
    />
  );
};

export default LiveGames;
