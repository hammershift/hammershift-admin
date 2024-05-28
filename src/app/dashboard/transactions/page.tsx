"use client";

import React, { useEffect, useState } from "react";
import TransactionsPage from "@/app/ui/dashboard/transactionsPage/TransactionsPage";

export interface Transaction {
  _id: string;
  transactionType: string;
  amount: number;
  transactionDate: Date;
  type: string;
  invoiceId?: string;
  auctionID?: string;
  tournamentID?: string;
  auction_id?: string;
  invoice_url?: string;
  invoice_id?: string;
  accountNumber?: string;
  accountName?: string;
  status?: string;
}

const Transactions = () => {
  const [withdrawTransactions, setWithdrawTransactions] = useState<
    Transaction[]
  >([]);

  useEffect(() => {
    const fetchWithdrawalTransactions = async (limit: number) => {
      const res = await fetch(`/api/transactions?limit=${limit}`, {
        method: "GET",
      });
      if (!res.ok) {
        throw new Error("Unable to fetch withdrawal transactions");
      }
      const data = await res.json();
      setWithdrawTransactions(data);
    };
    fetchWithdrawalTransactions(30);
  }, []);
  console.log(withdrawTransactions);

  return <TransactionsPage withdrawTransactions={withdrawTransactions} />;
};

export default Transactions;
