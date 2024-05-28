import React, { useState } from 'react';
import ApproveTransactionModal from '../modals/approve_transaction_modal';
import DeclineTransactionModal from '../modals/decline_transaction_modal';

const TransactionsPage = (props: any) => {
  const { withdrawTransactions, refreshTransactions } = props;

  const [isApproveTransactionModalOpen, setIsApproveTransactionModalOpen] = useState(false);
  const [isDeclineTransactionModalOpen, setIsDeclineTransactionModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

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
    { KEY: 'transactionDate', LABEL: 'Date' },
    { KEY: '_id', LABEL: 'Transaction ID' },
    { KEY: 'accountName', LABEL: 'Account Name' },
    { KEY: 'transactionType', LABEL: 'Type' },
    { KEY: 'amount', LABEL: 'Amount' },
    { KEY: 'accountNumber', LABEL: 'Account Number' },
    { KEY: 'status', LABEL: 'Status' },
    { KEY: 'actions', LABEL: 'Actions' },
    { KEY: 'remarks', LABEL: 'Remarks' },
  ];

  return (
    <div className='section-container tw-mt-4'>
      <h1>Withdraw Transactions</h1>
      {withdrawTransactions.length === 0 ? (
        <p>No withdraw transactions found.</p>
      ) : (
        <table className='tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center tw-table-auto'>
          <thead>
            <tr className='tw-text-center'>
              {headers.map((header, index) => (
                <td className='tw-p-2.5 tw-font-bold' key={index}>
                  {header.LABEL}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {withdrawTransactions.map((withdrawTransaction: any) => (
              <tr key={withdrawTransaction._id} className='tw-rounded-lg tw-m-2 tw-bg-[#fff]/5'>
                {headers.map((header, index) => (
                  <td className='tw-p-2.5 tw-content-center' key={index}>
                    {header.KEY === 'actions' ? (
                      <div>
                        <button
                          className='tw-p-1 tw-text-red-700 tw-font-bold'
                          onClick={() => handleDeclineClick(withdrawTransaction._id)}
                          disabled={withdrawTransaction.status === 'successful' || withdrawTransaction.status === 'failed'}
                        >
                          Decline
                        </button>
                        <span className='tw-text-white/30'>|</span>
                        <button
                          className='tw-p-1 tw-text-green-700 tw-font-bold'
                          onClick={() => handleApproveClick(withdrawTransaction._id)}
                          disabled={withdrawTransaction.status === 'successful' || withdrawTransaction.status === 'failed'}
                        >
                          Approve
                        </button>
                      </div>
                    ) : header.KEY === 'remarks' ? (
                      <p>
                        {withdrawTransaction.status === 'failed'
                          ? 'Rejected'
                          : withdrawTransaction.status === 'successful'
                          ? 'Approved'
                          : withdrawTransaction.status === undefined
                          ? 'N/A'
                          : 'Pending action'}
                      </p>
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
      {isApproveTransactionModalOpen && (
        <ApproveTransactionModal handleCloseModal={handleCloseModal} transactionId={selectedTransactionId} refreshTransactions={refreshTransactions} />
      )}
      {isDeclineTransactionModalOpen && (
        <DeclineTransactionModal handleCloseModal={handleCloseModal} transactionId={selectedTransactionId} refreshTransactions={refreshTransactions} />
      )}
    </div>
  );
};

export default TransactionsPage;
