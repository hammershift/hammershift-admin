"use client";
import { deleteTournament, getTournamentData } from "@/app/lib/data";
import { set } from "mongoose";
import React, { useEffect, useState } from "react";
import { BeatLoader, BounceLoader } from "react-spinners";

const DeleteTournamentPage = ({ params }: { params: { id: string } }) => {
    const [deletionSuccessful, setDeletionSuccessful] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tournamentData, setTournamentData] = useState<any>(null);

    const ID = params.id;
    const handleDeleteTournament = async () => {
        const res = await deleteTournament(ID);
        if (res) {
            setDeletionSuccessful(true);
        } else {
            console.log("Unauthorized Deletion");
        }
    };

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

    return (
        <div>
            DeleteTournamentPage
            {isDataLoading ? (
                <BounceLoader color="#F2CA16" />
            ) : (
                tournamentData && <div>{JSON.stringify(tournamentData)}</div>
            )}
            <div className="tw-flex tw-mt-4 tw-gap-4">
                {isLoading ? (
                    <BeatLoader color="#F2CA16" />
                ) : deletionSuccessful ? (
                    <div>Tournament Deleted</div>
                ) : (
                    <div>
                        <p>Are you sure you want to delete?</p>
                        <button
                            className="btn-transparent-red"
                            onClick={handleDeleteTournament}
                        >
                            DELETE TOURNAMENT
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteTournamentPage;
