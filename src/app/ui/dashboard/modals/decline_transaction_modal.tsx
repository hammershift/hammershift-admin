"use client";

import React, { useState } from "react";

const DeclineTransactionModal = (props: any) => {
  const { handleCloseModal, transactionId, refreshTransactions } = props;
  const [transactionNote, setTransactionNote] = useState("");

  const handleDecline = async () => {
    try {
      console.log("Sending decline request:", {
        transactionId,
        transactionNote,
      });
      const response = await fetch("/api/withdrawRequest/decline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId, transactionNote }),
      });

      const result = await response.json();
      console.log("Decline response:", result);

      if (result.success) {
        console.log("Decline logged successfully");
        refreshTransactions();
      } else {
        console.error("Failed to log decline:", result.message);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error declining transaction:", error);
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
            handleDecline();
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
            Reject Withdrawal Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeclineTransactionModal;
