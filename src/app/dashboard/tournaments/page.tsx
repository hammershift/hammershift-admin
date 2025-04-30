"use client";
import React, { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { BeatLoader } from "react-spinners";
import { useSession } from "next-auth/react";
import {
  deleteTournament,
  getLimitedTournaments,
  searchTournaments,
} from "@/app/lib/data";
import { DateTime } from "luxon";
import Link from "next/link";
import { AuctionIDDropdown } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";
import { TournamentType } from "@/app/types/tournamentTypes";
import { set } from "mongoose";

const TournamentsPage = () => {
  const [tournamentData, setTournamentData] = useState<TournamentType[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [displayCount, setDisplayCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [totalTournaments, setTotalTournaments] = useState<number>(0);

  // adds 7 to the display count
  const handleNextClick = () => {
    if (totalTournaments - displayCount >= 10) {
      setDisplayCount((prevCount) => prevCount + 7);
    } else {
      setDisplayCount(totalTournaments);
    }
  };

  const fetchData = async () => {
    try {
      const data = await getLimitedTournaments(displayCount);
      if (data) {
        setTotalTournaments(data.total);
        setTournamentData(data.tournaments as TournamentType[]);
        setIsLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleDeletetournament = async (id: string) => {
    try {
      const res = await deleteTournament(id);
      const data = await res.json();
      if (data) {
        console.log("Deleted tournament:", data);
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [displayCount]);

  // search functionality
  useEffect(() => {
    const handleSearchTournaments = async (word: string) => {
      try {
        const res = await searchTournaments(word);
        if (res) {
          const data = await res.json();
          setTournamentData(data.tournaments as TournamentType[]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    if (searchValue.length > 0) {
      handleSearchTournaments(searchValue);
    } else {
      fetchData();
    }
  }, [searchValue]);

  // useEffect(() => {
  //     console.log("tournamentData:", tournamentData);
  // }, [tournamentData]);

  return (
    <Fragment>
      <div className="section-container mt-4">
        <div className="font-bold">Tournaments</div>
        <div className="w-auto my-4 self-center relative">
          <div className="bg-[#fff]/20 h-auto flex px-2 py-1.5 rounded gap-1">
            <Image
              src={magnifyingGlass}
              alt="magnifying glass"
              width={20}
              height={20}
            />
            <input
              placeholder={`Search tournaments`}
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
            <Table
              tournamentData={tournamentData}
              handleDeleteTournament={handleDeletetournament}
            />
          )}
        </div>
        <div className="flex flex-col items-center gap-4 py-4">
          <div>{`Showing ${
            totalTournaments <= 7 ? totalTournaments : displayCount
          } out of ${totalTournaments}`}</div>

          {displayCount >= totalTournaments ? null : (
            <button className="btn-transparent-white" onClick={handleNextClick}>
              Load More
            </button>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default TournamentsPage;

type TableProps = {
  tournamentData: TournamentType[];
  handleDeleteTournament: (id: string) => void;
};
// table component
const Table: React.FC<TableProps> = ({
  tournamentData,
  handleDeleteTournament,
}) => {
  const [openModal, setOpenModal] = useState<string | null>(null);
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
            <th className="p-2.5 font-bold">Date Created</th>
            <th className="p-2.5 font-bold">Title</th>
            <th className="p-2.5 font-bold max-md:hidden">Pot</th>
            <th className="p-2.5 font-bold max-md:hidden">Buy-In Fee</th>
            <th className="p-2.5 font-bold max-md:hidden">Start Time</th>
            <th className="p-2.5 font-bold max-md:hidden">End Time</th>
            <th className="p-2.5 font-bold max-md:hidden">
              Tournament End Time
            </th>
            <th className="p-2.5 font-bold max-md:hidden">Auction ID</th>
            <th className="p-2.5 font-bold max-md:hidden">isActive</th>
            <th className="p-2.5 font-bold max-md:hidden">Status</th>
            <th className="p-2.5 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="w-full">
          {tournamentData &&
            tournamentData.map((item, index) => (
              <tr
                key={index + "TournamentList"}
                className=" rounded-lg bg-[#fff]/5"
              >
                <td className="p-2.5 w-1/8">
                  {DateTime.fromISO(item.createdAt).toFormat("MM/dd/yy")}
                </td>
                <td className="p-2.5 w-1/8">{item.title}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(item.pot as unknown as number)}
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  ${item.buyInFee}.00
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  {DateTime.fromISO(item.startTime).toFormat(
                    "MM/dd/yy hh:mm a"
                  )}
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <p>
                    {DateTime.fromISO(item.endTime).toFormat(
                      "MM/dd/yy hh:mm a"
                    )}
                  </p>
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <p>
                    {DateTime.fromISO(item.tournamentEndTime).toFormat(
                      "MM/dd/yy hh:mm a"
                    )}
                  </p>
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <button
                    className="rounded-md bg-slate-500 px-2 text-xs"
                    onClick={() =>
                      setOpenModal((prev) => (prev == null ? item._id : null))
                    }
                  >
                    Show Auctions
                  </button>
                  {openModal === item._id && (
                    <AuctionIDDropdown tournamentID={item._id} />
                  )}
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <p>{item.isActive ? "true" : "false"}</p>
                </td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  <p>{item.status}</p>
                </td>
                <td className="p-2.5 w-1/8">
                  {data?.user.role !== "guest" &&
                  data?.user.role !== "moderator" ? (
                    <div className="flex gap-2 md:gap-4 justify-center">
                      <Link
                        href={`/dashboard/tournaments/edit_tournament/${item._id}`}
                      >
                        <EditIcon />
                      </Link>
                      <Link
                        href={`/dashboard/tournaments/show_tournament/${item._id}`}
                      >
                        <DvrIcon />
                      </Link>
                      <Link
                        href={`/dashboard/tournaments/delete_tournament/${item._id}`}
                      >
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
      {/* <AuctionModal
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                id={selectedAuctionId || ""}
            /> */}
    </div>
  );
};
