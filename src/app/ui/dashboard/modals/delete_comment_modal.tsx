interface DeleteCommentModalI {
    removeComment: (commentID: string) => void;
    closeModal: () => void;
    commentID: string;
}

export default function DeleteCommentModal({
    removeComment,
    closeModal,
    commentID,
}: DeleteCommentModalI) {
    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-5 tw-backdrop-blur-[0.5px] tw-flex tw-justify-center tw-items-center tw-z-30">
            <div className="tw-w-[600px] tw-flex tw-flex-col">
                <div className="section-container tw-border-2 tw-mt-4">
                    <div className="tw-text-center tw-font-bold tw-text-2xl tw-mb-7">
                        Delete this comment?
                    </div>
                    <div className="tw-flex tw-justify-between tw-px-6">
                        <button onClick={() => removeComment(commentID)}>
                            YES
                        </button>
                        <button onClick={() => closeModal()}>NO</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
