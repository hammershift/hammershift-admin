"use client";
import { getOneWager, editWagerWithId } from "@/app/lib/getWagers";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const DeleteWager = ({ params }: { params: { id: string } }) => {
    const [data, setData] = useState<any>(null);
    const ID = params.id;
    const router = useRouter();

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

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = await editWagerWithId(ID, { isActive: false });
        if (res) {
            alert("Wager Edit Successful");
            router.push("/dashboard/wagers");
        } else {
            alert("User Edit Failed");
        }
    };

    return (
        <div>
            <div>DeleteWager</div>
            <div>Are you sure you want to delete wager:</div>
            <div>{data && JSON.stringify(data)}</div>

            <div className="tw-flex tw-gap-4 tw-mt-4">
                <Link href={`/dashboard/wagers`}>
                    <button className="btn-transparent-white">back</button>
                </Link>
                <button className="btn-transparent-red" onClick={handleSubmit}>
                    DELETE WAGER
                </button>
            </div>
        </div>
    );
};

export default DeleteWager;
