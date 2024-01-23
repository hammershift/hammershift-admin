"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";

const ShowUser = ({ params }: { params: { id: string } }) => {
  const [userData, setUserData] = useState<any>({});
  const router = useRouter();
  const ID = params.id;

  const { data } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/users?user_id=" + ID);
      const json = await res.json();
      setUserData(json);
    };
    fetchData();
  }, []);

  return (
    <div className="section-container tw-mt-4">
      <Link href={`/dashboard/users`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
        USER ACCOUNT DETAILS
      </h2>
      <div className="tw-flex tw-flex-col">
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>User ID:</h4>
          <p className="tw-px-3">{userData._id}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>Full Name:</h4>
          <p className="tw-px-3">{userData.fullName}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>Username:</h4>
          <p className="tw-px-3">{userData.username}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>Email:</h4>
          <p className="tw-px-3">{userData.email}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>Email Verified:</h4>
          {userData.emailVerified ? (
            <p className="tw-px-3">Verified</p>
          ) : (
            <p className="tw-px-3">Not Verified</p>
          )}
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>About:</h4>
          <p className="tw-px-3">{userData.aboutMe}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>State:</h4>
          <p className="tw-px-3">{userData.state}</p>
        </div>
        <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
          <h4>Country:</h4>
          <p className="tw-px-3">{userData.country}</p>
        </div>
      </div>
      {data?.user.role !== "guest" && data?.user.role !== "moderator" ? (
        <button
          className="btn-transparent-white tw-m-4"
          onClick={() => router.push(`/dashboard/users/edit_user/${ID}`)}
        >
          Edit User
        </button>
      ) : null}
    </div>
  );
};

export default ShowUser;
