"use client";

import React, { useState } from "react";

const ApproveTransactionModal = (props: any) => {
  const { handleCloseModal, transactionId, refreshTransactions } = props;
  const [transactionNote, setTransactionNote] = useState("");

  const handleApprove = async () => {
    try {
      console.log("Sending approval request:", { transactionId });
      const responsePost = await fetch("/api/withdrawRequest/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId }),
      });

      const resultPost = await responsePost.json();
      console.log("Approval response:", resultPost);

      if (resultPost.success) {
        const responsePut = await fetch("/api/withdrawRequest/approve", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transactionId, transactionNote }),
        });

        const resultPut = await responsePut.json();
        console.log("Update response:", resultPut);

        if (resultPut.success) {
          console.log("Approval and update logged successfully");
          refreshTransactions();
        } else {
          console.error("Failed to update transaction:", resultPut.message);
        }
      } else {
        console.error("Failed to approve transaction:", resultPost.message);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error approving transaction:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-30">
      <div className="w-[600px] flex flex-col">
        <button
          onClick={handleCloseModal}
          className="text-white text-xl place-self-end rounded-full border-2 w-8 hover:bg-yellow-400"
        >
          x
        </button>
        <form
          className="section-container flex flex-col items-center"
          onSubmit={(e) => {
            e.preventDefault();
            handleApprove();
          }}
        >
          <label className="text-xl self-start p-2">Note:</label>
          <input
            type="text"
            value={transactionNote}
            className="w-full m-2 p-3 text-black"
            placeholder="Type in note..."
            onChange={(e) => setTransactionNote(e.target.value)}
          ></input>
          <button type="submit" className="btn-yellow w-1/2">
            Approve Withdrawal Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApproveTransactionModal;
