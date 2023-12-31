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

  const fetchData = async () => {
    try {
      const data = await getCarsWithFilter({ limit: 21 });

      if (data && "cars" in data) {
        console.log(data);
        setCarData(data.cars as CarData[]);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return <AuctionsPage data={carData} />;
};

export default Auctions;
