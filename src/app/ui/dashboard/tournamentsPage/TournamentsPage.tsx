import { getAuctionsForTournaments, getTournamentData } from "@/app/lib/data";
import { set } from "mongoose";
import React, { useEffect, useState } from "react";
import { AuctionType } from "@/app/types/auctionTypes";
import { TournamentType } from "@/app/types/tournamentTypes";
import { BeatLoader, BounceLoader } from "react-spinners";
import { DateTime } from "luxon";
import { SelectedDataType } from "@/app/ui/dashboard/createTournament/CreateTournament";

const TournamentsPage = () => {
    return <div>TournamentsPage</div>;
};

export default TournamentsPage;

export const AuctionIDDropdown = ({
    tournamentID,
}: {
    tournamentID: string;
}) => {
    const [auctions, setAuctions] = useState<AuctionType[]>([]);

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

    useEffect(() => {
        console.log("tournament auctions:", auctions);
    }, [auctions]);

    return (
        <div className="tw-absolute tw-p-4 tw-bg-[#1A2C3D] tw-h-[500px] tw-overflow-scroll">
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

                    const year = yearAttribute ? yearAttribute.value : "";
                    const make = makeAttribute ? makeAttribute.value : "";
                    const model = modelAttribute ? modelAttribute.value : "";
                    const title = `${year} ${make} ${model}`;
                    return (
                        <div key={item._id + "Auctions"}>
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
    );
};

export const ShowTournamentDetails = ({
    tournamentID,
    labelString,
}: {
    tournamentID: string;
    labelString: string;
}) => {
    const [auctions, setAuctions] = useState<AuctionType[]>([]);
    const [tournamentData, setTournamentData] = useState<TournamentType | null>(
        null
    );

    // fetch Tournament Data
    useEffect(() => {
        const fetchTournamentData = async () => {
            const res = await getTournamentData(tournamentID);
            if (res) {
                setTournamentData(res);
            }
        };

        fetchTournamentData();
    }, []);

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
        <div className="tw-w-full 2xl:tw-w-2/3 tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-8 tw-p-4">
            <div>
                <div className="tw-grid tw-grid-cols-2 tw-h-auto tw-gap-4">
                    <div className="tw-font-bold">Tournament Id:</div>
                    <p className="tw-px-3">{tournamentData._id}</p>
                    <div className="tw-font-bold">Title:</div>
                    <p className="tw-px-3">{tournamentData.title}</p>
                    <div className="tw-font-bold">Buy-In Fee:</div>
                    <p className="tw-px-3">{tournamentData.buyInFee}</p>
                    <div className="tw-font-bold">Start Time:</div>
                    <p className="tw-px-3">
                        {DateTime.fromISO(tournamentData.startTime).toFormat(
                            "MM/dd/yy hh:mm a"
                        )}
                    </p>
                    <div className="tw-font-bold">End Time:</div>
                    <p className="tw-px-3">
                        {DateTime.fromISO(tournamentData.endTime).toFormat(
                            "MM/dd/yy hh:mm a"
                        )}
                    </p>
                    <div className="tw-font-bold">Tournament End Time:</div>
                    <p className="tw-px-3">
                        {DateTime.fromISO(
                            tournamentData.tournamentEndTime
                        ).toFormat("MM/dd/yy hh:mm a")}
                    </p>
                    <div className="tw-font-bold">Pot:</div>
                    <p className="tw-px-3">{tournamentData.pot}</p>
                    <div className="tw-font-bold">isActive:</div>
                    <p className="tw-px-3">
                        {tournamentData.isActive == true ? "true" : "false"}
                    </p>
                    <div className="tw-font-bold">Status:</div>
                    <p className="tw-px-3">{tournamentData.status}</p>
                </div>
            </div>
            <div className="tw-flex tw-flex-col lg:tw-flex-row">
                <div className="tw-font-bold">Auctions:</div>
                <div className="tw-px-0 lg:tw-px-3">
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
                                    <div key={item._id + labelString}>
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

export const TournamentAuctionsCard: React.FC<SelectedDataType> = ({
    _id,
    title,
    deadline,
    auction_id,
    image,
}) => {
    return (
        <div className="tw-flex tw-flex-col tw-rounded">
            <div className="tw-flex tw-gap-4 tw-py-5">
                <img
                    src={image}
                    alt={title}
                    width={100}
                    height={100}
                    className="tw-w-[100px] tw-h-[100px] tw-object-cover tw-cursor-pointer"
                />
                <div className="tw-flex tw-flex-col tw-text-start tw-gap-2">
                    <div>
                        Auction ID: <span>{auction_id}</span>
                    </div>
                    <div>
                        Title: <span>{title}</span>
                    </div>
                    <div>
                        Deadline:{" "}
                        <span>
                            {DateTime.fromISO(deadline).toFormat(
                                "MM/dd/yy hh:mm a"
                            )}
                        </span>
                    </div>
                </div>
            </div>
            <div className="tw-h-[2px] tw-w-full tw-bg-white/20"></div>
        </div>
    );
};
