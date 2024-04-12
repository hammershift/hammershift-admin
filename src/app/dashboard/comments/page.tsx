"use client";

import {
    deleteComment,
    getAllComments,
    getSortedComments,
} from "@/app/lib/data";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import {
    RegExpMatcher,
    TextCensor,
    englishDataset,
    englishRecommendedTransformers,
} from "obscenity";

import { BeatLoader } from "react-spinners";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Preview";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

export default function Comments() {
    const [comments, setComments] = useState([]);
    const [newestComments, setNewestComments] = useState([]);
    const [oldestComments, setOldestComments] = useState([]);
    const [likedComments, setLikedComments] = useState([]);
    const [dislikedComments, setDislikedComments] = useState([]);
    const [dateArrowUp, setDateArrowUp] = useState(false);
    const [likesAndDislikesArrowUp, setLikesAndDislikesArrowUp] =
        useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [displayCount, setDisplayCount] = useState(7);
    const [commentID, setCommentID] = useState("");
    const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
    const matcher = new RegExpMatcher({
        ...englishDataset.build(),
        ...englishRecommendedTransformers,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAllComments(displayCount);
                setComments(data);

                const newest = await getSortedComments(displayCount, "newest");
                setNewestComments(newest);

                const oldest = await getSortedComments(displayCount, "oldest");
                setOldestComments(oldest);

                const likes = await getSortedComments(displayCount, "likes");
                setDislikedComments(likes);

                const dislikes = await getSortedComments(
                    displayCount,
                    "dislikes"
                );
                setLikedComments(dislikes);

                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [displayCount]);

    const removeComment = async (commentID: string) => {
        await deleteComment(commentID);
        const filteredComments = comments.filter(
            (comment: any) => comment._id !== commentID
        );
        setComments(filteredComments);
        setShowDeleteCommentModal(false);
    };

    const closeModal = () => {
        setShowDeleteCommentModal(false);
    };

    const sortDate = () => {
        if (comments === newestComments) {
            setComments(oldestComments);
            setDateArrowUp(false);
            return;
        }

        setComments(newestComments);
        setDateArrowUp(true);
    };

    const sortLikesAndDislikes = () => {
        if (comments === dislikedComments) {
            setComments(likedComments);
            setLikesAndDislikesArrowUp(false);
            return;
        }

        setComments(dislikedComments);
        setLikesAndDislikesArrowUp(true);
    };

    const loadMoreComments = () => {
        setDisplayCount((prev) => prev + 7);
    };

    return (
        <div>
            <div className="section-container tw-mt-4">
                <div className="tw-font-bold">Comments Moderation</div>
                <div className="tw-my-4">
                    {isLoading ? (
                        <div className="tw-flex tw-justify-center tw-items-center tw-h-[592px]">
                            <BeatLoader color="#F2CA16" />
                        </div>
                    ) : (
                        <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
                            <thead className="tw-w-full">
                                <tr className="">
                                    <th className="tw-font-bold tw-p-2.5">
                                        User
                                    </th>
                                    <th className="tw-font-bold tw-p-2.5">
                                        Comment
                                    </th>
                                    <th className="tw-font-bold tw-p-2.5">
                                        <button onClick={sortLikesAndDislikes}>
                                            Likes/Dislikes{" "}
                                            {likesAndDislikesArrowUp ? (
                                                <ArrowDropUpIcon />
                                            ) : (
                                                <ArrowDropDownIcon />
                                            )}
                                        </button>
                                    </th>
                                    <th className="tw-font-bold tw-p-2.5">
                                        <button onClick={sortDate}>
                                            Date Posted{" "}
                                            {dateArrowUp ? (
                                                <ArrowDropUpIcon />
                                            ) : (
                                                <ArrowDropDownIcon />
                                            )}
                                        </button>
                                    </th>
                                    <th className="tw-font-bold tw-p-2.5">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="tw-w-full">
                                {comments &&
                                    comments.map((item: any, index) => (
                                        <tr
                                            key={item._id}
                                            className={`${
                                                matcher.hasMatch(item.comment)
                                                    ? " tw-bg-rose-700/20 tw-border"
                                                    : "tw-bg-[#fff]/5"
                                            }`}
                                        >
                                            <td className="tw-p-2.5 tw-w-1/5">
                                                <div>{item.user.username}</div>
                                                <div className="tw-text-sm">
                                                    {item.user.userId}
                                                </div>
                                            </td>
                                            <td className="tw-p-2.5 tw-w-1/3">
                                                <div className=" tw-line-clamp-1">
                                                    {item.comment}
                                                </div>
                                            </td>
                                            <td className="tw-p-2.5 tw-w-1/8">
                                                <span className=" tw-text-green-500">
                                                    {item.likes.length}
                                                </span>{" "}
                                                /{" "}
                                                <span className=" tw-text-red-500">
                                                    {item.dislikes.length}
                                                </span>
                                            </td>
                                            <td className="tw-p-2.5 tw-w-1/8">
                                                {DateTime.fromISO(
                                                    item.createdAt
                                                ).toFormat("MM/dd/yy hh:mm a")}
                                            </td>
                                            <td className="tw-p-2.5 tw-w-1/8">
                                                <button>
                                                    <PreviewIcon />
                                                </button>
                                                <Link
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    href={
                                                        item.pageType ===
                                                        "auction"
                                                            ? `https://hammershift.vercel.app/auctions/car_view_page/${item.pageID}`
                                                            : `https://hammershift.vercel.app/tournaments/${item.pageID}`
                                                    }
                                                >
                                                    <OpenInNewIcon />
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setShowDeleteCommentModal(
                                                            true
                                                        );
                                                        setCommentID(item._id);
                                                    }}
                                                >
                                                    <DeleteIcon
                                                        sx={{
                                                            color: "#C2451E",
                                                        }}
                                                    />
                                                </button>
                                                {showDeleteCommentModal ? (
                                                    <DeleteCommentModal
                                                        removeComment={
                                                            removeComment
                                                        }
                                                        closeModal={closeModal}
                                                        commentID={commentID}
                                                    />
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="tw-flex tw-flex-col tw-items-center tw-gap-4 tw-py-4">
                    <button
                        onClick={loadMoreComments}
                        className="btn-transparent-white"
                    >
                        Load More
                    </button>
                </div>
            </div>
        </div>
    );
}

interface DeleteCommentModalI {
    removeComment: (commentID: string) => void;
    closeModal: () => void;
    commentID: string;
}

export function DeleteCommentModal({
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
