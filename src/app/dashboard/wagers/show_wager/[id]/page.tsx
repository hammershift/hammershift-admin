"use client";
import { getOneWager } from "@/app/lib/data";
import React, { useState, useEffect } from "react";
import Link from "next/link";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";

const ShowWager = ({ params }: { params: { id: string } }) => {
    const [wagerData, setWagerData] = useState<any>(null);
    const ID = params.id;

    const { data } = useSession();

    // fetches data from the database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getOneWager(ID);
                console.log(data);
                if (data) {
                    setWagerData(data);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="section-container tw-w-auto tw-mt-4">
            <Link href={`/dashboard/wagers`}>
                <ArrowBackIcon />
            </Link>
            <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
                WAGER DETAILS
            </h2>{" "}
            <div className="tw-flex tw-flex-col">
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>WAGER ID:</h4>
                    <p className="tw-px-3">{wagerData && wagerData._id}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>USER ID:</h4>
                    <p className="tw-px-3">{wagerData && wagerData.user._id}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>AUCTION ID:</h4>
                    <p className="tw-px-3">
                        {wagerData && wagerData.auctionIdentifierId}
                    </p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Full Name:</h4>
                    <p className="tw-px-3">
                        {wagerData && wagerData.user.fullName}
                    </p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Username:</h4>
                    <p className="tw-px-3">
                        {wagerData && wagerData.user.username}
                    </p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Price Guessed:</h4>
                    <p className="tw-px-3">
                        ${wagerData && wagerData.priceGuessed}
                    </p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2  tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Wager Amount:</h4>
                    <p className="tw-px-3">
                        ${wagerData && wagerData.wagerAmount}
                    </p>
                </div>
            </div>
            {data?.user?.role !== "guest" &&
            data?.user?.role !== "moderator" ? (
                <div className="tw-flex tw-gap-1 tw-justify-evenly tw-w-1/2 tw-m-4 max-lg:tw-w-full">
                    <Link href={`/dashboard/wagers/edit_wager/${ID}`}>
                        <button className="btn-transparent-white ">
                            EDIT WAGER
                        </button>
                    </Link>
                    <Link href={`/dashboard/wagers/delete_wager/${ID}`}>
                        <button className="btn-transparent-red">
                            DELETE WAGER
                        </button>
                    </Link>
                </div>
            ) : null}
        </div>
    );
};

export default ShowWager;
