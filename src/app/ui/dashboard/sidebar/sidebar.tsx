"use client";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import SidebarLink from "./sidebarLinks/sidebarLink";

//icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import CommentIcon from "@mui/icons-material/Comment";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";

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
          title: "Auctions",
          path: "/dashboard/auctions",
          icon: <DirectionsCarIcon />,
        },
        { title: "Users", path: "/dashboard/users", icon: <PersonIcon /> },
        {
          title: "Comments",
          path: "/dashboard/comments",
          icon: <CommentIcon />,
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
      ],
    },
    {
      title: "User",
      list: [
        // {
        //   title: "Settings",
        //   path: "/dashboard/settings",
        //   icon: <SettingsIcon />,
        // },
        { title: "Log-out", path: "/logout", icon: <LogoutIcon /> },
      ],
    },
  ];

  return (
    <div className="sticky top-0 bg-slate-800 h-full p-5 max-md:bg-opacity-75 max-md:backdrop-blur">
      <div className="pb-3 pt-1 md:hidden">
        <ArrowBackIosIcon onClick={closeSidebar} />
      </div>

      <div className="top-auto">
        <Image
          alt="velocity-markets-logo"
          src={velocityMarketsLogo}
          width={250}
          className="m-1 mb-5"
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
          {sidebarItems.map((category) => (
            <li key={category.title}>
              <p className="text-xs m-2">{category.title}</p>
              {category.list.map((item) => (
                <div key={item.title} onClick={closeSidebar}>
                  <SidebarLink item={item} />
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
