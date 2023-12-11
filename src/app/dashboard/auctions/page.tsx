import AuctionsPage from "@/app/ui/dashboard/auctionsPage/AuctionsPage";
import React from "react";
import sampleData from "../../sample_data.json";

const Auctions = () => {
  return <AuctionsPage data={sampleData} />;
};

export default Auctions;
