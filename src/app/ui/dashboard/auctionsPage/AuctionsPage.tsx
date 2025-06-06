"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AuctionModal from "../modals/auction_modal";
import { useSession } from "next-auth/react";
import { BeatLoader } from "react-spinners";
import { CarData } from "@/app/dashboard/auctions/page";
import { updateAuctionStatus, promptAgentPredictions } from "@/app/lib/data";

interface AuctionsPageProps {
  auctionData: CarData[];
  handleLoadMore: () => void;
  isLoading: boolean;
  displayCount: number;
  totalCars: number;
  searchedData: CarData[];
  searchedKeyword: String;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({
  auctionData: auctionData,
  handleLoadMore,
  isLoading,
  displayCount,
  totalCars,
  searchedData,
  searchedKeyword,
  handleSearch,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });

  const [viewportWidth, setViewportWidth] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState("");

  const { data } = useSession();

  useEffect(() => {
    setViewportWidth(window.innerWidth);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const initialActiveAuctions = searchedKeyword
      ? searchedData.reduce(
          (acc, item) => ({
            ...acc,
            [item.auction_id]: item.isActive,
          }),
          {}
        )
      : auctionData.reduce(
          (acc, item) => ({
            ...acc,
            [item.auction_id]: item.isActive,
          }),
          {}
        );

    setActiveAuctions(initialActiveAuctions);
  }, [auctionData, searchedData, searchedKeyword]);

  async function handleStatusToggle(id: string) {
    const auction = searchedKeyword
      ? searchedData.find((x) => x.auction_id === id)
      : auctionData.find((x) => x.auction_id === id);

    if (!auction) {
      alert("Auction not found");
      console.error("Auction not found");
      return;
    }
    if (
      !auction.isActive &&
      Date.parse(auction.deadline.toString()) < Date.now()
    ) {
      alert("Deadline has passed for this auction");
      return;
    }
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));
    console.log(activeAuctions);
    try {
      await updateAuctionStatus(id, !activeAuctions[id]);
      if (!activeAuctions[id]) {
        await promptAgentPredictions(id);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const headers =
    viewportWidth > 768
      ? [
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
          ...(data?.user?.role !== "guest" && data?.user?.role !== "moderator"
            ? [{ KEY: "toggle_status", LABEL: "Toggle Status" }]
            : []),
        ]
      : [
          { KEY: "auction_id", LABEL: "Auction ID" },
          { KEY: "isActive", LABEL: "Status" },
          ...(data?.user?.role !== "guest" && data?.user?.role !== "moderator"
            ? [{ KEY: "toggle_status", LABEL: "Toggle Status" }]
            : []),
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
    <div className="section-container mt-4">
      <div className="flex flex-col justify-between">
        <h2 className="font-bold text-yellow-500 text-xl m-2">Auction List</h2>
        <div className="bg-[#fff]/20 h-auto flex px-2 py-1.5 rounded gap-1">
          <Image
            src={magnifyingGlass}
            alt="magnifying glass"
            width={20}
            height={20}
          />
          <input
            type="text"
            placeholder="Search for Auctions"
            className="bg-transparent focus:outline-none"
            onChange={handleSearch}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-[618px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <table className="w-full border-separate border-spacing-y-2 text-center table-auto">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <td
                  key={index}
                  className="p-2.5 font-bold"
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
            {searchedKeyword
              ? sortData(searchedData).map((item, index) => (
                  <tr key={index} className="rounded-lg m-2 bg-[#fff]/5">
                    {headers.map((header, index) => (
                      <td key={index} className="p-2.5">
                        {header.KEY === "auction_id" ? (
                          <span
                            onClick={() => {
                              setShowModal(true);
                              setSelectedAuctionId(item.auction_id);
                            }}
                            className="hover: cursor-pointer"
                          >
                            {item[header.KEY]}
                          </span>
                        ) : header.KEY === "toggle_status" ? (
                          <button
                            onClick={() => handleStatusToggle(item.auction_id)}
                          >
                            {activeAuctions[item.auction_id] ? (
                              <ToggleOnIcon />
                            ) : (
                              <ToggleOffIcon />
                            )}
                          </button>
                        ) : header.KEY === "isActive" ? (
                          <span
                            style={{
                              color: activeAuctions[item.auction_id]
                                ? "green"
                                : "red",
                            }}
                          >
                            {activeAuctions[item.auction_id]
                              ? "Active"
                              : "Inactive"}
                          </span>
                        ) : (
                          item[header.KEY]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              : sortData(auctionData).map((item, index) => (
                  <tr key={index} className="rounded-lg m-2 bg-[#fff]/5">
                    {headers.map((header, index) => (
                      <td key={index} className="p-2.5">
                        {header.KEY === "auction_id" ? (
                          <span
                            onClick={() => {
                              setShowModal(true);
                              setSelectedAuctionId(item.auction_id);
                            }}
                            className="hover: cursor-pointer"
                          >
                            {item[header.KEY]}
                          </span>
                        ) : header.KEY === "toggle_status" ? (
                          <button
                            onClick={() => handleStatusToggle(item.auction_id)}
                          >
                            {activeAuctions[item.auction_id] ? (
                              <ToggleOnIcon />
                            ) : (
                              <ToggleOffIcon />
                            )}
                          </button>
                        ) : header.KEY === "isActive" ? (
                          <span
                            style={{
                              color: activeAuctions[item.auction_id]
                                ? "green"
                                : "red",
                            }}
                          >
                            {activeAuctions[item.auction_id]
                              ? "Active"
                              : "Inactive"}
                          </span>
                        ) : (
                          item[header.KEY]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col items-center justify-center gap-4 py-4">
        {displayCount >= totalCars ? (
          <p>
            Showing {totalCars} out of {totalCars}
          </p>
        ) : (
          <p>
            Showing {displayCount} out of {totalCars}
          </p>
        )}
        <button className="btn-transparent-white" onClick={handleLoadMore}>
          Load More
        </button>
      </div>
      {showModal && (
        <AuctionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          id={selectedAuctionId}
        />
      )}
    </div>
  );
};

export default AuctionsPage;
