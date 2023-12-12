"use client";

import React, { useEffect, useState } from "react";

import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import Search from "../search/Search";

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

interface AuctionsPageProps {
  data: CarData[];
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({ data }) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const initialActiveAuctions = data.reduce(
      (acc, item) => ({
        ...acc,
        [item.auction_id]: item.isActive,
      }),
      {}
    );

    setActiveAuctions(initialActiveAuctions);
  }, [data]);

  function handleStatusToggle(id: string) {
    console.log("Before Toggle:", activeAuctions);
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));
    console.log("After Toggle:", activeAuctions);
  }

  return (
    <div className="section-container tw-mt-4">
      <div className="tw-flex tw-justify-between">
        <h2 className="tw-font-bold tw-text-yellow-500 tw-text-xl tw-m-2">
          Auction List
        </h2>
        <Search placeholder="auctions" />
      </div>

      <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-left">
        <thead>
          <tr>
            <td className="tw-p-2.5 tw-font-bold">Auction ID</td>
            <td className="tw-p-2.5 tw-font-bold">Price</td>
            <td className="tw-p-2.5 tw-font-bold">Car</td>
            <td className="tw-p-2.5 tw-font-bold">Category</td>
            <td className="tw-p-2.5 tw-font-bold">Location</td>
            <td className="tw-p-2.5 tw-font-bold">Deadline</td>
            <td className="tw-p-2.5 tw-font-bold">Current Bids</td>
            <td className="tw-p-2.5 tw-font-bold">Status</td>
            <td className="tw-p-2.5 tw-font-bold">Toggle Status</td>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.auction_id}
              className=" tw-rounded-lg tw-m-2 tw-bg-[#fff]/5"
            >
              <td className="tw-p-2.5">{item.auction_id}</td>
              <td className="tw-p-2.5">${item.price}</td>
              <td className="tw-p-2.5">
                {item.year} {item.make} {item.model}
              </td>
              <td className="tw-p-2.5">{item.category}</td>
              <td className="tw-p-2.5">{item.location}</td>
              <td className="tw-p-2.5">{item.deadline.toLocaleString()}</td>
              <td className="tw-p-2.5">{item.bids}</td>
              <td className="tw-p-2.5">
                {activeAuctions[item.auction_id] ? (
                  <p className="tw-text-green-500">Active</p>
                ) : (
                  <p className="tw-text-red-500">Inactive</p>
                )}
              </td>
              <td className="tw-p-2.5">
                {activeAuctions[item.auction_id] ? (
                  <ToggleOnIcon
                    onClick={() => handleStatusToggle(item.auction_id)}
                  />
                ) : (
                  <ToggleOffIcon
                    onClick={() => handleStatusToggle(item.auction_id)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuctionsPage;
