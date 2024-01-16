"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import { BounceLoader, BeatLoader } from "react-spinners";
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
import { getUsers, getCarsWithFilter } from "@/app/lib/data";
import {
    getLimitedWagers,
    getWagersCount,
    getWagersOnDate,
} from "@/app/lib/getWagers";
import Link from "next/link";

const DashboardPage = () => {
    const [userData, setUsersData] = useState({ total: 0, users: [] });
    const [wagersData, setWagersData] = useState({ total: 0, wagers: [] });
    const [totalWagers, setTotalWagers] = useState(0);
    const [totalAuctions, setTotalAuctions] = useState(0);
    const [carsData, setCarsData] = useState({ total: 0, cars: [] });
    const [data, setData] = useState<any>([]);
    const [loading, setLoading] = useState(false);
    const [dates, setDates] = useState<any>([]);
    const [tableLoading, setTableLoading] = useState<boolean>(false);
    const [chartLoading, setChartLoading] = useState<boolean>(false);

    // fetch user data
    useEffect(() => {
        const fetchUsersData = async () => {
            try {
                const data = await getUsers();

                if (data) {
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
            setTableLoading(true);
            try {
                const data = await getLimitedWagers(6);

                if (data && "wagers" in data) {
                    setWagersData(data);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
            setTableLoading(false);
        };
        fetchWagersData();
    }, []);

    //fetch total wagers
    useEffect(() => {
        const fetchTotalWagers = async () => {
            try {
                const data = await getWagersCount();

                if (data && "total" in data) {
                    setTotalWagers(data.total);
                } else {
                    console.error("Error in getting total wagers:", data);
                }
            } catch (error) {
                console.error("Error fetching total wagers:", error);
            }
        };
        fetchTotalWagers();
    }, [wagersData]);

    // get total car auctions
    useEffect(() => {
        const fetchAuctionsData = async () => {
            try {
                const data = await getCarsWithFilter({ limit: 1 });

                if (data && "cars" in data) {
                    setTotalAuctions(data.total);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchAuctionsData();
    }, []);

    //get last week dates
    const getLastWeekDates = () => {
        const days = [
            "Sat",
            "Sun",
            "Mon",
            "Tues",
            "Wed",
            "Thurs",
            "Fri",
            "Sat",
        ];
        const dates = [];
        const today = new Date();
        const lastSunday = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() - today.getDay() - 6
        );

        for (let i = 0; i < 7; i++) {
            const date = new Date(lastSunday);
            date.setDate(date.getDate() + i);
            const day = days[date.getDay()];
            dates.push({
                date: date.toISOString().split("T")[0],
                day: day,
            });
        }

        setDates(dates);
        return dates;
    };

    const getWagersPerDay = async () => {
        // get last week's dates and put them in an array
        const dates = await getLastWeekDates();

        //maps through the dates array and gets the wagers on each day
        const wagersPerDayPromises = dates.map(async (date: any) => {
            // gets wagers on a specific date
            const wagersOnDay = await getWagersOnDate(date.date);

            return {
                date: `${date.day}, ${date.date}`,
                wagers: wagersOnDay.totalAmount,
            };
        });
        const wagersPerDay = await Promise.all(wagersPerDayPromises);
        return wagersPerDay;
    };

    useEffect(() => {
        const fetchData = async () => {
            setChartLoading(true);
            const result = await getWagersPerDay();
            setChartLoading(false);
            setData(result);
        };

        fetchData();
    }, []);

    return (
        <div className="tw-w-full tw-grid tw-gap-4 ">
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-2 tw-w-full">
                <div className="section-container tw-flex tw-flex-row tw-gap-2">
                    <GroupIcon />
                    <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-1 tw-gap-2">
                        <div>Total Users</div>
                        <div className="tw-text-lg tw-font-bold">
                            {userData.total}
                        </div>
                    </div>
                </div>
                <div className="section-container tw-flex tw-flex-row tw-gap-2">
                    <PaidIcon />
                    <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-1 tw-gap-2">
                        <div>Total Wagers</div>
                        <div className="tw-text-lg tw-font-bold">
                            {totalWagers}
                        </div>
                    </div>
                </div>
                <div className="section-container tw-flex tw-flex-row tw-gap-2">
                    <DirectionsCarIcon />
                    <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-1 tw-gap-2">
                        <div>Auctions</div>
                        <div className="tw-text-lg tw-font-bold">
                            {totalAuctions}
                        </div>
                    </div>
                </div>
            </div>
            <div className="section-container">
                <div className="tw-mb-4">LATEST WAGERS</div>
                {tableLoading ? (
                    <div className="tw-flex tw-justify-center tw-items-center tw-h-[200px]">
                        <BeatLoader color="#F2CA16" />
                    </div>
                ) : (
                    wagersData.wagers.length > 0 && (
                        <Table wagersData={wagersData} />
                    )
                )}
                <Link
                    href="../../../dashboard/wagers"
                    className="tw-flex tw-justify-end"
                >
                    <h2 className="tw-text-sm tw-text-yellow-400 tw-m-2 tw-px-2">
                        See All
                    </h2>
                </Link>
            </div>
            <div className="section-container">
                <div className="tw-mb-4">{`WEEKLY RECAP: ${dates[0]?.date} - ${dates[6]?.date}`}</div>
                <div className="tw-w-full tw-h-[300px] sm:tw-h-[450px]">
                    {chartLoading ? (
                        <div className="tw-flex tw-justify-center tw-items-center tw-h-[200px]">
                            <BeatLoader color="#F2CA16" />
                        </div>
                    ) : (
                        data && data.length > 0 && <Chart data={data} />
                    )}
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
                    <th className="tw-p-2.5 tw-font-bold tw-hidden sm:tw-block">
                        Price
                    </th>
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
                            <td className="tw-p-2.5 tw-w-1/4 tw-hidden sm:tw-inline-block">
                                ${item.priceGuessed}
                            </td>
                            <td className="tw-p-2.5 tw-w-1/4">
                                <span className={`tw-p-2 tw-rounded`}>
                                    {item.auctionIdentifierId}
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

const Chart = ({ data }: { data: any }) => {
    return (
        <ResponsiveContainer width="100%" height="95%">
            <LineChart
                width={500}
                height={300}
                data={data}
                margin={{
                    top: 20,
                    right: 30,
                    left: 5,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="wagers"
                    stroke="#82ca9d"
                    activeDot={{ r: 8 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
