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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(30);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchWithdrawalTransactions = async (
    limit: number,
    currentPage: number = 1,
    status: string = "all",
    search: string = ""
  ) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", String(currentPage));
    if (status !== "all") params.set("status", status);
    if (search.trim()) params.set("search", search.trim());

    const res = await fetch(`/api/transactions?${params.toString()}`, {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error("Unable to fetch withdrawal transactions");
    }
    const data = await res.json();
    // Support both array response (existing) and paginated object response (future)
    if (Array.isArray(data)) {
      setWithdrawTransactions(data);
      setTotalPages(1);
    } else if (data.transactions) {
      setWithdrawTransactions(data.transactions);
      setTotalPages(data.totalPages ?? 1);
    } else {
      setWithdrawTransactions(data);
      setTotalPages(1);
    }
  };

  useEffect(() => {
    fetchWithdrawalTransactions(pageSize, page, statusFilter, searchQuery);
  }, [page]);

  const refreshTransactions = () => {
    fetchWithdrawalTransactions(pageSize, page, statusFilter, searchQuery);
  };

  return (
    <TransactionsPage
      withdrawTransactions={withdrawTransactions}
      refreshTransactions={refreshTransactions}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
    />
  );
};

export default Transactions;
