"use client";
import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Image from "next/image";
import GroupIcon from "@mui/icons-material/Group";
import PaidIcon from "@mui/icons-material/Paid";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { createTheme, useTheme, ThemeProvider } from "@mui/material/styles";
import { BounceLoader, BeatLoader } from "react-spinners";
import AuctionModal from "@/app/ui/dashboard/modals/auction_modal";
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
import {
  getUsers,
  getCarsWithFilter,
  getTotalPredictionCount,
  getPredictionsOnDate,
} from "@/app/lib/data";
import { Prediction } from "@/app/models/prediction.model";
import Link from "next/link";
import { set } from "mongoose";

const DashboardPage = () => {
  const [userData, setUsersData] = useState({ total: 0, users: [] });
  const [wagersData, setWagersData] = useState({ total: 0, wagers: [] });
  const [predictionTotal, setPredictionTotal] = useState<number>(0);
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
  // useEffect(() => {
  //   const fetchWagersData = async () => {
  //     setTableLoading(true);
  //     try {
  //       const data = await getLimitedWagers(6);

  //       if (data && "wagers" in data) {
  //         setWagersData(data);
  //       } else {
  //         console.error("Unexpected data structure:", data);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching data:", error);
  //     }
  //     setTableLoading(false);
  //   };
  //   fetchWagersData();
  // }, []);

  //fetch total wagers
  // useEffect(() => {
  //   const fetchTotalWagers = async () => {
  //     try {
  //       const data = await getWagersCount();

  //       if (data && "total" in data) {
  //         setTotalWagers(data.total);
  //       } else {
  //         console.error("Error in getting total wagers:", data);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching total wagers:", error);
  //     }
  //   };
  //   fetchTotalWagers();
  // }, [wagersData]);

  //get all predictions
  useEffect(() => {
    const fetchAllPredictions = async () => {
      try {
        const data = await getTotalPredictionCount();

        if (data) {
          setPredictionTotal(data);
        } else {
          console.error("Unexpected data structure:", data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchAllPredictions();
  }, []);

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
    const days = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
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
    // const wagersPerDayPromises = dates.map(async (date: any) => {
    //   // gets wagers on a specific date
    //   const wagersOnDay = await getWagersOnDate(date.date);

    //   return {
    //     date: `${date.day}, ${date.date}`,
    //     wagers: wagersOnDay.totalAmount,
    //   };
    // });

    const predictionsPerDayPromises = dates.map(async (date: any) => {
      // gets wagers on a specific date
      const predictionsOnDay = await getPredictionsOnDate(date.date);
      return {
        date: `${date.day}, ${date.date}`,
        predictions: predictionsOnDay,
      };
    });

    const predictionsPerDay = await Promise.all(predictionsPerDayPromises);
    return predictionsPerDay;

    // const wagersPerDay = await Promise.all(wagersPerDayPromises);
    // return wagersPerDay;
  };

  useEffect(() => {
    const fetchData = async () => {
      setChartLoading(true);
      const result = await getWagersPerDay();
      setChartLoading(false);
      setData(result);
    };
    fetchData();
  }, [predictionTotal]);

  return (
    <div className="w-full grid gap-4 ">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
        <div className="section-container flex flex-row gap-2">
          <GroupIcon />
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <div>Total Users</div>
            <div className="text-lg font-bold">{userData.total}</div>
          </div>
        </div>
        <div className="section-container flex flex-row gap-2">
          <PaidIcon />
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <div>Total Active Predictions</div>
            <div className="text-lg font-bold">{predictionTotal}</div>
          </div>
        </div>
        <div className="section-container flex flex-row gap-2">
          <DirectionsCarIcon />
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <div>Auctions</div>
            <div className="text-lg font-bold">{totalAuctions}</div>
          </div>
        </div>
      </div>
      {/* <div className="section-container">
        <div className="mb-4">LATEST WAGERS</div>
        {tableLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <BeatLoader color="#F2CA16" />
          </div>
        ) : (
          wagersData.wagers.length > 0 && <Table wagersData={wagersData} />
        )}
        <Link href="../../../dashboard/wagers" className="flex justify-end">
          <h2 className="text-sm text-yellow-400 m-2 px-2">See All</h2>
        </Link>
      </div> */}
      <div className="section-container">
        <div className="mb-4">{`WEEKLY RECAP: ${dates[0]?.date} - ${dates[6]?.date}`}</div>
        <div className="w-full h-[300px] sm:h-[450px]">
          {chartLoading ? (
            <div className="flex justify-center items-center h-[200px]">
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
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(
    null
  );

  return (
    <table className="w-full border-separate border-spacing-y-2 text-center">
      <thead>
        <tr>
          <th className="p-2.5 font-bold hidden sm:block">Date</th>
          <th className="p-2.5 font-bold">Wager</th>
          <th className="p-2.5 font-bold hidden sm:block">Price</th>
          <th className="p-2.5 font-bold">Auction ID</th>
          <th className="p-2.5 font-bold">User</th>
        </tr>
      </thead>
      <tbody className="w-full">
        {wagersData &&
          wagersData?.wagers.map((item: any) => (
            <tr key={item._id} className=" rounded-lg bg-[#fff]/5">
              <td className="p-2.5 w-1/5 hidden sm:table-cell">
                {DateTime.fromISO(item.createdAt).toFormat("MM/dd/yy")}
              </td>
              <td className="p-2.5 w-1/5">${item.wagerAmount}.00</td>
              <td className="p-2.5 w-1/5 hidden sm:table-cell">
                ${item.priceGuessed}
              </td>
              <td className="p-2.5 w-1/5">
                <span className={`p-2 rounded`}>
                  {item.auctionIdentifierId}
                </span>
                <button
                  className="rounded-md bg-slate-500 px-2 text-xs"
                  onClick={() => {
                    setOpenModal(true);
                    setSelectedAuctionId(item.auctionIdentifierId);
                  }}
                >
                  Show Auction Details
                </button>
              </td>
              <td className="p-2.5 w-1/5">{item.user.username}</td>
            </tr>
          ))}
      </tbody>
      <AuctionModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        id={selectedAuctionId || ""}
      />
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
          dataKey="predictions"
          stroke="#82ca9d"
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
