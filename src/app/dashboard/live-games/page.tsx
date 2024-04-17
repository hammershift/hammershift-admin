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
  const [sortType, setSortType] = useState<string>("On Display");
  const [searchedKeyword, setSearchedKeyword] = useState<string>("");
  const [searchedData, setSearchedData] = useState<LiveAuctions[]>([]);

  //Fetch Auction data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCarsWithFilter({
          limit: displayCount,
          sort: sortType,
        });

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
  }, [displayCount, sortType]);
  console.log("live auctions: ", liveAuctionsData);

  //Fetch Auction data based on searched keyword
  useEffect(() => {
    const fetchSearchedAuctions = async () => {
      console.log(`Fetching searched auctions for keyword: ${searchedKeyword}`);
      const response = await fetch(
        `/api/auctions/filter?search=${searchedKeyword}`
      );
      console.log("Response:", response);
      const data = await response.json();
      console.log("Data:", data);
      setSearchedData(data.cars as LiveAuctions[]);
    };

    if (searchedKeyword.length) {
      fetchSearchedAuctions();
    }
  }, [searchedKeyword]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchedKeyword(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortType(e.target.value);
  };

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
      handleSearch={handleSearch}
      searchedData={searchedData}
      searchedKeyword={searchedKeyword}
      handleSortChange={handleSortChange}
    />
  );
};

export default LiveGames;
