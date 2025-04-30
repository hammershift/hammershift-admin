"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editUserWithId } from "@/app/lib/data";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const EditUser = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState<any>(null);
  const [newData, setNewData] = useState<any>({});
  const router = useRouter();
  const ID = params.id;

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/users?user_id=" + ID);
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setNewData({ ...newData, [name]: value });
  };

  const handleEmailVerificationChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.value === "true") {
      setNewData({ ...newData, emailVerified: true });
    } else {
      setNewData({ ...newData, emailVerified: false });
    }
  };

  useEffect(() => {
    console.log(newData);
  }, [newData]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editUserWithId(ID, newData);
    if (res) {
      alert("User Edit Successful");
      router.push("/dashboard/users");
    } else {
      alert("Unauthorized User Edit");
      console.error("unauthorized", res);
    }
  };

  // const revertChanges = (e: any) => {
  //     location.reload();
  // };

  return (
    <div className="section-container mt-4">
      <Link href={`/dashboard/users`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">EDIT USER ACCOUNT</h2>{" "}
      {data && (
        <form>
          <div className="flex flex-col justify-between gap-4 m-6">
            <div className="flex justify-between w-2/5">
              <label className="px-6">User ID:</label>
              <input
                type="text"
                name="_id"
                value={data?._id || ""}
                className="bg-[#fff]/20 text-white/50 border-yellow-500 border-2 px-1"
                disabled
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Full Name:</label>
              <input
                name="fullName"
                type="text"
                defaultValue={data?.fullName || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Username:</label>
              <input
                name="username"
                type="text"
                defaultValue={data?.username || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Email:</label>
              <input
                name="email"
                type="email"
                defaultValue={data?.email || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex gap-2 w-2/5">
              <div className="px-6">Email Verification:</div>
              <label>Verified</label>
              <input
                name="emailVerified"
                type="radio"
                value="true"
                checked={
                  newData?.emailVerified
                    ? newData?.emailVerified === true
                    : data?.emailVerified
                }
                onChange={(e) => handleEmailVerificationChange(e)}
              />

              <label>Not Verified</label>
              <input
                name="emailVerified"
                type="radio"
                value="false"
                checked={
                  newData?.emailVerified
                    ? newData?.emailVerified === false
                    : !data?.emailVerified
                }
                onChange={(e) => handleEmailVerificationChange(e)}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">About Me:</label>
              <input
                name="aboutMe"
                type="text"
                defaultValue={data?.aboutMe || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">State:</label>
              <input
                name="state"
                type="text"
                defaultValue={data?.state || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Country:</label>
              <input
                name="country"
                type="text"
                defaultValue={data?.country || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex gap-1 justify-evenly w-2/5 m-4">
              <Link href={`/dashboard/users/delete_user/${ID}`}>
                <button className="btn-transparent-red">DELETE USER</button>
              </Link>
              <button
                className="btn-transparent-white"
                type="submit"
                onClick={handleSubmit}
              >
                Save Changes
              </button>
              {/*
                        <button
                            className="btn-transparent-white"
                            onClick={revertChanges}
                        >
                            REVERT CHANGES
                        </button> */}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditUser;
