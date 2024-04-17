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
                const parentComment = await getParentComment(
                    commentData.parentID
                );
                setParentComment(parentComment);
                setIsLoading(false);
            }
        }
        fetchReplies();
    }, []);

    return (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-5 tw-backdrop-blur-[0.5px] tw-flex tw-justify-center tw-items-center tw-z-30">
            <div className="tw-bg-[#1a2c3d] tw-rounded tw-border-2 tw-p-10 tw-w-[832px] tw-h-[500px] tw-overflow-y-auto">
                <div className="tw-flex tw-justify-between tw-items-start">
                    <div className=" tw-text-2xl tw-font-bold tw-text-left tw-mb-10 tw-text-[#f2ca16]">
                        Comment Thread
                    </div>
                    <button onClick={closeModal}>❌</button>
                </div>
                {isLoading ? (
                    <div className="tw-flex tw-justify-center tw-items-center tw-h-1/2">
                        <BeatLoader color="#f2ca16" />
                    </div>
                ) : (
                    <div>
                        {!commentData.parentID && replies && (
                            <>
                                <div className="tw-flex tw-flex-col tw-items-start tw-gap-2 tw-p-3 tw-border-b tw-border-[#7474744d] tw-bg-yellow-300/10 tw-text-left">
                                    <div className="tw-flex tw-gap-2 tw-items-end">
                                        <div className="tw-font-bold">
                                            {commentData.user.username}
                                        </div>
                                        <div className="tw-text-[#f2ca16]">
                                            User
                                        </div>
                                        <div className="tw-text-sm tw-opacity-80">
                                            {DateTime.fromISO(
                                                commentData.createdAt
                                            ).toFormat("MM/dd/yy hh:mm a")}
                                        </div>
                                    </div>
                                    <div>{commentData.comment}</div>
                                    <div className="tw-flex tw-gap-3 tw-opacity-80">
                                        <button className="tw-text-sm">
                                            Reply as a MOD
                                        </button>
                                        <div>·</div>
                                        <div className="tw-relative">
                                            <ThumbUpAltIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                            <span className="tw-text-xs tw-absolute -tw-right-[9px] tw-top-[6px]">
                                                {commentData.likes.length !==
                                                    0 &&
                                                    commentData.likes.length}
                                            </span>
                                        </div>
                                        <div className="tw-relative">
                                            <ThumbDownAltIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                            <span className="tw-text-xs tw-absolute -tw-right-[9px] tw-top-[6px]">
                                                {commentData.dislikes.length !==
                                                    0 &&
                                                    commentData.dislikes.length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="tw-flex tw-gap-2 tw-items-end tw-text-[#42a0ff]">
                                        <div>
                                            <SubdirectoryArrowRightIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                        </div>
                                        <div className="tw-text-sm">
                                            {replies.length}{" "}
                                            {replies.length === 1
                                                ? "Reply"
                                                : "Replies"}
                                        </div>
                                    </div>
                                </div>
                                {replies ? (
                                    replies.map((reply: any) => {
                                        return (
                                            <div
                                                className="tw-flex tw-flex-col tw-items-start tw-gap-2 tw-pl-8 tw-text-left tw-text-sm tw-py-1.5 tw-pr-3"
                                                key={reply._id}
                                            >
                                                <div className="tw-flex tw-gap-2 tw-items-end">
                                                    <div className="tw-font-bold">
                                                        {reply.user.username}
                                                    </div>
                                                    <div className="tw-text-[#f2ca16]">
                                                        User
                                                    </div>
                                                    <div className="tw-text-xs tw-opacity-80">
                                                        {DateTime.fromISO(
                                                            reply.createdAt
                                                        ).toFormat(
                                                            "MM/dd/yy hh:mm a"
                                                        )}
                                                    </div>
                                                </div>
                                                <div>{reply.comment}</div>
                                                <div className="tw-flex tw-gap-3 tw-opacity-80">
                                                    <div className="tw-relative">
                                                        <ThumbUpAltIcon
                                                            sx={{
                                                                fontSize:
                                                                    "18px",
                                                            }}
                                                        />
                                                        <span className="tw-text-xs tw-absolute -tw-right-[8px] tw-top-[4px]">
                                                            {reply.likes
                                                                .length !== 0 &&
                                                                reply.likes
                                                                    .length}
                                                        </span>
                                                    </div>
                                                    <div className="tw-relative">
                                                        <ThumbDownAltIcon
                                                            sx={{
                                                                fontSize:
                                                                    "18px",
                                                            }}
                                                        />
                                                        <span className="tw-text-xs tw-absolute -tw-right-[8px] tw-top-[4px] tw-z-10">
                                                            {reply.dislikes
                                                                .length !== 0 &&
                                                                reply.dislikes
                                                                    .length}
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
                                <div className="tw-flex tw-flex-col tw-items-start tw-gap-2 tw-p-3 tw-border-b tw-border-[#7474744d] tw-text-left">
                                    <div className="tw-flex tw-gap-2 tw-items-end">
                                        <div className="tw-font-bold">
                                            {parentComment.user.username}
                                        </div>
                                        <div className="tw-text-[#f2ca16]">
                                            User
                                        </div>
                                        <div className="tw-text-sm tw-opacity-80">
                                            {DateTime.fromISO(
                                                parentComment.createdAt
                                            ).toFormat("MM/dd/yy hh:mm a")}
                                        </div>
                                    </div>
                                    <div>{parentComment.comment}</div>
                                    <div className="tw-flex tw-gap-3 tw-opacity-80">
                                        <button className="tw-text-sm">
                                            Reply as a MOD
                                        </button>
                                        <div>·</div>
                                        <div className="tw-relative">
                                            <ThumbUpAltIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                            <span className="tw-text-xs tw-absolute -tw-right-[9px] tw-top-[6px]">
                                                {parentComment.likes.length !==
                                                    0 &&
                                                    parentComment.likes.length}
                                            </span>
                                        </div>
                                        <div className="tw-relative">
                                            <ThumbDownAltIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                            <span className="tw-text-xs tw-absolute -tw-right-[9px] tw-top-[6px]">
                                                {parentComment.dislikes
                                                    .length !== 0 &&
                                                    parentComment.dislikes
                                                        .length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="tw-flex tw-gap-2 tw-items-end tw-text-[#42a0ff]">
                                        <div>
                                            <SubdirectoryArrowRightIcon
                                                sx={{ fontSize: "20px" }}
                                            />
                                        </div>
                                        <div className="tw-text-sm">
                                            {replies.length}{" "}
                                            {replies.length === 1
                                                ? "Reply"
                                                : "Replies"}
                                        </div>
                                    </div>
                                </div>
                                {replies ? (
                                    replies.map((reply: any) => {
                                        return (
                                            <div
                                                className={`tw-flex tw-flex-col tw-items-start tw-gap-2 tw-pl-8 tw-text-left tw-text-sm tw-py-1.5 tw-pr-3 ${
                                                    reply._id ===
                                                        commentData._id &&
                                                    "tw-bg-yellow-300/10"
                                                }`}
                                                key={reply._id}
                                            >
                                                <div className="tw-flex tw-gap-2 tw-items-end">
                                                    <div className="tw-font-bold">
                                                        {reply.user.username}
                                                    </div>
                                                    <div className="tw-text-[#f2ca16]">
                                                        User
                                                    </div>
                                                    <div className="tw-text-xs tw-opacity-80">
                                                        {DateTime.fromISO(
                                                            reply.createdAt
                                                        ).toFormat(
                                                            "MM/dd/yy hh:mm a"
                                                        )}
                                                    </div>
                                                </div>
                                                <div>{reply.comment}</div>
                                                <div className="tw-flex tw-gap-3 tw-opacity-80">
                                                    <div className="tw-relative">
                                                        <ThumbUpAltIcon
                                                            sx={{
                                                                fontSize:
                                                                    "18px",
                                                            }}
                                                        />
                                                        <span className="tw-text-xs tw-absolute -tw-right-[8px] tw-top-[4px]">
                                                            {reply.likes
                                                                .length !== 0 &&
                                                                reply.likes
                                                                    .length}
                                                        </span>
                                                    </div>
                                                    <div className="tw-relative">
                                                        <ThumbDownAltIcon
                                                            sx={{
                                                                fontSize:
                                                                    "18px",
                                                            }}
                                                        />
                                                        <span className="tw-text-xs tw-absolute -tw-right-[8px] tw-top-[4px] tw-z-10">
                                                            {reply.dislikes
                                                                .length !== 0 &&
                                                                reply.dislikes
                                                                    .length}
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
