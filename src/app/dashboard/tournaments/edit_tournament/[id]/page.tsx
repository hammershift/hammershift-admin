"use client";
import {
    deleteTournament,
    editTournament,
    getAuctionsForTournaments,
    getTournamentData,
} from "@/app/lib/data";
import { set } from "mongoose";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BeatLoader, BounceLoader } from "react-spinners";
import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AuctionType } from "@/app/types/auctionTypes";
import { TournamentType } from "@/app/types/tournamentTypes";
import { TournamentAuctionsCard } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";

const EditTournamentPage = ({ params }: { params: { id: string } }) => {
    const [editSuccessful, setEditSuccessful] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tournamentData, setTournamentData] = useState<TournamentType | null>(
        null
    );
    const [editTournamentObject, setEditTournamentObject] = useState({});
    const router = useRouter();
    const ID = params.id;

    // onChange of input, saves data to editTournamentObject
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value: string | number = e.target.value;
        //turn to number type if buyInFee
        if (e.target.name == "buyInFee") {
            value = Number(value);
        }
        setEditTournamentObject((prev) => ({
            ...prev,
            [e.target.name]: value,
        }));
    };

    useEffect(() => {
        console.log("editInput:", editTournamentObject);
    }, [editTournamentObject]);

    // fetch Tournament Data
    useEffect(() => {
        const fetchTournamentData = async () => {
            setIsDataLoading(true);
            const res = await getTournamentData(ID);
            if (res) {
                setTournamentData(res);
            }
            setIsDataLoading(false);
        };

        fetchTournamentData();
    }, []);

    // edit Tournament
    const handleEditTournament = async () => {
        setIsLoading(true);
        const res = await editTournament(ID, editTournamentObject);
        if (res) {
            setIsLoading(false);
            setEditSuccessful(true);
            setTimeout(() => {
                router.push("/dashboard/tournaments");
            }, 8000);
        } else {
            console.log("Unauthorized Edit");
        }
    };

    return (
        <div className="section-container tw-mt-4">
            <Link href={`/dashboard/tournaments`}>
                <ArrowBackIcon />
            </Link>
            <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
                EDIT TOURNAMENT
            </h2>
            <EditTournamentDetails
                tournamentID={ID}
                tournamentData={tournamentData}
                handleInputChange={handleInputChange}
            />
            <div className="tw-flex tw-mt-4 tw-gap-4">
                {isLoading ? (
                    <BeatLoader color="#F2CA16" />
                ) : editSuccessful ? (
                    <div className="tw-bg-[#F2CA16] tw-p-2 tw-text-black tw-text-xl tw-font-bold tw-text-center ">
                        Tournament Edited! Redirecting to Tournaments Page...
                    </div>
                ) : tournamentData?.isActive ? (
                    <div className="tw-p-4">
                        <p className="tw-mb-4">Edit Tournament Details?</p>
                        <button
                            className="btn-yellow"
                            onClick={handleEditTournament}
                        >
                            EDIT TOURNAMENT
                        </button>
                    </div>
                ) : (
                    <div className="tw-p-4">
                        <p className="tw-mb-4">
                            Tournament has already been deleted
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditTournamentPage;

const EditTournamentDetails = ({
    tournamentID,
    tournamentData,
    handleInputChange,
}: {
    tournamentID: string;
    tournamentData: TournamentType | null;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
    const [auctions, setAuctions] = useState<AuctionType[]>([]);
    const [dateLimit, setDateLimit] = useState(() => {
        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + 14);
        return { start, end };
    });

    // sets max date for endTime
    useEffect(() => {
        const changeMaxDateTimeOption = () => {
            if (auctions != null && auctions.length > 0) {
                const earliestDate = auctions.reduce(
                    (acc: Date, curr: AuctionType) => {
                        const currDate = new Date(curr.sort.deadline);
                        return currDate < acc ? currDate : acc;
                    },
                    new Date(auctions[0].sort.deadline)
                );
                setDateLimit((prev) => ({ ...prev, end: earliestDate }));
            }
        };
        changeMaxDateTimeOption();
    }, [auctions]);

    // fetch Auctions for Tournament
    useEffect(() => {
        const fetchAuctionsOfTournament = async (id: string) => {
            try {
                const res = await getAuctionsForTournaments(id);
                if (res) {
                    const data = await res.json();
                    console.log("data:", data.auctions);
                    setAuctions(data.auctions);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchAuctionsOfTournament(tournamentID);
    }, []);

    if (tournamentData == null) {
        return (
            <div className="tw-w-[500px] tw-h-[350px] tw-flex tw-justify-center tw-items-center">
                <BounceLoader color="#F2CA16" />
            </div>
        );
    }

    return (
        <div className="tw-w-full tw-flex tw-gap-8 tw-p-4">
            <div>
                <div className="tw-grid tw-grid-cols-2 tw-h-auto tw-gap-4">
                    <div className="tw-font-bold">Tournament Id:</div>
                    <div>{tournamentData._id}</div>

                    <div className="tw-font-bold">Title:</div>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        className="tw-px-3 tw-text-black"
                        placeholder={tournamentData.title}
                        onChange={handleInputChange}
                    />
                    <div className="tw-font-bold">Buy-In Fee:</div>
                    <input
                        type="text"
                        id="buyInFee"
                        name="buyInFee"
                        className="tw-px-3 tw-text-black"
                        placeholder={String(tournamentData.buyInFee)}
                        onChange={handleInputChange}
                    />
                    <div className="tw-font-bold">Start Date and Time:</div>
                    <div className="tw-flex tw-flex-col tw-gap-1.5">
                        <input
                            id="startTime"
                            name="startTime"
                            type="datetime-local"
                            placeholder="Start Time"
                            className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            min={dateLimit.start.toISOString().split(".")[0]}
                            max={dateLimit.end.toISOString().split(".")[0]}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="tw-font-bold">End Date and Time:</div>
                    <div className="tw-flex tw-flex-col tw-gap-1.5">
                        <input
                            id="endTime"
                            name="endTime"
                            type="datetime-local"
                            placeholder="end Time"
                            className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            min={dateLimit.start.toISOString().split(".")[0]}
                            max={dateLimit.end.toISOString().split(".")[0]}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="tw-font-bold">Pot:</div>
                    <div className="tw-px-3">{tournamentData.pot}</div>
                    <div className="tw-font-bold">isActive:</div>
                    <p className="tw-px-3">
                        {tournamentData.isActive == true ? "true" : "false"}
                    </p>
                    <div className="tw-font-bold">Status:</div>
                    <p className="tw-px-3">{tournamentData.status}</p>
                </div>
            </div>
            <div className="tw-flex">
                <div className="tw-font-bold">Auctions:</div>
                <div className="tw-px-3">
                    <div className="">
                        {auctions ? (
                            auctions.map((item, index) => {
                                const yearAttribute = item.attributes.find(
                                    (attr) => attr.key === "year"
                                );
                                const makeAttribute = item.attributes.find(
                                    (attr) => attr.key === "make"
                                );
                                const modelAttribute = item.attributes.find(
                                    (attr) => attr.key === "model"
                                );

                                const year = yearAttribute
                                    ? yearAttribute.value
                                    : "";
                                const make = makeAttribute
                                    ? makeAttribute.value
                                    : "";
                                const model = modelAttribute
                                    ? modelAttribute.value
                                    : "";
                                const title = `${year} ${make} ${model}`;
                                return (
                                    <div key={item + "Auctions"}>
                                        <TournamentAuctionsCard
                                            _id={item._id}
                                            title={title}
                                            deadline={item.sort.deadline}
                                            auction_id={item.auction_id}
                                            image={item.image}
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <div>
                                <BeatLoader color="#F2CA16" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
