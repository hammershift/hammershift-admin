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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/ui/components/dialog";
import { Button } from "@/app/ui/components/button";
import { Ban, Edit, LockOpen, Trash2 } from "lucide-react";
import { Label } from "@/app/ui/components/label";
import { Input } from "@/app/ui/components/input";
import { BeatLoader } from "react-spinners";
import { formatDate } from "@/app/helpers/utils";
interface CommentData {
  _id: string;
  comment: string;
  pageID: string;
  pageType: string;
  parentID?: string;
  user: {
    userId: string;
    username: string;
    profilePicture?: string;
  };
  likes: [];
  dislikes: [];
  createdAt: Date;
}

export default function Comments() {
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const [selectedComment, setSelectedComment] = useState<CommentData>();
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commentInfoModal, setCommentInfoModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(7);
  const [commentID, setCommentID] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllComments(displayCount);
        setComments(data.comments as CommentData[]);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [displayCount]);

  const removeComment = async (commentID: string) => {
    await deleteComment(commentID);
    setShowDeleteModal(false);
  };

  const removeSelectedComments = async () => {
    await deleteMultipleComments(selectedIDs);
    setSelectedIDs([]);
    setShowDeleteSelectedModal(false);
  };

  const closeModal = () => {
    setShowDeleteModal(false);
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

  // return (
  //   <div>
  //     <div className="section-container mt-4">
  //       <div className="flex justify-between">
  //         <div className="font-bold">Comments Moderation</div>
  //         {selectedIDs.length !== 0 && (
  //           <>
  //             <button
  //               onClick={() => setShowDeleteSelectedModal(true)}
  //               className="text-sm font-bold text-[#C2451E] flex items-center border border-[#C2451E] px-2 gap-2 rounded hover:text-[#1a2c3d] hover:bg-[#C2451E]"
  //             >
  //               <div>Delete Selected({selectedIDs.length})</div>
  //               <DeleteIcon
  //                 sx={{
  //                   fontSize: "20px",
  //                 }}
  //               />
  //             </button>
  //             {showDeleteSelectedModal ? (
  //               <DeleteCommentModal
  //                 removeSelectedComments={removeSelectedComments}
  //                 closeModal={closeModal}
  //               />
  //             ) : null}
  //           </>
  //         )}
  //       </div>
  //       <div className="my-4">
  //         {isLoading ? (
  //           <div className="flex justify-center items-center h-[592px]">
  //             <BeatLoader color="#F2CA16" />
  //           </div>
  //         ) : (
  //           <table className="w-full border-separate border-spacing-y-2 text-center">
  //             <thead className="w-full">
  //               <tr className="">
  //                 <th className="font-bold p-2.5"></th>
  //                 <th className="font-bold p-2.5">User</th>
  //                 <th className="font-bold p-2.5">Comment</th>
  //                 <th className="font-bold p-2.5">
  //                   <button
  //                     onClick={() => router.push("/dashboard/comments/likes")}
  //                   >
  //                     Likes/Dislikes <ArrowDropDownIcon />
  //                   </button>
  //                 </th>
  //                 <th className="font-bold p-2.5">
  //                   <button
  //                     onClick={() => router.push("/dashboard/comments/newest")}
  //                   >
  //                     Date Posted <ArrowDropDownIcon />
  //                   </button>
  //                 </th>
  //                 <th className="font-bold p-2.5">Actions</th>
  //               </tr>
  //             </thead>
  //             <tbody className="w-full">
  //               {comments &&
  //                 comments.map((item: any, index) => (
  //                   <tr
  //                     key={item._id}
  //                     className={`${
  //                       matcher.hasMatch(item.comment)
  //                         ? " bg-rose-700/20 border"
  //                         : "bg-[#fff]/5"
  //                     }`}
  //                   >
  //                     <td className="p-2.5 w-1/8">
  //                       <Checkbox
  //                         sx={{ color: "white" }}
  //                         onClick={() => addOrRemoveID(item._id)}
  //                       />
  //                     </td>
  //                     <td className="p-2.5 w-1/5">
  //                       <div>{item.user.username}</div>
  //                       <div className="text-sm">{item.user.userId}</div>
  //                     </td>
  //                     <td className="p-2.5 w-1/3">
  //                       <div className=" line-clamp-1">{item.comment}</div>
  //                     </td>
  //                     <td className="p-2.5 w-1/8">
  //                       <span className=" text-green-500">
  //                         {item.likes.length}
  //                       </span>{" "}
  //                       /{" "}
  //                       <span className=" text-red-500">
  //                         {item.dislikes.length}
  //                       </span>
  //                     </td>
  //                     <td className="p-2.5 w-1/8">
  //                       {DateTime.fromISO(item.createdAt).toFormat(
  //                         "MM/dd/yy hh:mm a"
  //                       )}
  //                     </td>
  //                     <td className="p-2.5 w-1/8">
  //                       <button
  //                         onClick={() => {
  //                           setCommentInfoModal(true);
  //                           setCommentData(item);
  //                         }}
  //                       >
  //                         <PreviewIcon />
  //                       </button>
  //                       {commentInfoModal ? (
  //                         <CommmentInfo
  //                           commentData={commentData}
  //                           closeModal={closeModal}
  //                         />
  //                       ) : null}
  //                       <Link
  //                         target="_blank"
  //                         rel="noopener noreferrer"
  //                         href={
  //                           item.pageType === "auction"
  //                             ? `https://hammershift.vercel.app/auctions/car_view_page/${item.pageID}`
  //                             : `https://hammershift.vercel.app/tournaments/${item.pageID}`
  //                         }
  //                       >
  //                         <OpenInNewIcon />
  //                       </Link>
  //                       <button
  //                         onClick={() => {
  //                           setShowDeleteCommentModal(true);
  //                           setCommentID(item._id);
  //                         }}
  //                       >
  //                         <DeleteIcon
  //                           sx={{
  //                             color: "#C2451E",
  //                           }}
  //                         />
  //                       </button>
  //                       {showDeleteCommentModal ? (
  //                         <DeleteCommentModal
  //                           removeComment={removeComment}
  //                           closeModal={closeModal}
  //                           commentID={commentID}
  //                         />
  //                       ) : null}
  //                     </td>
  //                   </tr>
  //                 ))}
  //             </tbody>
  //           </table>
  //         )}
  //       </div>
  //       <div className="flex flex-col items-center gap-4 py-4">
  //         <button onClick={loadMoreComments} className="btn-transparent-white">
  //           Load More
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );

  return (
    <div className="section-container mt-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-[592px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <div>
          <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-yellow-500">
                Comments
              </CardTitle>
              <CardDescription>
                Manage and moderate user comments across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-yellow-500/90">
                        User
                      </TableHead>
                      <TableHead className="font-bold text-yellow-500/90">
                        Comment
                      </TableHead>
                      <TableHead className="font-bold text-yellow-500/90">
                        Date Posted
                      </TableHead>
                      <TableHead className="font-bold text-yellow-500/90">
                        {"Likes/Dislikes"}
                      </TableHead>
                      {/* <TableHead>Car</TableHead> */}
                      <TableHead className="font-bold text-yellow-500/90">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments &&
                      comments.map((comment: CommentData, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {comment.user.username}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="max-w-xs truncate">
                              {comment.comment}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(comment.createdAt)}</TableCell>
                          <TableCell>
                            <div>
                              <span className=" text-green-500">
                                {comment.likes.length}
                              </span>{" "}
                              /{" "}
                              <span className=" text-red-500">
                                {comment.dislikes.length}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* <Button
                              variant="ghost"
                              size="icon"
                              title="Edit User"
                              className={""}
                              onClick={() => {
                                setShowEditModal(true);
                                setSelectedUser(user);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button> */}

                              <Button
                                variant="ghost"
                                size="icon"
                                className={"text-red-700"}
                                title={"Delete Comment"}
                                onClick={() => {
                                  setShowDeleteModal(true);
                                  setSelectedComment(comment);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {selectedComment && (
                  <div className="flex items-center gap-1">
                    {/* <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                    <DialogContent className="bg-[#13202D] border-[#1E2A36]">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                          Update user information for {selectedUser!.username}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Username</Label>
                          <Input
                            className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                            name="username"
                            type="text"
                            value={selectedUser?.username || ""}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Full Name</Label>
                          <Input
                            className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                            name="fullName"
                            type="text"
                            value={selectedUser?.fullName || ""}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Email</Label>
                          <Input
                            defaultValue={selectedUser!.email}
                            className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                            name="email"
                            type="text"
                            value={selectedUser?.email || ""}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <form onSubmit={handleSubmit}>
                          <Button
                            type="submit"
                            className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                          >
                            Save Changes
                          </Button>
                        </form>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog> */}

                    <Dialog
                      open={showDeleteModal}
                      onOpenChange={setShowDeleteModal}
                    >
                      <DialogContent className="bg-[#13202D] border-[#1E2A36]">
                        <DialogHeader>
                          <DialogTitle className="text-red-700 text-xl">
                            Delete Comment
                          </DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this comment by{" "}
                            <span className="font-semibold text-red-700">
                              {selectedComment!.user.username}
                            </span>
                            ?
                          </DialogDescription>
                        </DialogHeader>

                        <div className="p-2 m-2 text-sm">
                          <p className={"text-justify"}>
                            {selectedComment?.comment}
                          </p>
                        </div>
                        <DialogFooter>
                          <form
                            onSubmit={() => removeComment(selectedComment!._id)}
                          >
                            <Button
                              type="submit"
                              className="bg-red-700 text-[#0C1924] hover:bg-red-700/90"
                            >
                              Delete
                            </Button>
                          </form>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
