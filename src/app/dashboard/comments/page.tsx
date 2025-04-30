"use client";

import {
  deleteComment,
  deleteMultipleComments,
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
import { useRouter } from "next/navigation";

import { BeatLoader } from "react-spinners";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Preview";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteCommentModal from "@/app/ui/dashboard/modals/delete_comment_modal";
import Checkbox from "@mui/material/Checkbox";
import CommmentInfo, {
  CommentInfoI,
} from "@/app/ui/dashboard/modals/comment_info_modal";

export default function Comments() {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [commentData, setCommentData] = useState<any>();
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInfoModal, setCommentInfoModal] = useState(false);
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

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [displayCount, showDeleteCommentModal, showDeleteSelectedModal]);

  const removeComment = async (commentID: string) => {
    await deleteComment(commentID);
    setShowDeleteCommentModal(false);
  };

  const removeSelectedComments = async () => {
    await deleteMultipleComments(selectedIDs);
    setSelectedIDs([]);
    setShowDeleteSelectedModal(false);
  };

  const closeModal = () => {
    setShowDeleteCommentModal(false);
    setShowDeleteSelectedModal(false);
    setCommentInfoModal(false);
  };

  const loadMoreComments = () => {
    setDisplayCount((prev) => prev + 7);
  };

  const addOrRemoveID = (id: string) => {
    setSelectedIDs((prev) => {
      if (prev.includes(id)) {
        return prev.filter((commentID) => commentID !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div>
      <div className="section-container mt-4">
        <div className="flex justify-between">
          <div className="font-bold">Comments Moderation</div>
          {selectedIDs.length !== 0 && (
            <>
              <button
                onClick={() => setShowDeleteSelectedModal(true)}
                className="text-sm font-bold text-[#C2451E] flex items-center border border-[#C2451E] px-2 gap-2 rounded hover:text-[#1a2c3d] hover:bg-[#C2451E]"
              >
                <div>Delete Selected({selectedIDs.length})</div>
                <DeleteIcon
                  sx={{
                    fontSize: "20px",
                  }}
                />
              </button>
              {showDeleteSelectedModal ? (
                <DeleteCommentModal
                  removeSelectedComments={removeSelectedComments}
                  closeModal={closeModal}
                />
              ) : null}
            </>
          )}
        </div>
        <div className="my-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-[592px]">
              <BeatLoader color="#F2CA16" />
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-y-2 text-center">
              <thead className="w-full">
                <tr className="">
                  <th className="font-bold p-2.5"></th>
                  <th className="font-bold p-2.5">User</th>
                  <th className="font-bold p-2.5">Comment</th>
                  <th className="font-bold p-2.5">
                    <button
                      onClick={() => router.push("/dashboard/comments/likes")}
                    >
                      Likes/Dislikes <ArrowDropDownIcon />
                    </button>
                  </th>
                  <th className="font-bold p-2.5">
                    <button
                      onClick={() => router.push("/dashboard/comments/newest")}
                    >
                      Date Posted <ArrowDropDownIcon />
                    </button>
                  </th>
                  <th className="font-bold p-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="w-full">
                {comments &&
                  comments.map((item: any, index) => (
                    <tr
                      key={item._id}
                      className={`${
                        matcher.hasMatch(item.comment)
                          ? " bg-rose-700/20 border"
                          : "bg-[#fff]/5"
                      }`}
                    >
                      <td className="p-2.5 w-1/8">
                        <Checkbox
                          sx={{ color: "white" }}
                          onClick={() => addOrRemoveID(item._id)}
                        />
                      </td>
                      <td className="p-2.5 w-1/5">
                        <div>{item.user.username}</div>
                        <div className="text-sm">{item.user.userId}</div>
                      </td>
                      <td className="p-2.5 w-1/3">
                        <div className=" line-clamp-1">{item.comment}</div>
                      </td>
                      <td className="p-2.5 w-1/8">
                        <span className=" text-green-500">
                          {item.likes.length}
                        </span>{" "}
                        /{" "}
                        <span className=" text-red-500">
                          {item.dislikes.length}
                        </span>
                      </td>
                      <td className="p-2.5 w-1/8">
                        {DateTime.fromISO(item.createdAt).toFormat(
                          "MM/dd/yy hh:mm a"
                        )}
                      </td>
                      <td className="p-2.5 w-1/8">
                        <button
                          onClick={() => {
                            setCommentInfoModal(true);
                            setCommentData(item);
                          }}
                        >
                          <PreviewIcon />
                        </button>
                        {commentInfoModal ? (
                          <CommmentInfo
                            commentData={commentData}
                            closeModal={closeModal}
                          />
                        ) : null}
                        <Link
                          target="_blank"
                          rel="noopener noreferrer"
                          href={
                            item.pageType === "auction"
                              ? `https://hammershift.vercel.app/auctions/car_view_page/${item.pageID}`
                              : `https://hammershift.vercel.app/tournaments/${item.pageID}`
                          }
                        >
                          <OpenInNewIcon />
                        </Link>
                        <button
                          onClick={() => {
                            setShowDeleteCommentModal(true);
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
                            removeComment={removeComment}
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
        <div className="flex flex-col items-center gap-4 py-4">
          <button onClick={loadMoreComments} className="btn-transparent-white">
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
