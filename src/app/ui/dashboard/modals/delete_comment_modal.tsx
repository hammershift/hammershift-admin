interface DeleteCommentModalI {
    removeComment?: (commentID: string) => void;
    removeSelectedComments?: () => void;
    closeModal: () => void;
    commentID?: string;
    item?: {
        _id: string;
        comment: string;
        pageID: string;
        user: {
            userID: string;
            username: string;
        };
        likes: string[];
        dislikes: string[];
        createdAt: Date;
    };
}

export default function DeleteCommentModal({
    removeComment,
    closeModal,
    commentID,
    removeSelectedComments,
}: DeleteCommentModalI) {
    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-5 tw-backdrop-blur-[0.5px] tw-flex tw-justify-center tw-items-center tw-z-30">
            <div className="tw-w-[600px] tw-flex tw-flex-col">
                <div className="section-container tw-border-2 tw-mt-4">
                    {removeSelectedComments ? (
                        <div className="tw-text-center tw-font-bold tw-text-2xl tw-mb-7">
                            Delete selected comments?
                        </div>
                    ) : (
                        <div className="tw-text-center tw-font-bold tw-text-2xl tw-mb-7">
                            Delete comment?
                        </div>
                    )}
                    <div className="tw-flex tw-justify-between tw-px-6">
                        {commentID && removeComment ? (
                            <button onClick={() => removeComment(commentID)}>
                                YES
                            </button>
                        ) : null}
                        {removeSelectedComments ? (
                            <button onClick={removeSelectedComments}>
                                YES
                            </button>
                        ) : null}
                        <button onClick={closeModal}>NO</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
