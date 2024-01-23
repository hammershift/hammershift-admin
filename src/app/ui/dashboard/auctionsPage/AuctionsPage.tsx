"use client";

import React, { useEffect, useState } from "react";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import AuctionModal from "../modals/auction_modal";
import { useSession } from "next-auth/react";

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
  auctionData: CarData[];
  handleLoadMore: () => void;
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({
  auctionData: auctionData,
  handleLoadMore,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });
  const [searchTerm, setSearchTerm] = useState("");
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
    const initialActiveAuctions = auctionData.reduce(
      (acc, item) => ({
        ...acc,
        [item.auction_id]: item.isActive,
      }),
      {}
    );
    setActiveAuctions(initialActiveAuctions);
  }, [auctionData]);

  async function handleStatusToggle(id: string) {
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));
    console.log(activeAuctions);
    try {
      await updateAuctionStatus(id, !activeAuctions[id]);
    } catch (error) {
      console.error(error);
    }
  }

  async function updateAuctionStatus(auction_id: string, isActive: boolean) {
    const response = await fetch(`/api/auctions?auction_id=${auction_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive }),
    });

    if (!response.ok) {
      throw new Error("Failed to update auction status");
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

  const filteredData = auctionData.filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  function handleSearch(e: {
    target: { value: React.SetStateAction<string> };
  }) {
    setSearchTerm(e.target.value);
  }

  return (
    <div className="section-container tw-mt-4">
      <div className="tw-flex tw-justify-between">
        <h2 className="tw-font-bold tw-text-yellow-500 tw-text-xl tw-m-2">
          Auction List
        </h2>
        <input
          type="text"
          placeholder="Search for Auctions"
          className="tw-text-black tw-pl-2 tw-rounded-full tw-w-auto max-md:tw-w-1/2"
          onChange={handleSearch}
        />
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
          {sortData(filteredData).map((item, index) => (
            <tr key={index} className="tw-rounded-lg tw-m-2 tw-bg-[#fff]/5">
              {headers.map((header, index) => (
                <td key={index} className="tw-p-2.5">
                  {header.KEY === "auction_id" ? (
                    <span
                      onClick={() => {
                        setShowModal(true);
                        setSelectedAuctionId(item.auction_id);
                      }}
                      className="hover: tw-cursor-pointer"
                    >
                      {item[header.KEY]}
                    </span>
                  ) : header.KEY === "toggle_status" ? (
                    <button onClick={() => handleStatusToggle(item.auction_id)}>
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
                      {activeAuctions[item.auction_id] ? "Active" : "Inactive"}
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
      <div className="tw-flex tw-items-center tw-justify-center tw-gap-4 tw-py-4">
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
