"use client";

import React, { Fragment, useEffect, useState } from "react";
import { DateTime } from "luxon";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getLimitedWagers,
  getWagers,
  getWagersWithSearch,
} from "@/app/lib/data";
import Link from "next/link";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import AuctionModal from "@/app/ui/dashboard/modals/auction_modal";
import { useSession } from "next-auth/react";
import { BounceLoader, BeatLoader } from "react-spinners";

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
  createdAt: string;
}
interface WagersPageProps {
  wagerData: WagerData[];
}

const WagersPage = () => {
  const [wagerData, setWagerData] = useState<WagerData[]>([]);
  const [searchValue, setSearchValue] = useState<null | string>(null);
  const [displayCount, setDisplayCount] = useState(8);
  const [isLoading, setIsLoading] = useState(true);

  const { data: session } = useSession(); // to get session

  // console.log("Admin-role:", session?.user.role); // to get role

  // get wagers data from db
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLimitedWagers(displayCount);
        if (data && "wagers" in data) {
          setWagerData(data.wagers as WagerData[]);
          setIsLoading(false);
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
      <div className="section-container mt-4">
        <div className="font-bold">Wagers</div>
        <div className="w-auto my-4 self-center relative">
          <div className="bg-[#fff]/20 h-auto flex px-2 py-1.5 rounded gap-1">
            <Image
              src={magnifyingGlass}
              alt="magnifying glass"
              width={20}
              height={20}
            />
            <input
              placeholder={`Search wagers`}
              className="bg-transparent focus:outline-none"
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
        <div className="my-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-[592px]">
              <BeatLoader color="#F2CA16" />
            </div>
          ) : (
            <Table wagerData={wagerData} />
          )}
        </div>
        <div className="flex justify-center ">
          <div className="flex items-center gap-4 py-4">
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
      <table className="w-full border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <th className="p-2.5 font-bold max-md:hidden">Date</th>
            <th className="p-2.5 font-bold max-md:hidden">Price Guessed</th>
            <th className="p-2.5 font-bold max-md:hidden">Wager Amount</th>
            <th className="p-2.5 font-bold">Username</th>
            <th className="p-2.5 font-bold max-md:hidden">User ID</th>
            <th className="p-2.5 font-bold">Auction ID</th>
            <th className="p-2.5 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="w-full">
          {wagerData &&
            wagerData.map((item, index) => (
              <tr key={index} className=" rounded-lg bg-[#fff]/5">
                <td className="p-2.5 w-1/8 max-md:hidden">
                  {DateTime.fromISO(item.createdAt).toFormat("MM/dd/yy")}
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  ${item.priceGuessed}
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  ${item.wagerAmount}.00
                </td>
                <td className="p-2.5 w-1/8 truncate">{item.user.username}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <p>{item.user._id}</p>
                </td>
                <td className="p-2.5 w-1/8">
                  <p>
                    {item.auctionIdentifierId
                      ? item.auctionIdentifierId
                      : item.auctionID}
                  </p>
                  <button
                    className="rounded-md bg-slate-500 px-2 text-xs max-md:hidden"
                    onClick={() => {
                      setOpenModal(true);
                      setSelectedAuctionId(item.auctionIdentifierId);
                    }}
                  >
                    Show Auction Details
                  </button>
                </td>
                <td className="p-2.5 w-1/8">
                  {data?.user.role !== "guest" &&
                  data?.user.role !== "moderator" ? (
                    <div className="flex gap-2 md:gap-4 justify-center">
                      {/* <Link
                                                href={`/dashboard/wagers/edit_wager/${item._id}`}
                                            >
                                                <EditIcon />
                                            </Link> */}
                      <Link href={`/dashboard/wagers/show_wager/${item._id}`}>
                        <DvrIcon />
                      </Link>
                      <Link href={`/dashboard/wagers/delete_wager/${item._id}`}>
                        <DeleteIcon sx={{ color: "#C2451E" }} />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex gap-4 justify-center">
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
