"use client";

import AuctionsPage from "@/app/ui/dashboard/auctionsPage/AuctionsPage";
import React, { useEffect, useState } from "react";
import { getCarsWithFilter } from "../../lib/data";
// import sampleData from "../../sample_data.json";

export interface CarData {
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
  const [totalCars, setTotalCars] = useState(0);
  const [displayCount, setDisplayCount] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [searchedKeyword, setSearchedKeyword] = useState<string>("");
  const [searchedData, setSearchedData] = useState<CarData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getCarsWithFilter({ limit: displayCount });

        if (data && "cars" in data) {
          console.log(data.total);
          setTotalCars(data.total);
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

  useEffect(() => {
    const fetchSearchedAuctions = async () => {
      console.log(`Fetching searched auctions for keyword: ${searchedKeyword}`);
      const response = await fetch(
        `/api/auctions/filter?search=${searchedKeyword}`
      );
      console.log("Response:", response);
      const data = await response.json();
      console.log("Data:", data);
      setSearchedData(data.cars as CarData[]);
    };

    if (searchedKeyword.length) {
      fetchSearchedAuctions();
    }
  }, [searchedKeyword]);

  const handleLoadMore = () => {
    setDisplayCount((prevCount) => prevCount + 50);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchedKeyword(e.target.value);
  };

  return (
    <AuctionsPage
      auctionData={carData}
      handleLoadMore={handleLoadMore}
      isLoading={isLoading}
      displayCount={displayCount}
      totalCars={totalCars}
      searchedData={searchedData}
      searchedKeyword={searchedKeyword}
      handleSearch={handleSearch}
    />
  );
};

export default Auctions;
