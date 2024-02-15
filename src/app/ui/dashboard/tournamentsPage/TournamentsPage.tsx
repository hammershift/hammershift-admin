import { getAuctionsForTournaments } from "@/app/lib/data";
import { set } from "mongoose";
import React, { useEffect, useState } from "react";

const TournamentsPage = () => {
    return <div>TournamentsPage</div>;
};

export default TournamentsPage;

export const AuctionIDDropdown = ({ list }: { list: string[] | string }) => {
    return (
        <div className="tw-absolute">
            {typeof list === "object" ? (
                list.map((item, index) => (
                    <div key={item + "Auctions"}>{item}</div>
                ))
            ) : (
                <div>{list}</div>
            )}
        </div>
    );
};

export const ShowTournamentDetails = ({
    tournamentData,
}: {
    tournamentData: any;
}) => {
    const [auctions, setAuctions] = useState([]);
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
        fetchAuctionsOfTournament(tournamentData._id);
    }, []);

    return (
        <div className="tw-flex tw-flex-col">
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Tournament Id:</h4>
                <p className="tw-px-3">{tournamentData._id}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Title:</h4>
                <p className="tw-px-3">{tournamentData.title}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Buy-In Fee:</h4>
                <p className="tw-px-3">{tournamentData.buyInFee}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Start Time:</h4>
                <p className="tw-px-3">{tournamentData.startTime}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>End Time:</h4>
                <p className="tw-px-3">{tournamentData.endTime}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Pot:</h4>
                <p className="tw-px-3">{tournamentData.pot}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>isActive:</h4>
                <p className="tw-px-3">
                    {tournamentData.isActive == true ? "true" : "false"}
                </p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Status:</h4>
                <p className="tw-px-3">{tournamentData.status}</p>
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                <h4>Auctions:</h4>
                <div className="tw-px-3">
                    {auctions.length > 0 &&
                        auctions.map((item: any, index: number) => (
                            <div key={item._id + "TAuction"}>{item._id}</div>
                        ))}
                </div>
            </div>
        </div>
    );
};
