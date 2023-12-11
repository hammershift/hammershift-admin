"use client";

import React, { useEffect, useState } from "react";

import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import Search from "../search/Search";

interface AuctionItem {
  _id: {
    $oid: string;
  };
  attributes: {
    key: string;
    value: number | string | { $date: string };
    _id: { $oid: string };
  }[];
  isActive: boolean;
  __v: number;
}

interface AuctionsPageProps {
  data: AuctionItem[];
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({ data }) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const initialActiveAuctions = data.reduce(
      (acc, item) => ({
        ...acc,
        [item._id.$oid]: item.isActive,
      }),
      {}
    );

    setActiveAuctions(initialActiveAuctions);
  }, [data]);

  function getValue(item: any, key: any) {
    const attr = item.attributes.find((attr: any) => attr.key === key);
    if (attr) {
      const value = attr.value;
      if (typeof value === "object" && "$date" in value) {
        return value.$date;
      } else {
        return value.toString();
      }
    }
    return "";
  }

  function handleStatusToggle(itemId: string) {
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [itemId]: !prevStates[itemId],
    }));
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
              key={item._id.$oid}
              className=" tw-rounded-lg tw-m-2 tw-bg-[#fff]/5"
            >
              <td className="tw-p-2.5">{item._id.$oid}</td>
              <td className="tw-p-2.5">${getValue(item, "price")}</td>
              <td className="tw-p-2.5">
                {getValue(item, "year")} {getValue(item, "make")}{" "}
                {getValue(item, "model")}
              </td>
              <td className="tw-p-2.5">{getValue(item, "category")}</td>
              <td className="tw-p-2.5">{getValue(item, "location")}</td>
              <td className="tw-p-2.5">{getValue(item, "deadline")}</td>
              <td className="tw-p-2.5">{getValue(item, "bids")}</td>
              <td className="tw-p-2.5">
                {activeAuctions[item._id.$oid] ? (
                  <p className="tw-text-green-500">Active</p>
                ) : (
                  <p className="tw-text-red-500">Inactive</p>
                )}
              </td>
              <td className="tw-p-2.5">
                {activeAuctions[item._id.$oid] ? (
                  <ToggleOnIcon
                    onClick={() => handleStatusToggle(item._id.$oid)}
                  />
                ) : (
                  <ToggleOffIcon
                    onClick={() => handleStatusToggle(item._id.$oid)}
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
