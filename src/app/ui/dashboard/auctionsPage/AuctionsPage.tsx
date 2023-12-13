"use client";

import React, { useEffect, useState } from "react";

import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
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
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });

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
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));
    console.log("Toggle:", activeAuctions);
  }

  const headers = [
    { KEY: "auction_id", LABEL: "Auction ID" },
    { KEY: "price", LABEL: "Price" },
    { KEY: "year", LABEL: "Year" },
    { KEY: "make", LABEL: "Make" },
    { KEY: "model", LABEL: "Model" },
    { KEY: "category", LABEL: "Category" },
    { KEY: "location", LABEL: "Location" },
    { KEY: "deadline", LABEL: "Deadline" },
    { KEY: "bids", LABEL: "Current Bids" },
    { KEY: "isActive", LABEL: "Status" },
    { KEY: "toggle_status", LABEL: "Toggle Status" },
  ];

  function handleTableHeaderClick(header: { KEY: any; LABEL?: string }) {
    setSort({
      keyToSort: header.KEY,
      direction:
        header.KEY === sort.keyToSort
          ? sort.direction === "asc"
            ? "desc"
            : "asc"
          : "desc",
    });
  }

  function sortData(rowToSort: any[]) {
    const sortedData = [...rowToSort];
    if (sort.direction === "asc") {
      return sortedData.sort((a: any, b: any) =>
        a[sort.keyToSort] > b[sort.keyToSort] ? 1 : -1
      );
    }
    return sortedData.sort((a: any, b: any) =>
      a[sort.keyToSort] > b[sort.keyToSort] ? -1 : 1
    );
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
            {headers.map((header, index) => (
              <td
                key={index}
                className="tw-p-2.5 tw-font-bold"
                onClick={() => handleTableHeaderClick(header)}
              >
                <span>{header.LABEL}</span>
                {header.KEY === sort.keyToSort &&
                  (sort.direction === "asc" ? (
                    <ArrowDropDownIcon />
                  ) : (
                    <ArrowDropUpIcon />
                  ))}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortData(data).map((item, index) => (
            <tr key={index} className=" tw-rounded-lg tw-m-2 tw-bg-[#fff]/5">
              {headers.map((header, index) => (
                <td key={index} className="tw-p-2.5">
                  {header.KEY === "isActive" ? (
                    <span
                      style={{
                        color: activeAuctions[item.auction_id]
                          ? "green"
                          : "red",
                      }}
                    >
                      {activeAuctions[item.auction_id] ? "Active" : "Inactive"}
                    </span>
                  ) : header.KEY === "toggle_status" ? (
                    <button onClick={() => handleStatusToggle(item.auction_id)}>
                      {activeAuctions[item.auction_id] ? (
                        <ToggleOnIcon />
                      ) : (
                        <ToggleOffIcon />
                      )}
                    </button>
                  ) : (
                    item[header.KEY]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuctionsPage;
