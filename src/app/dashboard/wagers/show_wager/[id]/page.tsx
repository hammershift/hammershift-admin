"use client";
import { getOneWager } from "@/app/lib/getWagers";
import React, { useState, useEffect } from "react";
import Link from "next/link";

const ShowWager = ({ params }: { params: { id: string } }) => {
    const [data, setData] = useState<any>(null);
    const ID = params.id;

    // fetches data from the database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getOneWager(ID);
                console.log(data);
                if (data) {
                    setData(data);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div>
            <div>SHOW USER</div>
            <div>{data && JSON.stringify(data)}</div>
            <div className="tw-flex tw-gap-4 tw-mt-4">
                <Link href={`/dashboard/wagers`}>
                    <button className="btn-transparent-white">back</button>
                </Link>
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
        </div>
    );
};

export default ShowWager;
