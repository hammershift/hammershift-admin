"use client";

import React, { useEffect, useState } from "react";
import AuctionsPage from "@/app/ui/dashboard/auctionsPageNew/AuctionsPage";
import { getCarsWithFilter } from "../../lib/data";
// import sampleData from "../../sample_data.json";

export interface CarData {
  _id: string;
  auction_id: string;
  description: string[];
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
  ended: boolean;
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
  const [currentTab, setCurrentTab] = useState<string>("external");
  const [refreshToggle, setRefreshToggle] = useState<boolean>(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        //load auction for external tab
        const data = await getCarsWithFilter({
          search: searchedKeyword,
          offset: searchedKeyword !== oldKeyword ? 0 : (currentPage - 1) * 9,
          limit: displayCount,
          isPlatformTab: currentTab === "platform",
        });
        if (searchedKeyword !== oldKeyword) {
          setOldKeyword(searchedKeyword);
        }
        if (data && "cars" in data) {
          setTotalCars(data.total);
          setTotalPages(data.totalPages);
          setCarData(data.cars as CarData[]);
        } else {
          console.error("Unexpected data structure:", data);
        }
        //}
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentPage, searchedKeyword, currentTab, refreshToggle]);

  // useEffect(() => {
  //   const fetchSearchedAuctions = async () => {};

  //   if (searchedKeyword.length) {
  //     fetchSearchedAuctions();
  //   }
  // }, [searchedKeyword]);

  const handleSearch = (e: string) => {
    setSearchedKeyword(e);
  };

  return (
    <AuctionsPage
      auctionData={carData}
      currentPage={currentPage}
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      totalPages={totalPages}
      isLoading={isLoading}
      refreshToggle={refreshToggle}
      searchedKeyword={searchedKeyword}
      setCurrentPage={setCurrentPage}
      setRefreshToggle={setRefreshToggle}
      handleSearch={handleSearch}
    />
  );
};

export default Auctions;
