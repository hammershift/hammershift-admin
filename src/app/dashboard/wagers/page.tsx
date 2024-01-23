"use client";

import React, { Fragment, useEffect, useState } from "react";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getLimitedWagers,
  getWagers,
  getWagersWithSearch,
} from "@/app/lib/getWagers";
import Link from "next/link";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import AuctionModal from "@/app/ui/dashboard/modals/auction_modal";
import { useSession } from "next-auth/react";

interface WagerData {
  _id: string;
  auctionIdentifierId: string;
  priceGuessed: number;
  wagerAmount: number;
  user: {
    _id: string;
    fullName: string;
    username: string;
  };
  auctionID: string;
}
interface WagersPageProps {
  wagerData: WagerData[];
}

const WagersPage = () => {
  const [wagerData, setWagerData] = useState<WagerData[]>([]);
  const [searchValue, setSearchValue] = useState<null | string>(null);
  const [displayCount, setDisplayCount] = useState(8);

  const { data: session } = useSession(); // to get session

  console.log("Admin-role:", session?.user.role); // to get role

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLimitedWagers(displayCount);
        console.log("Wagers", data);
        if (data && "wagers" in data) {
          setWagerData(data.wagers as WagerData[]);
        } else {
          console.error("Unexpected data structure:", data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [displayCount]);

  // get users data with search value
  useEffect(() => {
    // console.log("searchValue:", searchValue);
    const getDataWithSearchValue = async () => {
      if (searchValue !== null && searchValue !== "") {
        try {
          const data = await getWagersWithSearch(searchValue);

          if (data) {
            // console.log("data:", data);
            setWagerData(data.wagers);
          } else {
            console.error("Unexpected data structure:", data);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    getDataWithSearchValue();
  }, [searchValue]);

  const handleNextClick = () => {
    setDisplayCount((prevCount) => prevCount + 7);
  };

  return (
    <Fragment>
      <div className="section-container tw-mt-4">
        <div className="tw-font-bold">Wagers</div>
        <div className="tw-w-auto tw-my-4 tw-self-center tw-relative">
          <div className="tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1">
            <Image
              src={magnifyingGlass}
              alt="magnifying glass"
              width={20}
              height={20}
            />
            <input
              placeholder={`Search wagers`}
              className="tw-bg-transparent focus:tw-outline-none"
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
        <div className="tw-my-4">
          <Table wagerData={wagerData} />
        </div>
        <div className="tw-flex tw-justify-center ">
          <div className="tw-flex tw-items-center tw-gap-4 tw-py-4">
            <button className="btn-transparent-white" onClick={handleNextClick}>
              Load More
            </button>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default WagersPage;

const Table: React.FC<WagersPageProps> = ({ wagerData }) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(
    null
  );

  const { data } = useSession();
  return (
    <div>
      {" "}
      <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
        <thead>
          <tr>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">
              Price Guessed
            </th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">
              Wager Amount
            </th>
            <th className="tw-p-2.5 tw-font-bold">Username</th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">User ID</th>
            <th className="tw-p-2.5 tw-font-bold">Auction ID</th>
            <th className="tw-p-2.5 tw-font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="tw-w-full">
          {wagerData &&
            wagerData.map((item, index) => (
              <tr key={index} className=" tw-rounded-lg tw-bg-[#fff]/5">
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  ${item.priceGuessed}
                </td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  ${item.wagerAmount}.00
                </td>
                <td className="tw-p-2.5 tw-w-1/8">{item.user.username}</td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  <p>{item.user._id}</p>
                </td>
                <td className="tw-p-2.5 tw-w-1/8">
                  <p>
                    {item.auctionIdentifierId
                      ? item.auctionIdentifierId
                      : item.auctionID}
                  </p>
                  <button
                    className="tw-rounded-md tw-bg-slate-500 tw-px-2 tw-text-xs"
                    onClick={() => {
                      setOpenModal(true);
                      setSelectedAuctionId(item.auctionIdentifierId);
                    }}
                  >
                    Show Auction Details
                  </button>
                </td>
                <td className="tw-p-2.5 tw-w-1/8">
                  {data?.user.role !== "guest" &&
                  data?.user.role !== "moderator" ? (
                    <div className="tw-flex tw-gap-4 tw-justify-center">
                      <Link href={`/dashboard/wagers/edit_wager/${item._id}`}>
                        <EditIcon />
                      </Link>
                      <Link href={`/dashboard/wagers/show_wager/${item._id}`}>
                        <DvrIcon />
                      </Link>
                      <Link href={`/dashboard/wagers/delete_wager/${item._id}`}>
                        <DeleteIcon sx={{ color: "#C2451E" }} />
                      </Link>
                    </div>
                  ) : (
                    <div className="tw-flex tw-gap-4 tw-justify-center">
                      <Link href={`/dashboard/wagers/show_wager/${item._id}`}>
                        <DvrIcon />
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <AuctionModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        id={selectedAuctionId || ""}
      />
    </div>
  );
};
