"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { LiveAuctions } from "@/app/dashboard/live-games/page";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import { BeatLoader } from "react-spinners";
import { toggleAuctionDisplay } from "@/app/lib/data";

interface LiveGamesPageProps {
  liveAuctionsData: LiveAuctions[];
  handleLoadMore: () => void;
  isLoading: boolean;
  displayCount: number;
  totalAuctions: number;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchedData: LiveAuctions[];
  searchedKeyword: string;
  handleSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const LiveGamesPage: React.FC<LiveGamesPageProps> = ({
  liveAuctionsData,
  handleLoadMore,
  isLoading,
  displayCount,
  totalAuctions,
  handleSearch,
  searchedData,
  searchedKeyword,
  handleSortChange,
}) => {
  const [auctionsInDisplay, setAuctionsInDisplay] = useState<{
    [key: string]: boolean;
  }>({});

  // Show correct display status of auctions
  useEffect(() => {
    const initialAuctionsInDisplay = liveAuctionsData.reduce(
      (acc, item) => ({
        ...acc,
        [item.auction_id]: item.display,
      }),
      {}
    );
    setAuctionsInDisplay(initialAuctionsInDisplay);
  }, [liveAuctionsData]);

  async function handleDisplayToggle(id: string) {
    // Calculate the current count of auctions in display
    const auctionsInDisplayCount =
      Object.values(auctionsInDisplay).filter(Boolean).length;

    // Check if the count is 5 or more and the toggle is trying to set to true
    if (auctionsInDisplayCount >= 5 && !auctionsInDisplay[id]) {
      // Optionally display an alert
      alert("Maximum of 5 auctions to display");
      // Prevent the toggle action
      return;
    }

    setAuctionsInDisplay((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));

    console.log("auctions in display: ", auctionsInDisplay);
    try {
      await toggleAuctionDisplay(id, !auctionsInDisplay[id]);
    } catch (error) {
      console.error(error);
    }
  }

  const headers = [
    { KEY: "image", LABEL: "Image" },
    { KEY: "auction_id", LABEL: "Auction ID" },
    { KEY: "price", LABEL: "Price" },
    { KEY: "year", LABEL: "Year" },
    { KEY: "make", LABEL: "Make" },
    { KEY: "model", LABEL: "Model" },
    { KEY: "deadline", LABEL: "Deadline" },
    { KEY: "bids", LABEL: "Current Bids" },
    { KEY: "display", LABEL: "Display" },
    { KEY: "toggle_display", LABEL: "Toggle Display" },
  ];
  return (
    <div className="section-container tw-mt-4">
      <div className="tw-flex tw-flex-col tw-justify-between">
        <h2 className="tw-font-bold tw-text-yellow-500 tw-text-xl tw-m-2">
          Live Games List
        </h2>
        <div className="tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1">
          <Image
            src={magnifyingGlass}
            alt="magnifying glass"
            width={20}
            height={20}
          />
          <input
            type="text"
            placeholder="Search by Year, Make, Model..."
            className="tw-bg-transparent focus:tw-outline-none tw-w-full"
            onChange={handleSearch}
          />
        </div>
        <div className="tw-flex tw-mt-5 tw-justify-start tw-items-center">
          <p>Sort by:</p>
          <select
            className="tw-mx-2 tw-rounded-sm tw-text-black"
            onChange={handleSortChange}
          >
            <option value="On Display">On Display</option>
            <option value="Newly Listed">Most Recent</option>
            <option value="Most Bids">Most Popular</option>
            <option value="Ending Soon">Ending Soon</option>
          </select>
        </div>
      </div>
      {isLoading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-h-[618px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <div>
          <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center tw-table-auto">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <td key={index} className="tw-p-2.5 tw-font-bold">
                    {header.LABEL}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {searchedKeyword
                ? searchedData &&
                  searchedData.map((liveAuction) => (
                    <tr
                      key={liveAuction.auction_id}
                      className="tw-rounded-lg tw-m-2 tw-bg-[#fff]/5"
                    >
                      {headers.map((header, index) => (
                        <td key={index} className="tw-p-2.5 tw-content-center">
                          {header.KEY === "image" ? (
                            <Image
                              src={liveAuction[header.KEY]}
                              alt="Auction Image"
                              width={175}
                              height={175}
                            />
                          ) : header.KEY === "price" ? (
                            <span>
                              $
                              {Intl.NumberFormat("en-US").format(
                                liveAuction.price
                              )}
                            </span>
                          ) : header.KEY === "toggle_display" ? (
                            <button
                              onClick={() =>
                                handleDisplayToggle(liveAuction.auction_id)
                              }
                            >
                              {auctionsInDisplay[liveAuction.auction_id] ? (
                                <ToggleOnIcon />
                              ) : (
                                <ToggleOffIcon />
                              )}
                            </button>
                          ) : header.KEY === "display" ? (
                            <span
                              style={{
                                color: auctionsInDisplay[liveAuction.auction_id]
                                  ? "green"
                                  : "red",
                              }}
                            >
                              {auctionsInDisplay[liveAuction.auction_id]
                                ? "Displayed"
                                : "Not Displayed"}
                            </span>
                          ) : (
                            liveAuction[header.KEY]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                : liveAuctionsData &&
                  liveAuctionsData.map((liveAuction) => (
                    <tr
                      key={liveAuction.auction_id}
                      className="tw-rounded-lg tw-m-2 tw-bg-[#fff]/5"
                    >
                      {headers.map((header, index) => (
                        <td key={index} className="tw-p-2.5 tw-content-center">
                          {header.KEY === "image" ? (
                            <Image
                              src={liveAuction[header.KEY]}
                              alt="Auction Image"
                              width={175}
                              height={175}
                            />
                          ) : header.KEY === "price" ? (
                            <span>
                              $
                              {Intl.NumberFormat("en-US").format(
                                liveAuction.price
                              )}
                            </span>
                          ) : header.KEY === "toggle_display" ? (
                            <button
                              onClick={() =>
                                handleDisplayToggle(liveAuction.auction_id)
                              }
                            >
                              {auctionsInDisplay[liveAuction.auction_id] ? (
                                <ToggleOnIcon />
                              ) : (
                                <ToggleOffIcon />
                              )}
                            </button>
                          ) : header.KEY === "display" ? (
                            <span
                              style={{
                                color: auctionsInDisplay[liveAuction.auction_id]
                                  ? "green"
                                  : "red",
                              }}
                            >
                              {auctionsInDisplay[liveAuction.auction_id]
                                ? "Displayed"
                                : "Not Displayed"}
                            </span>
                          ) : (
                            liveAuction[header.KEY]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4 tw-py-4">
            {displayCount >= totalAuctions ? (
              <p>
                Showing {totalAuctions} out of {totalAuctions}
              </p>
            ) : (
              <p>
                Showing {displayCount} out of {totalAuctions}
              </p>
            )}
            <button className="btn-transparent-white" onClick={handleLoadMore}>
              Load More
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveGamesPage;
