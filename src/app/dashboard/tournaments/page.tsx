"use client";
import React, { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { TournamentObjType } from "../../dashboard/create-tournament/page";
import { BeatLoader } from "react-spinners";
import { useSession } from "next-auth/react";
import { deleteTournament, getLimitedTournaments } from "@/app/lib/data";
import { DateTime } from "luxon";
import Link from "next/link";
import { AuctionIDDropdown } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";
import { TournamentType } from "@/app/types/tournamentTypes";
import { set } from "mongoose";

const TournamentsPage = () => {
    const [tournamentData, setTournamentData] = useState<TournamentType[]>([]);
    const [searchValue, setSearchValue] = useState<null | string>(null);
    const [displayCount, setDisplayCount] = useState(7);
    const [isLoading, setIsLoading] = useState(false);
    const [totalTournaments, setTotalTournaments] = useState<number>(0);

    // adds 7 to the display count
    const handleNextClick = () => {
        if (totalTournaments - displayCount >= 7) {
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

    const handleDeletetournamnt = async (id: string) => {
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

    useEffect(() => {
        console.log("tournamentData:", tournamentData);
    }, [tournamentData]);

    return (
        <Fragment>
            <div className="section-container tw-mt-4">
                <div className="tw-font-bold">Tournaments</div>
                <div className="tw-w-auto tw-my-4 tw-self-center tw-relative">
                    <div className="tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1">
                        <Image
                            src={magnifyingGlass}
                            alt="magnifying glass"
                            width={20}
                            height={20}
                        />
                        <input
                            placeholder={`Search tournaments`}
                            className="tw-bg-transparent focus:tw-outline-none"
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>
                </div>
                <div className="tw-my-4">
                    {isLoading ? (
                        <div className="tw-flex tw-justify-center tw-items-center tw-h-[592px]">
                            <BeatLoader color="#F2CA16" />
                        </div>
                    ) : (
                        <Table
                            tournamentData={tournamentData}
                            handleDeleteTournament={handleDeletetournamnt}
                        />
                    )}
                </div>
                <div className="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-py-4">
                    <div>{`Showing ${
                        totalTournaments <= 7 ? totalTournaments : displayCount
                    } out of ${totalTournaments}`}</div>

                    {displayCount >= totalTournaments ? null : (
                        <button
                            className="btn-transparent-white"
                            onClick={handleNextClick}
                        >
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
            <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
                <thead>
                    <tr>
                        <th className="tw-p-2.5 tw-font-bold">Date Created</th>
                        <th className="tw-p-2.5 tw-font-bold">Title</th>
                        <th className="tw-p-2.5 tw-font-bold">Pot</th>
                        <th className="tw-p-2.5 tw-font-bold">Buy-In Fee</th>
                        <th className="tw-p-2.5 tw-font-bold">Start Time</th>
                        <th className="tw-p-2.5 tw-font-bold">End Time</th>
                        <th className="tw-p-2.5 tw-font-bold">Auction ID</th>
                        <th className="tw-p-2.5 tw-font-bold">isActive</th>
                        <th className="tw-p-2.5 tw-font-bold">Actions</th>
                    </tr>
                </thead>
                <tbody className="tw-w-full">
                    {tournamentData &&
                        tournamentData.map((item, index) => (
                            <tr
                                key={index + "TournamentList"}
                                className=" tw-rounded-lg tw-bg-[#fff]/5"
                            >
                                <td className="tw-p-2.5 tw-w-1/8">
                                    {DateTime.fromISO(item.createdAt).toFormat(
                                        "MM/dd/yy"
                                    )}
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    {item.title}
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                    }).format(item.pot as unknown as number)}
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    ${item.buyInFee}.00
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    {DateTime.fromISO(item.startTime).toFormat(
                                        "MM/dd/yy hh:mm a"
                                    )}
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    <p>
                                        {DateTime.fromISO(
                                            item.endTime
                                        ).toFormat("MM/dd/yy hh:mm a")}
                                    </p>
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    <button
                                        className="tw-rounded-md tw-bg-slate-500 tw-px-2 tw-text-xs"
                                        onClick={() =>
                                            setOpenModal((prev) =>
                                                prev == null ? item._id : null
                                            )
                                        }
                                    >
                                        Show Auctions
                                    </button>
                                    {openModal === item._id && (
                                        <AuctionIDDropdown
                                            tournamentID={item._id}
                                        />
                                    )}
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    <p>{item.isActive ? "true" : "false"}</p>
                                </td>
                                <td className="tw-p-2.5 tw-w-1/8">
                                    {data?.user.role !== "guest" &&
                                    data?.user.role !== "moderator" ? (
                                        <div className="tw-flex tw-gap-4 tw-justify-center">
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
                                                <DeleteIcon
                                                    sx={{ color: "#C2451E" }}
                                                />
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="tw-flex tw-gap-4 tw-justify-center">
                                            <Link
                                                href={`/dashboard/wagers/show_wager/${item._id}`}
                                            >
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
