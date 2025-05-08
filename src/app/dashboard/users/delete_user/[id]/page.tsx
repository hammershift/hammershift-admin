"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const DeleteUser = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const ID = params.id;
  const [data, setData] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/users?user_id=" + ID);
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  const handleDelete = async () => {
    const res = await fetch("/api/users/delete?user_id=" + ID, {
      method: "PUT",
    });
    const json = await res.json();
    if (!res.ok) {
      alert("Unauthorized");
      console.error(json.message);
    } else {
      alert("User Deleted");
      router.push("/dashboard/users");
    }
  };

  return (
    <div className="section-container mt-4">
      <Link href={`/dashboard/users`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">Delete User</h2>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>User ID:</h4>
        <p>{data._id}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>Full Name:</h4>
        <p>{data.fullName}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>Username:</h4>
        <p>{data.username}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>Email:</h4>
        <p>{data.email}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>About:</h4>
        <p>{data.about}</p>
      </div>
      <div className="flex mt-4 gap-4">
        <button className="btn-transparent-red" onClick={handleDelete}>
          DELETE USER
        </button>
      </div>
    </div>
  );
};

export default DeleteUser;
