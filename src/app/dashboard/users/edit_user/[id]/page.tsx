"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editUserWithId } from "@/app/lib/data";

const EditUser = ({ params }: { params: { id: string } }) => {
    const [data, setData] = useState<any>(null);
    const [newData, setNewData] = useState<any>({});
    const router = useRouter();
    const ID = params.id;

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch("/api/users?user_id=" + ID);
            const json = await res.json();
            setData(json);
        };
        fetchData();
    }, []);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setNewData({ ...newData, [name]: value });
    };

    useEffect(() => {
        console.log(newData);
    }, [newData]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = await editUserWithId(ID, newData);
        if (res) {
            alert("User Edited Successfully");
            router.push("/dashboard/users");
        }
    };

    const revertChanges = (e: any) => {
        location.reload();
    };

    return (
        <div className="section-container tw-mt-4">
            <span className="tw-font-bold">EDIT PAGE</span>{" "}
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
                                defaultValue={data?.fullName || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Username</label>
                            <input
                                name="username"
                                type="text"
                                defaultValue={data?.username || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Email</label>
                            <input
                                name="email"
                                type="email"
                                defaultValue={data?.email || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <div>Email Verification</div>

                            <label>Verified</label>
                            <input name="emailVerified" type="radio" />

                            <label>Not Verified</label>
                            <input name="emailVerified" type="radio" />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>About Me</label>
                            <input
                                name="aboutMe"
                                type="text"
                                defaultValue={data?.aboutMe || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>State</label>
                            <input
                                name="state"
                                type="text"
                                defaultValue={data?.state || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="tw-flex tw-gap-4">
                            <label>Country</label>
                            <input
                                name="country"
                                type="text"
                                defaultValue={data?.country || ""}
                                className="tw-bg-[#fff]/20"
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="tw-flex tw-gap-4 tw-mt-4">
                        <button
                            className="btn-transparent-white"
                            type="submit"
                            onClick={handleSubmit}
                        >
                            EDIT USER
                        </button>
                        {/*
                        <button
                            className="btn-transparent-white"
                            onClick={revertChanges}
                        >
                            REVERT CHANGES
                        </button> */}
                    </div>
                    <div className="tw-flex tw-gap-4 tw-mt-4">
                        <Link href={`/dashboard/users`}>
                            <button className="btn-transparent-white">
                                back
                            </button>
                        </Link>
                        <Link href={`/dashboard/users/delete_user/${ID}`}>
                            <button className="btn-transparent-red">
                                DELETE USER
                            </button>
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EditUser;
