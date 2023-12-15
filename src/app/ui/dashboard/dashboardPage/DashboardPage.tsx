"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { getUsers, getWagers, getCarsWithFilter } from "@/app/lib/data";

const data = [
    {
        name: "Sun",
        wagers: 4000,
        auctions: 2400,
    },
    {
        name: "Mon",
        wagers: 3000,
        auctions: 1398,
    },
    {
        name: "Tue",
        wagers: 2000,
        auctions: 3800,
    },
    {
        name: "Wed",
        wagers: 2780,
        auctions: 3908,
    },
    {
        name: "Thu",
        wagers: 1890,
        auctions: 4800,
    },
    {
        name: "Fri",
        wagers: 2390,
        auctions: 3800,
    },
    {
        name: "Sat",
        wagers: 3490,
        auctions: 4300,
    },
];

const list = [
    {
        id: "list1",
        wager: 10,
        price: 5000,
        status: "On Going",
        user: "Sonic001",
    },
    {
        id: "list2",
        wager: 10,
        price: 6000,
        status: "On Going",
        user: "Goku001",
    },
    {
        id: "list3",
        wager: 10,
        price: 6500,
        status: "Completed",
        user: "Naruto001",
    },
];

const DashboardPage = () => {
    const [userData, setUsersData] = useState({ total: 0, users: [] });
    const [wagersData, setWagersData] = useState({ total: 0, wagers: [] });
    const [totalWagers, setTotalWagers] = useState(0);
    const [carsData, setCarsData] = useState({ total: 0, cars: [] });

    // fetch user data
    useEffect(() => {
        const fetchUsersData = async () => {
            try {
                const data = await getUsers();

                if (data) {
                    console.log("data:", data);
                    setUsersData(data);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchUsersData();
    }, []);

    // fetch wagers data
    useEffect(() => {
        const fetchWagersData = async () => {
            try {
                const data = await getWagers();

                if (data && "wagers" in data) {
                    console.log("data:", data);
                    setWagersData(data);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchWagersData();
    }, []);

    //calculate total wagers
    useEffect(() => {
        let total = 0;
        if (wagersData.total > 0) {
            wagersData.wagers.map((wager: any) => {
                total += wager.wagerAmount;
            });
        }
        setTotalWagers(total);
    }, [wagersData]);

    // fetch cars data
    useEffect(() => {
        const fetchAuctionsData = async () => {
            try {
                const data = await getCarsWithFilter({ limit: 1 });

                if (data && "cars" in data) {
                    console.log(data);
                    setCarsData(data);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchAuctionsData();
    }, []);

    return (
        <div className="tw-w-full tw-grid tw-gap-4 ">
            <div className="tw-grid tw-grid-cols-3 tw-gap-4 tw-w-full">
                <div className="section-container tw-flex tw-gap-2">
                    <GroupIcon />
                    <div className="tw-grid tw-gap-2">
                        <div>Total Users</div>
                        <div className="tw-text-lg tw-font-bold">
                            {userData.total}
                        </div>
                    </div>
                </div>
                <div className="section-container tw-flex tw-gap-2">
                    <PaidIcon />
                    <div className="tw-grid tw-gap-2">
                        <div>Wagers</div>
                        <div className="tw-text-lg tw-font-bold">
                            $ {totalWagers}
                        </div>
                    </div>
                </div>
                <div className="section-container tw-flex tw-gap-2">
                    <DirectionsCarIcon />
                    <div className="tw-grid tw-gap-2">
                        <div>Auctions</div>
                        <div className="tw-text-lg tw-font-bold">
                            {carsData.total}
                        </div>
                    </div>
                </div>
            </div>
            <div className="section-container">
                <div className="tw-mb-4">LATEST WAGERS</div>
                {wagersData.wagers.length > 0 && (
                    <Table wagersData={wagersData} />
                )}
            </div>
            <div className="section-container">
                <div className="tw-mb-4">WEEKLY RECAP</div>
                <div className="tw-w-full tw-h-[450px]">
                    <Chart />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;

const Table = ({ wagersData }: { wagersData: any }) => {
    return (
        <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
            <thead>
                <tr>
                    <th className="tw-p-2.5 tw-font-bold ">Wager</th>
                    <th className="tw-p-2.5 tw-font-bold">Price</th>
                    <th className="tw-p-2.5 tw-font-bold">Auction ID</th>
                    <th className="tw-p-2.5 tw-font-bold">User</th>
                </tr>
            </thead>
            <tbody className="tw-w-full">
                {wagersData &&
                    wagersData?.wagers.map((item: any) => (
                        <tr
                            key={item._id}
                            className=" tw-rounded-lg tw-bg-[#fff]/5"
                        >
                            <td className="tw-p-2.5 tw-w-1/4">
                                ${item.wagerAmount}.00
                            </td>
                            <td className="tw-p-2.5 tw-w-1/4">
                                ${item.priceGuessed}
                            </td>
                            <td className="tw-p-2.5 tw-w-1/4">
                                <span className={`tw-p-2 tw-rounded`}>
                                    {item.auctionID}
                                </span>
                            </td>
                            <td className="tw-p-2.5 tw-w-1/4">
                                {item.user.username}
                            </td>
                        </tr>
                    ))}
            </tbody>
        </table>
    );
};

const Chart = () => {
    return (
        <ResponsiveContainer width="100%" height="95%">
            <LineChart
                width={500}
                height={300}
                data={data}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="wagers"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                />
                <Line type="monotone" dataKey="auctions" stroke="#82ca9d" />
            </LineChart>
        </ResponsiveContainer>
    );
};
