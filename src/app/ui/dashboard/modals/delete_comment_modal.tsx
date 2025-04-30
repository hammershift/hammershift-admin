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
    <div className="fixed inset-0 bg-black bg-opacity-5 backdrop-blur-[0.5px] flex justify-center items-center z-30">
      <div className="w-[600px] flex flex-col">
        <div className="section-container border-2 mt-4">
          {removeSelectedComments ? (
            <div className="text-center font-bold text-2xl mb-7">
              Delete selected comments?
            </div>
          ) : (
            <div className="text-center font-bold text-2xl mb-7">
              Delete comment?
            </div>
          )}
          <div className="flex justify-between px-6">
            {commentID && removeComment ? (
              <button onClick={() => removeComment(commentID)}>YES</button>
            ) : null}
            {removeSelectedComments ? (
              <button onClick={removeSelectedComments}>YES</button>
            ) : null}
            <button onClick={closeModal}>NO</button>
          </div>
        </div>
      </div>
    </div>
  );
}
