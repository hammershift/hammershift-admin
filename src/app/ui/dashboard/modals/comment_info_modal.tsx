"use client";

import { getCommentReplies, getParentComment } from "@/app/lib/data";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";

import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import { BeatLoader, ClipLoader, MoonLoader } from "react-spinners";

export interface CommentInfoI {
  commentData: {
    _id: string;
    comment: string;
    pageID: string;
    pageType: string;
    parentID: string;
    user: {
      userID: string;
      username: string;
    };
    likes: string[];
    dislikes: string[];
    createdAt: string;
  };
  closeModal: () => void;
}

export default function CommmentInfo({
  commentData,
  closeModal,
}: CommentInfoI) {
  const [replies, setReplies] = useState<any>();
  const [parentComment, setParentComment] = useState<any>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReplies() {
      if (!commentData.parentID) {
        const replies = await getCommentReplies(commentData._id);
        setReplies(replies);
        setIsLoading(false);
      } else {
        const replies = await getCommentReplies(commentData.parentID);
        setReplies(replies);
        const parentComment = await getParentComment(commentData.parentID);
        setParentComment(parentComment);
        setIsLoading(false);
      }
    }
    fetchReplies();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-5 backdrop-blur-[0.5px] flex justify-center items-center z-30">
      <div className="bg-[#1a2c3d] rounded border-2 p-10 w-[832px] h-[500px] overflow-y-auto">
        <div className="flex justify-between items-start">
          <div className=" text-2xl font-bold text-left mb-10 text-[#f2ca16]">
            Comment Thread
          </div>
          <button onClick={closeModal}>❌</button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-1/2">
            <BeatLoader color="#f2ca16" />
          </div>
        ) : (
          <div>
            {!commentData.parentID && replies && (
              <>
                <div className="flex flex-col items-start gap-2 p-3 border-b border-[#7474744d] bg-yellow-300/10 text-left">
                  <div className="flex gap-2 items-end">
                    <div className="font-bold">{commentData.user.username}</div>
                    <div className="text-[#f2ca16]">User</div>
                    <div className="text-sm opacity-80">
                      {DateTime.fromISO(commentData.createdAt).toFormat(
                        "MM/dd/yy hh:mm a"
                      )}
                    </div>
                  </div>
                  <div>{commentData.comment}</div>
                  <div className="flex gap-3 opacity-80">
                    <button className="text-sm">Reply as a MOD</button>
                    <div>·</div>
                    <div className="relative">
                      <ThumbUpAltIcon sx={{ fontSize: "20px" }} />
                      <span className="text-xs absolute -right-[9px] top-[6px]">
                        {commentData.likes.length !== 0 &&
                          commentData.likes.length}
                      </span>
                    </div>
                    <div className="relative">
                      <ThumbDownAltIcon sx={{ fontSize: "20px" }} />
                      <span className="text-xs absolute -right-[9px] top-[6px]">
                        {commentData.dislikes.length !== 0 &&
                          commentData.dislikes.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end text-[#42a0ff]">
                    <div>
                      <SubdirectoryArrowRightIcon sx={{ fontSize: "20px" }} />
                    </div>
                    <div className="text-sm">
                      {replies.length}{" "}
                      {replies.length === 1 ? "Reply" : "Replies"}
                    </div>
                  </div>
                </div>
                {replies ? (
                  replies.map((reply: any) => {
                    return (
                      <div
                        className="flex flex-col items-start gap-2 pl-8 text-left text-sm py-1.5 pr-3"
                        key={reply._id}
                      >
                        <div className="flex gap-2 items-end">
                          <div className="font-bold">{reply.user.username}</div>
                          <div className="text-[#f2ca16]">User</div>
                          <div className="text-xs opacity-80">
                            {DateTime.fromISO(reply.createdAt).toFormat(
                              "MM/dd/yy hh:mm a"
                            )}
                          </div>
                        </div>
                        <div>{reply.comment}</div>
                        <div className="flex gap-3 opacity-80">
                          <div className="relative">
                            <ThumbUpAltIcon
                              sx={{
                                fontSize: "18px",
                              }}
                            />
                            <span className="text-xs absolute -right-[8px] top-[4px]">
                              {reply.likes.length !== 0 && reply.likes.length}
                            </span>
                          </div>
                          <div className="relative">
                            <ThumbDownAltIcon
                              sx={{
                                fontSize: "18px",
                              }}
                            />
                            <span className="text-xs absolute -right-[8px] top-[4px] z-10">
                              {reply.dislikes.length !== 0 &&
                                reply.dislikes.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div>No replies</div>
                )}
              </>
            )}
            {commentData.parentID && parentComment && replies && (
              <>
                <div className="flex flex-col items-start gap-2 p-3 border-b border-[#7474744d] text-left">
                  <div className="flex gap-2 items-end">
                    <div className="font-bold">
                      {parentComment.user.username}
                    </div>
                    <div className="text-[#f2ca16]">User</div>
                    <div className="text-sm opacity-80">
                      {DateTime.fromISO(parentComment.createdAt).toFormat(
                        "MM/dd/yy hh:mm a"
                      )}
                    </div>
                  </div>
                  <div>{parentComment.comment}</div>
                  <div className="flex gap-3 opacity-80">
                    <button className="text-sm">Reply as a MOD</button>
                    <div>·</div>
                    <div className="relative">
                      <ThumbUpAltIcon sx={{ fontSize: "20px" }} />
                      <span className="text-xs absolute -right-[9px] top-[6px]">
                        {parentComment.likes.length !== 0 &&
                          parentComment.likes.length}
                      </span>
                    </div>
                    <div className="relative">
                      <ThumbDownAltIcon sx={{ fontSize: "20px" }} />
                      <span className="text-xs absolute -right-[9px] top-[6px]">
                        {parentComment.dislikes.length !== 0 &&
                          parentComment.dislikes.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end text-[#42a0ff]">
                    <div>
                      <SubdirectoryArrowRightIcon sx={{ fontSize: "20px" }} />
                    </div>
                    <div className="text-sm">
                      {replies.length}{" "}
                      {replies.length === 1 ? "Reply" : "Replies"}
                    </div>
                  </div>
                </div>
                {replies ? (
                  replies.map((reply: any) => {
                    return (
                      <div
                        className={`flex flex-col items-start gap-2 pl-8 text-left text-sm py-1.5 pr-3 ${
                          reply._id === commentData._id && "bg-yellow-300/10"
                        }`}
                        key={reply._id}
                      >
                        <div className="flex gap-2 items-end">
                          <div className="font-bold">{reply.user.username}</div>
                          <div className="text-[#f2ca16]">User</div>
                          <div className="text-xs opacity-80">
                            {DateTime.fromISO(reply.createdAt).toFormat(
                              "MM/dd/yy hh:mm a"
                            )}
                          </div>
                        </div>
                        <div>{reply.comment}</div>
                        <div className="flex gap-3 opacity-80">
                          <div className="relative">
                            <ThumbUpAltIcon
                              sx={{
                                fontSize: "18px",
                              }}
                            />
                            <span className="text-xs absolute -right-[8px] top-[4px]">
                              {reply.likes.length !== 0 && reply.likes.length}
                            </span>
                          </div>
                          <div className="relative">
                            <ThumbDownAltIcon
                              sx={{
                                fontSize: "18px",
                              }}
                            />
                            <span className="text-xs absolute -right-[8px] top-[4px] z-10">
                              {reply.dislikes.length !== 0 &&
                                reply.dislikes.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div>No replies</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
