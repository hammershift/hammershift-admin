"use client";
import { useEffect, useState } from "react";
import { SelectedDataType } from "../createTournament/CreateTournament";

//types / interfaces
import { TournamentObjectType } from "@/app/types/tournamentTypes";
import { BeatLoader } from "react-spinners";
import { DateTime } from "luxon";

// convert date string to date time
function convertDateStringToDateTime(dateString: string | Date) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedData: SelectedDataType[];
    data: TournamentObjectType;
    successfullyPosted: boolean;
    handleCreateTournament: () => Promise<{ message: string }>;
    createTournamentLoading: boolean;
}

const TournamentModal: React.FC<TournamentModalProps> = ({
    isOpen,
    onClose,
    selectedData,
    data,
    successfullyPosted,
    handleCreateTournament,
    createTournamentLoading,
}) => {
    if (!isOpen) {
        return null;
    }

    const startTimeString = DateTime.fromISO(data.startTime as string).toFormat(
        "MM/dd/yy hh:mm a"
    );
    const endTimeString = DateTime.fromISO(data.endTime as string).toFormat(
        "MM/dd/yy hh:mm a"
    );
    const tournamentEndTimeString = DateTime.fromISO(
        data.tournamentEndTime as string
    ).toFormat("MM/dd/yy hh:mm a");

    return (
        <div className="tw-fixed tw-max-h-screen tw-overflow-scroll tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30">
            <div className="tw-w-[800px] tw-flex tw-flex-col">
                <button
                    className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
                    onClick={() => onClose()}
                >
                    x
                </button>
                <div className="tw-flex tw-flex-col tw-gap-2 tw-p-4 tw-bg-[#1A2C3D] tw-rounded-lg tw-border-2 tw-mt-4">
                    <h2 className="tw-font-bold tw-text-yellow-500">
                        TOURNAMENT DETAILS
                    </h2>
                    <div>
                        <div className="tw-font-bold tw-text-lg">
                            Title : {data.title}
                        </div>
                        <div>Start Time : {startTimeString}</div>
                        <div>End Time : {endTimeString}</div>
                        <div>Buy-In Fee : {data.buyInFee}</div>
                        <div>
                            Tournament End Time : {tournamentEndTimeString}
                        </div>
                        <div>Auctions : </div>
                        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-mt-2">
                            {selectedData != null &&
                                selectedData.map((item) => {
                                    const deadlineString =
                                        convertDateStringToDateTime(
                                            item.deadline
                                        );
                                    return (
                                        <div key={item._id + "SD"}>
                                            <AuctionsCard
                                                _id={item._id}
                                                title={item.title}
                                                deadline={deadlineString}
                                                auction_id={item.auction_id}
                                                image={item.image}
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    <div className="tw-bg-white/10 tw-h-[2px] tw-my-2"></div>
                    {createTournamentLoading ? (
                        <div className="tw-w-full tw-h-[60px] tw-flex tw-justify-center tw-items-center">
                            <BeatLoader color="#F2CA16" />
                        </div>
                    ) : successfullyPosted ? (
                        <div className="tw-bg-[#F2CA16] tw-p-2 tw-text-black tw-text-xl tw-font-bold tw-text-center ">
                            Tournament Successfully Posted! 🎉
                        </div>
                    ) : (
                        <div className="tw-flex tw-flex-col tw-gap-3">
                            <div>Post Tournament?</div>
                            <div className="tw-flex tw-gap-4">
                                <button onClick={() => onClose()}>
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleCreateTournament()}
                                    className="btn-yellow"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TournamentModal;

const AuctionsCard: React.FC<SelectedDataType> = ({
    _id,
    title,
    deadline,
    auction_id,
    image,
}) => {
    const dateTime = convertDateStringToDateTime(deadline);

    return (
        <div className="tw-w-full tw-h-full tw-flex tw-gap-4 tw-border-solid tw-border-2 tw-border-white tw-border tw-p-2 tw-rounded">
            <img
                src={image}
                alt={title}
                width={50}
                height={50}
                className="tw-w-[100px] tw-h-[100px] tw-object-cover"
            />
            <div className="tw-grid">
                <div>
                    Auction ID: <span>{auction_id}</span>
                </div>
                <div className="tw-truncate">
                    Title: <span>{title}</span>
                </div>
                <div className="tw-truncate">
                    Deadline: <span>{dateTime}</span>
                </div>
            </div>
        </div>
    );
};
