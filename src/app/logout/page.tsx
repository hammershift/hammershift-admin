"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const Logout = () => {
  const router = useRouter();
  return (
    <div className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-h-full">
      <div className="section-container tw-flex tw-flex-col tw-justify-center tw-items-center tw-rounded-md">
        <h2 className="tw-m-2">Are you sure you want to logout?</h2>
        <div className="tw-flex tw-gap-4">
          <button
            className="tw-border-2 tw-border-yellow-400 tw-rounded-md tw-py-1 tw-px-3 tw-bg-yellow-400 tw-text-red-600 tw-font-bold"
            onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
          >
            Logout
          </button>
          <button className="" onClick={() => router.push("/dashboard")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;
