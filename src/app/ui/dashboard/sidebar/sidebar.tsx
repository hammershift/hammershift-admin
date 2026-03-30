"use client";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import SidebarLink from "./sidebarLinks/sidebarLink";
import Link from "next/link";

//icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import CommentIcon from "@mui/icons-material/Comment";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import SportsScoreIcon from "@mui/icons-material/SportsScore";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";

//images
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import velocityMarketsLogo from "../../../../../public/images/velocity-markets-logo.png";
import userImg from "../../../../../public/images/user.svg";

const Sidebar = ({ closeSidebar }: { closeSidebar: () => void }) => {
  const { data } = useSession();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (data?.user?.username) {
      setUsername(data.user.username);
    }
    if (data?.user?.role) {
      setRole(data.user.role);
    }
  }, [data]);

  const sidebarItems = [
    {
      title: "Pages",
      list: [
        { title: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
        {
          title: "Tournaments",
          path: "/dashboard/tournaments",
          icon: <EmojiEventsIcon />,
        },
        {
          title: "Guess the Hammer",
          path: "/dashboard/guess-the-hammer",
          icon: <SportsScoreIcon />,
        },
        {
          title: "Auctions",
          path: "/dashboard/auctions",
          icon: <DirectionsCarIcon />,
        },
        {
          title: "Markets (Free Play)",
          path: "/dashboard/markets",
          icon: <ShowChartIcon />,
        },
      ],
    },
    {
      title: "Players",
      list: [
        { title: "Users", path: "/dashboard/users", icon: <PeopleIcon /> },
        {
          title: "Wagers",
          path: "/dashboard/wagers",
          icon: <AccountBalanceWalletIcon />,
        },
      ],
    },
    {
      title: "Financials",
      list: [
        {
          title: "Transactions",
          path: "/dashboard/transactions",
          icon: <ReceiptLongIcon />,
        },
        {
          title: "Financial Dashboard",
          path: "/dashboard/financials",
          icon: <AttachMoneyIcon />,
        },
      ],
    },
    {
      title: "Operations",
      list: [
        {
          title: "Live Games",
          path: "/dashboard/live-games",
          icon: <LiveTvIcon />,
        },
        {
          title: "Scraper Monitor",
          path: "/dashboard/scraper",
          icon: <MonitorHeartIcon />,
        },
        {
          title: "Settings",
          path: "/dashboard/settings",
          icon: <SettingsIcon />,
        },
      ],
    },
    {
      title: "Manage",
      list: [
        {
          title: "Admin",
          path: "/dashboard/admins",
          icon: <SupervisorAccountIcon />,
        },
        {
          title: "Agents",
          path: "/dashboard/agents",
          icon: <GroupIcon />,
        },
        {
          title: "Comments",
          path: "/dashboard/comments",
          icon: <CommentIcon />,
        },
      ],
    },
    {
      title: "User",
      list: [
        { title: "Log-out", path: "/logout", icon: <LogoutIcon /> },
      ],
    },
  ];

  return (
    <div
      className="sticky top-0 h-full p-5 max-md:bg-opacity-75 max-md:backdrop-blur"
      style={{ backgroundColor: "#1E3448" }}
    >
      <div className="top-auto">
        <Image
          alt="velocity-markets-logo"
          src={velocityMarketsLogo}
          width={250}
          className="m-1 mb-5 max-md:hidden"
        />
        <div className="flex flex-row items-center gap-5 mb-5">
          <Image
            src={userImg}
            alt="user"
            width={50}
            height={50}
            className="rounded-full object-cover"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">{username}</p>
            <p className="text-xs">{role}</p>
          </div>
        </div>
        <ul>
          {sidebarItems.map((category, catIdx) => (
            <li key={category.title}>
              <p
                className="text-xs uppercase tracking-wider px-3 py-2"
                style={{ color: "#64748B" }}
              >
                {category.title}
              </p>
              {category.list.map((item) => (
                <div key={item.title} onClick={closeSidebar}>
                  <SidebarLink item={item} />
                </div>
              ))}
              {category.title === "Manage" && (
                <Link href="/dashboard/create-tournament">
                  <button
                    className="w-full mt-4 mb-2 px-4 py-2 rounded-md text-sm font-semibold"
                    style={{ background: "#F2CA16", color: "#0C1924" }}
                  >
                    + New Tournament
                  </button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
