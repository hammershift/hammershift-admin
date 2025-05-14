"use client";

import React, { useEffect, useState } from "react";
import AuctionsPage from "@/app/ui/dashboard/auctionsPageNew/AuctionsPage";
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
  image: string;
  page_url: string;
  isActive: boolean;
  deadline: Date;
}

const Auctions = () => {
  const [carData, setCarData] = useState<CarData[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCars, setTotalCars] = useState(0);
  const [displayCount, setDisplayCount] = useState(9);
  const [isLoading, setIsLoading] = useState(true);
  const [searchedKeyword, setSearchedKeyword] = useState<string>("");
  const [oldKeyword, setOldKeyword] = useState<string>("");
  const [searchedData, setSearchedData] = useState<CarData[]>([]);
  const [currentState, setCurrentState] = useState<string>("all");
  useEffect(() => {
    const fetchData = async () => {
      try {
        // if (searchedKeyword.length) {
        //   console.log(
        //     `Fetching searched auctions for keyword: ${searchedKeyword}`
        //   );
        //   const response = await fetch(
        //     `/api/auctions/filter?search=${searchedKeyword}`
        //   );
        //   const data = await response.json();

        //   setTotalCars(data.total);
        //   setTotalPages(data.totalPages);
        //   setCarData(data.cars as CarData[]);
        //   setIsLoading(false);
        // } else {
        setIsLoading(true);
        const data = await getCarsWithFilter({
          search: searchedKeyword,
          offset: searchedKeyword !== oldKeyword ? 0 : (currentPage - 1) * 9,
          limit: displayCount,
        });
        if (searchedKeyword !== oldKeyword) {
          setOldKeyword(searchedKeyword);
        }
        if (data && "cars" in data) {
          setTotalCars(data.total);
          setTotalPages(data.totalPages);
          setCarData(data.cars as CarData[]);
          setIsLoading(false);
        } else {
          setIsLoading(false);
          console.error("Unexpected data structure:", data);
        }
        //}
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [currentPage, searchedKeyword]);

  // useEffect(() => {
  //   const fetchSearchedAuctions = async () => {};

  //   if (searchedKeyword.length) {
  //     fetchSearchedAuctions();
  //   }
  // }, [searchedKeyword]);

  const handleLoadMore = () => {
    setDisplayCount((prevCount) => prevCount + 7);
  };

  const handleSearch = (e: string) => {
    setSearchedKeyword(e);
  };

  return (
    <AuctionsPage
      auctionData={carData}
      handleLoadMore={handleLoadMore}
      currentPage={currentPage}
      totalPages={totalPages}
      isLoading={isLoading}
      displayCount={displayCount}
      totalCars={totalCars}
      searchedData={searchedData}
      searchedKeyword={searchedKeyword}
      setCurrentPage={setCurrentPage}
      handleSearch={handleSearch}
    />
  );
};

export default Auctions;
