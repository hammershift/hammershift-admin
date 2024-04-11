import React from "react";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { LiveAuctions } from "@/app/dashboard/live-games/page";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import { BeatLoader } from "react-spinners";

interface LiveGamesPageProps {
  liveAuctionsData: LiveAuctions[];
  handleLoadMore: () => void;
  isLoading: boolean;
}

const LiveGamesPage: React.FC<LiveGamesPageProps> = ({
  liveAuctionsData,
  handleLoadMore,
  isLoading,
}) => {
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
                          <button>
                            <ToggleOnIcon />
                          </button>
                        ) : (
                          liveAuction[header.KEY]
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
        </div>
      )}
    </div>
  );
};

export default LiveGamesPage;
