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
}

const LiveGamesPage: React.FC<LiveGamesPageProps> = ({
  liveAuctionsData,
  handleLoadMore,
  isLoading,
  displayCount,
  totalAuctions,
}) => {
  const [auctionsInDisplay, setAuctionsInDisplay] = useState<{
    [key: string]: boolean;
  }>({});

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
            placeholder="Search for Auctions"
            className="tw-bg-transparent focus:tw-outline-none"
          />
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
              {liveAuctionsData &&
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
