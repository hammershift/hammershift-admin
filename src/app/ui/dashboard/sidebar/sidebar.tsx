import React from "react";
import Image from "next/image";
import SidebarLink from "./sidebarLinks/sidebarLink";
//icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
//images
import userImg from "../../../../../public/images/user.svg";
import hammershiftLogo from "../../../../../public/images/hammershift.svg";

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
      {
        title: "Users",
        path: "/dashboard/users",
        icon: <PersonIcon />,
      },
    ],
  },
  {
    title: "User",
    list: [
      {
        title: "Settings",
        path: "/dashboard/settings",
        icon: <SettingsIcon />,
      },
      {
        title: "Log-out",
        path: "/dashboard/logout",
        icon: <LogoutIcon />,
      },
    ],
  },
];

const Sidebar = () => {
  return (
    <div className="sticky tw-top-auto">
      <Image
        alt="hammershift-logo"
        src={hammershiftLogo}
        className="tw-m-1 tw-mb-5"
      />
      <div className="tw-flex tw-flex-row tw-items-center tw-gap-5 tw-mb-5">
        <Image
          src={userImg}
          alt="user"
          width={50}
          height={50}
          className="rounded-full tw-object-cover"
        />
        <div className="tw-flex tw-flex-col tw-gap-2">
          <p className="tw-text-xs tw-font-semibold">Anonymous User</p>
          <p className="tw-text-xs">Administrator</p>
        </div>
      </div>
      <ul>
        {sidebarItems.map((category) => (
          <li key={category.title}>
            <p className="tw-text-xs tw-m-2">{category.title}</p>
            {category.list.map((item) => (
              <SidebarLink item={item} key={item.title} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;