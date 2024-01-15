"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import { BounceLoader } from "react-spinners";
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
  getWagers,
  getWagersOnDate,
} from "@/app/lib/getWagers";
import { set } from "mongoose";
import Link from "next/link";

const data = [
  {
    name: "Sun",
    wagers: 4000,
  },
  {
    name: "Mon",
    wagers: 3000,
  },
  {
    name: "Tue",
    wagers: 2000,
  },
  {
    name: "Wed",
    wagers: 2780,
  },
  {
    name: "Thu",
    wagers: 1890,
  },
  {
    name: "Fri",
    wagers: 2390,
  },
  {
    name: "Sat",
    wagers: 3490,
  },
];

const DashboardPage = () => {
  const [userData, setUsersData] = useState({ total: 0, users: [] });
  const [wagersData, setWagersData] = useState({ total: 0, wagers: [] });
  const [totalWagers, setTotalWagers] = useState(0);
  const [carsData, setCarsData] = useState({ total: 0, cars: [] });
  const [data, setData] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<any>([]);

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
        const data = await getLimitedWagers({ limit: 5 });

        if (data && "wagers" in data) {
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

  //get last week dates
  const getLastWeekDates = () => {
    const days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
    const dates = [];
    const today = new Date();
    const lastSunday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay()
    );

    for (let i = 0; i < 7; i++) {
      const date = new Date(lastSunday);
      date.setDate(date.getDate() - i);
      const day = days[date.getDay()];
      dates.push({
        date: date.toISOString().split("T")[0],
        day: day,
      });
    }
    const datesReverse = dates.reverse();
    console.log(datesReverse);
    setDates(datesReverse);
    return datesReverse;
  };

  const getWagersPerDay = async () => {
    // get last week's dates and put them in an array
    const dates = await getLastWeekDates();

    //maps through the dates array and gets the wagers on each day
    const wagersPerDayPromises = dates.map(async (date: any) => {
      // gets wagers on a specific date
      const wagersOnDay = await getWagersOnDate(date.date);
      let total = 0;
      if (wagersOnDay.total > 0) {
        // maps through the wagers on a specific date and calculates the total
        wagersOnDay.wagers.map((wager: any) => {
          total += wager.wagerAmount;
        });
      } else {
        total = 0;
      }
      return {
        date: date.day,
        wagers: total,
      };
    });
    const wagersPerDay = await Promise.all(wagersPerDayPromises);
    return wagersPerDay;
  };

  // useEffect(() => {}, []);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getWagersPerDay();
      console.log(result);
      setData(result);
    };

    fetchData();
  }, []);

  return (
    <div className="tw-w-full tw-grid tw-gap-4 ">
      <div className="tw-grid tw-grid-cols-3 tw-gap-4 tw-w-full">
        <div className="section-container tw-flex tw-gap-2">
          <GroupIcon />
          <div className="tw-grid tw-gap-2">
            <div>Total Users</div>
            <div className="tw-text-lg tw-font-bold">{userData.total}</div>
          </div>
        </div>
        <div className="section-container tw-flex tw-gap-2">
          <PaidIcon />
          <div className="tw-grid tw-gap-2">
            <div>Total Wagers</div>
            <div className="tw-text-lg tw-font-bold">$ {totalWagers}</div>
          </div>
        </div>
        <div className="section-container tw-flex tw-gap-2">
          <DirectionsCarIcon />
          <div className="tw-grid tw-gap-2">
            <div>Auctions</div>
            <div className="tw-text-lg tw-font-bold">{carsData.total}</div>
          </div>
        </div>
      </div>
      <div className="section-container">
        <div className="tw-mb-4">LATEST WAGERS</div>
        {wagersData.wagers.length > 0 && <Table wagersData={wagersData} />}
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
        <div className="tw-w-full tw-h-[450px]">
          {loading ? (
            <div className="tw-flex tw-justify-center tw-items-center tw-h-[200px]">
              <BounceLoader />
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
          <th className="tw-p-2.5 tw-font-bold">Price</th>
          <th className="tw-p-2.5 tw-font-bold">Auction ID</th>
          <th className="tw-p-2.5 tw-font-bold">User</th>
        </tr>
      </thead>
      <tbody className="tw-w-full">
        {wagersData &&
          wagersData?.wagers.map((item: any) => (
            <tr key={item._id} className=" tw-rounded-lg tw-bg-[#fff]/5">
              <td className="tw-p-2.5 tw-w-1/4">${item.wagerAmount}.00</td>
              <td className="tw-p-2.5 tw-w-1/4">${item.priceGuessed}</td>
              <td className="tw-p-2.5 tw-w-1/4">
                <span className={`tw-p-2 tw-rounded`}>
                  {item.auctionIdentifierId}
                </span>
              </td>
              <td className="tw-p-2.5 tw-w-1/4">{item.user.username}</td>
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
          top: 5,
          right: 30,
          left: 20,
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
