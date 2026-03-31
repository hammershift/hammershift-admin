import React, { useState } from "react";
import ApproveTransactionModal from "../modals/approve_transaction_modal";
import DeclineTransactionModal from "../modals/decline_transaction_modal";

const TransactionsPage = (props: any) => {
  const {
    withdrawTransactions,
    refreshTransactions,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    totalPages,
  } = props;

  const exportCSV = () => {
    const csvHeaders = ['Date', 'Transaction ID', 'Account Name', 'Type', 'Amount', 'Account Number', 'Status'];
    const rows = withdrawTransactions.map((tx: any) => [
      new Date(tx.transactionDate).toDateString(),
      tx._id,
      tx.accountName ?? '',
      tx.transactionType ?? '',
      tx.amount ?? '',
      tx.accountNumber ?? '',
      tx.status ?? '',
    ]);
    const csv = [csvHeaders.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyFilters = () => {
    if (setPage) setPage(1);
    refreshTransactions();
  };

  const [isApproveTransactionModalOpen, setIsApproveTransactionModalOpen] =
    useState(false);
  const [isDeclineTransactionModalOpen, setIsDeclineTransactionModalOpen] =
    useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  const handleCloseModal = () => {
    setIsApproveTransactionModalOpen(false);
    setIsDeclineTransactionModalOpen(false);
    setSelectedTransactionId(null);
    refreshTransactions();
  };

  const handleApproveClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setIsApproveTransactionModalOpen(true);
  };

  const handleDeclineClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setIsDeclineTransactionModalOpen(true);
  };

  const headers = [
    { KEY: "transactionDate", LABEL: "Date" },
    { KEY: "_id", LABEL: "Transaction ID" },
    { KEY: "accountName", LABEL: "Account Name" },
    { KEY: "transactionType", LABEL: "Type" },
    { KEY: "amount", LABEL: "Amount" },
    { KEY: "accountNumber", LABEL: "Account Number" },
    { KEY: "status", LABEL: "Status" },
    { KEY: "actions", LABEL: "Actions" },
    { KEY: "remarks", LABEL: "Remarks" },
  ];

  return (
    <div className="section-container mt-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1>Withdraw Transactions</h1>
        <button
          onClick={exportCSV}
          style={{
            backgroundColor: '#F2CA16',
            color: '#0C1924',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#13202D',
          border: '1px solid #2A3A4A',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <select
          value={statusFilter ?? 'all'}
          onChange={(e) => setStatusFilter && setStatusFilter(e.target.value)}
          style={{
            backgroundColor: '#1E2A36',
            border: '1px solid #2A3A4A',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            outline: 'none',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="processing">Processing</option>
          <option value="successful">Successful</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="text"
          placeholder="Search by name or transaction ID..."
          value={searchQuery ?? ''}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
          style={{
            backgroundColor: '#1E2A36',
            border: '1px solid #2A3A4A',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            flex: 1,
            outline: 'none',
          }}
        />
        <button
          onClick={handleApplyFilters}
          style={{
            backgroundColor: '#F2CA16',
            color: '#0C1924',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>

      {withdrawTransactions.length === 0 ? (
        <p>No withdraw transactions found.</p>
      ) : (
        <table className="w-full border-separate border-spacing-y-2 text-center table-auto">
          <thead>
            <tr className="text-center">
              {headers.map((header, index) => (
                <td className="p-2.5 font-bold" key={index}>
                  {header.LABEL}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {withdrawTransactions.map((withdrawTransaction: any) => (
              <tr
                key={withdrawTransaction._id}
                className="rounded-lg m-2 bg-[#fff]/5"
              >
                {headers.map((header, index) => (
                  <td className="p-2.5 content-center" key={index}>
                    {header.KEY === "actions" ? (
                      <div>
                        <button
                          className={`p-1 font-bold ${
                            withdrawTransaction.status === "successful" ||
                            withdrawTransaction.status === "failed"
                              ? "text-gray-600"
                              : "text-red-700"
                          }`}
                          onClick={() =>
                            handleDeclineClick(withdrawTransaction._id)
                          }
                          disabled={
                            withdrawTransaction.status === "successful" ||
                            withdrawTransaction.status === "failed"
                          }
                        >
                          Decline
                        </button>
                        <span className="text-white/30">|</span>
                        <button
                          className={`p-1  font-bold ${
                            withdrawTransaction.status === "successful" ||
                            withdrawTransaction.status === "failed"
                              ? "text-gray-600"
                              : "text-green-700"
                          }`}
                          onClick={() =>
                            handleApproveClick(withdrawTransaction._id)
                          }
                          disabled={
                            withdrawTransaction.status === "successful" ||
                            withdrawTransaction.status === "failed"
                          }
                        >
                          Approve
                        </button>
                      </div>
                    ) : header.KEY === "remarks" ? (
                      <p>
                        {withdrawTransaction.status === "failed" ||
                        withdrawTransaction.status === "successful"
                          ? withdrawTransaction.note
                          : withdrawTransaction.status === undefined
                          ? "N/A"
                          : "Pending action"}
                      </p>
                    ) : header.KEY === "transactionDate" ? (
                      new Date(
                        withdrawTransaction.transactionDate
                      ).toDateString()
                    ) : (
                      withdrawTransaction[header.KEY]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Pagination */}
      {totalPages > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
            padding: '12px 0',
          }}
        >
          <button
            onClick={() => setPage && setPage(Math.max(1, (page ?? 1) - 1))}
            disabled={!page || page <= 1}
            style={{
              backgroundColor: !page || page <= 1 ? '#1E2A36' : '#F2CA16',
              color: !page || page <= 1 ? '#94A3B8' : '#0C1924',
              border: '1px solid #2A3A4A',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: !page || page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ color: '#94A3B8' }}>
            Page {page ?? 1} of {totalPages ?? 1}
          </span>
          <button
            onClick={() => setPage && setPage(Math.min(totalPages ?? 1, (page ?? 1) + 1))}
            disabled={!page || !totalPages || page >= totalPages}
            style={{
              backgroundColor: !page || !totalPages || page >= totalPages ? '#1E2A36' : '#F2CA16',
              color: !page || !totalPages || page >= totalPages ? '#94A3B8' : '#0C1924',
              border: '1px solid #2A3A4A',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: !page || !totalPages || page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}

      {isApproveTransactionModalOpen && (
        <ApproveTransactionModal
          handleCloseModal={handleCloseModal}
          transactionId={selectedTransactionId}
          refreshTransactions={refreshTransactions}
        />
      )}
      {isDeclineTransactionModalOpen && (
        <DeclineTransactionModal
          handleCloseModal={handleCloseModal}
          transactionId={selectedTransactionId}
          refreshTransactions={refreshTransactions}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
