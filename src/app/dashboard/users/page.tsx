"use client";

import React, { useEffect, useState } from "react";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { getUsers, getUsersWithSearch } from "@/app/lib/data";
import Link from "next/link";
import Image from "next/image";

interface UserData {
    _id: string;
    username: string;
    fullName: string;
    email: string;
    state: string;
    country: string;
}
interface UsersPageProps {
    data: UserData[];
}

const UsersPage = () => {
    const [userData, setUserData] = useState<UserData[]>([]);
    const [searchValue, setSearchValue] = useState<null | string>(null);

    // get all users data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getUsers();

                if (data && "users" in data) {
                    // console.log("data:", data);
                    setUserData(data.users as UserData[]);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    // get users data with search value
    useEffect(() => {
        // console.log("searchValue:", searchValue);
        const getDataWithSearchValue = async () => {
            if (searchValue !== null && searchValue !== "") {
                try {
                    const data = await getUsersWithSearch(searchValue);

                    if (data) {
                        // console.log("data:", data);
                        setUserData(data.users as UserData[]);
                    } else {
                        console.error("Unexpected data structure:", data);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
        };
        getDataWithSearchValue();
    }, [searchValue]);

    return (
        <div className="section-container tw-mt-4">
            <div className="tw-font-bold">Users</div>
            <div className="tw-w-[500px] tw-my-4 tw-self-center tw-relative">
                <div className="tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1">
                    <Image
                        src={magnifyingGlass}
                        alt="magnifying glass"
                        width={20}
                        height={20}
                    />
                    <input
                        placeholder={`Search for users`}
                        className="tw-bg-transparent focus:tw-outline-none"
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </div>
            </div>
            <div className="tw-my-4">
                <Table data={userData} />
            </div>

            <div className="tw-flex tw-justify-end ">
                <div className="tw-flex tw-items-center tw-gap-4 tw-py-4">
                    <button className="btn-transparent-white">prev</button>
                    <div className="tw-h-auto">page 1 of 1</div>
                    <button className="btn-transparent-white">next</button>
                </div>
            </div>
        </div>
    );
};

export default UsersPage;

const Table: React.FC<UsersPageProps> = ({ data }) => {
    return (
        <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
            <thead>
                <tr>
                    <th className="tw-p-2.5 tw-font-bold ">Username</th>
                    <th className="tw-p-2.5 tw-font-bold ">Full Name</th>
                    <th className="tw-p-2.5 tw-font-bold">Email</th>
                    <th className="tw-p-2.5 tw-font-bold">State</th>
                    <th className="tw-p-2.5 tw-font-bold">Country</th>
                    <th className="tw-p-2.5 tw-font-bold">Actions</th>
                </tr>
            </thead>
            <tbody className="tw-w-full">
                {data &&
                    data.map((item: UserData, index: number) => (
                        <tr
                            key={index}
                            className=" tw-rounded-lg tw-bg-[#fff]/5"
                        >
                            <td className="tw-p-2.5 tw-w-1/8">
                                {item.username}
                            </td>
                            <td className="tw-p-2.5 tw-w-1/8">
                                {item.fullName}
                            </td>
                            <td className="tw-p-2.5 tw-w-1/8">{item.email}</td>
                            <td className="tw-p-2.5 tw-w-1/8">{item.state}</td>
                            <td className="tw-p-2.5 tw-w-1/8">
                                {item.country}
                            </td>
                            <td className="tw-p-2.5 tw-w-1/8">
                                <div className="tw-flex tw-gap-4 tw-justify-center">
                                    <Link
                                        href={`/dashboard/users/edit_user/${item._id}`}
                                    >
                                        <EditIcon />
                                    </Link>
                                    <Link
                                        href={`/dashboard/users/show_user/${item._id}`}
                                    >
                                        <DvrIcon />
                                    </Link>
                                    <Link
                                        href={`/dashboard/users/delete_user/${item._id}`}
                                    >
                                        <DeleteIcon sx={{ color: "#C2451E" }} />
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ))}
            </tbody>
        </table>
    );
};
