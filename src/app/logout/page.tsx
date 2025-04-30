"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const Logout = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="section-container flex flex-col justify-center items-center rounded-md">
        <h2 className="m-2">Are you sure you want to logout?</h2>
        <div className="flex gap-4">
          <button
            className="border-2 border-yellow-400 rounded-md py-1 px-3 bg-yellow-400 text-red-600 font-bold"
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
