"use client";
import { useState } from "react";

//types / interfaces
import { TournamentObjType } from "@/app/dashboard/create-tournament/page";

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TournamentObjType;
    handleCreateTournament: () => Promise<{ message: string }>;
}

const TournamentModal: React.FC<TournamentModalProps> = ({
    isOpen,
    onClose,
    data,
    handleCreateTournament,
}) => {
    if (!isOpen) {
        return null;
    }
    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30">
            <div className="tw-w-[600px] tw-flex tw-flex-col">
                <button
                    className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
                    onClick={() => onClose()}
                >
                    x
                </button>
                <div></div>
                <TournamentShowModal data={data} />
                <div>Post Tournament?</div>
                <button onClick={() => handleCreateTournament()}>
                    Confirm
                </button>
                <button>Cancel</button>
            </div>
        </div>
    );
};

export default TournamentModal;

const TournamentShowModal = ({ data }: { data: TournamentObjType }) => {
    return (
        <div className="section-container tw-border-2 tw-mt-4">
            <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
                AUCTION DETAILS
            </h2>
            <div>{JSON.stringify(data)}</div>
        </div>
    );
};
