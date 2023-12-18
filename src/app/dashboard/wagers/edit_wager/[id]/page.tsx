"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOneWager, editWagerWithId } from "@/app/lib/getWagers";

const EditWager = ({ params }: { params: { id: string } }) => {
    const [data, setData] = useState<any>(null);
    const [newData, setNewData] = useState<any>({});
    const router = useRouter();
    const ID = params.id;

    // fetches data from the database
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getOneWager(ID);
                if (data) {
                    console.log(data);
                    setData(data);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setNewData({ ...newData, [name]: value });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = await editWagerWithId(ID, newData);
        if (res) {
            alert("Wager Edit Successful");
            router.push("/dashboard/wagers");
        } else {
            alert("User Edit Failed");
        }
    };

    // To be removed, checking for data to edit
    useEffect(() => {
        console.log(newData);
    }, [newData]);

    return (
        <div>
            <div>EDIT WAGER</div>
            {JSON.stringify(data)}
            {data && (
                <form>
                    <div className="tw-grid tw-gap-4">
                        <div className="tw-flex tw-gap-4">
                            <label>id</label>
                            <input
                                type="text"
                                name="_id"
                                value={data?._id || ""}
                                className="tw-bg-[#fff]/20 tw-text-white/50"
                                disabled
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Full Name</label>
                            <input
                                name="fullName"
                                type="text"
                                defaultValue={data?.user.fullName || ""}
                                className="tw-bg-[#fff]/20 tw-text-white/50"
                                disabled
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Username</label>
                            <input
                                name="username"
                                type="text"
                                defaultValue={data?.user.username || ""}
                                className="tw-bg-[#fff]/20 tw-text-white/50"
                                disabled
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Price Guessed</label>
                            <input
                                name="priceGuessed"
                                type="text"
                                defaultValue={data?.priceGuessed || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Wager Amount</label>
                            <input
                                name="wagerAmount"
                                type="text"
                                defaultValue={data?.wagerAmount || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>

                        <div className="tw-flex tw-gap-4 tw-mt-4">
                            <Link href={`/dashboard/wagers`}>
                                <button className="btn-transparent-white">
                                    back
                                </button>
                            </Link>
                            <button
                                className="btn-transparent-white "
                                onClick={handleSubmit}
                            >
                                EDIT WAGER
                            </button>
                            <Link href={`/dashboard/wagers/delete_wager/${ID}`}>
                                <button className="btn-transparent-red">
                                    DELETE WAGER
                                </button>
                            </Link>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EditWager;
