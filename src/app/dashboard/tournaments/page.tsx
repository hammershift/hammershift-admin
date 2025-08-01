"use client";
import React, { useEffect, useState } from "react";
import { Types } from "mongoose";
import { BeatLoader } from "react-spinners";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  changeActiveStatusForTournament,
  getSelectedTournamentAuctions,
  getTournamentAuctions,
  getTournamentsWithSearch,
  computeTournamentResults,
  getTournamentPredictions,
} from "@/app/lib/data";
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
import { Badge } from "@/app/ui/components/badge";
import {
  CalendarPlus,
  Car,
  CheckSquare,
  Edit,
  Eye,
  ImageOff,
  Search,
  Square,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { Button } from "@/app/ui/components/button";
import { Label } from "@/app/ui/components/label";
import { Input } from "@/app/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/ui/components/select";
import ResponsivePagination from "react-responsive-pagination";
import "react-responsive-pagination/themes/minimal-light-dark.css";
import { Textarea } from "@/app/ui/components/textarea";
import {
  formatDate,
  formatTimeDistance,
  getDisplayName,
  getInitials,
} from "@/app/helpers/utils";
import LoadingModal from "@/app/ui/components/LoadingModal";
import AlertModal from "@/app/ui/components/AlertModal";
import { Prediction } from "@/app/models/prediction.model";

interface TournamentUser {
  userId: string;
  fullName: string;
  username: string;
  role: string;
  delta?: number;
  rank?: number;
  points?: number;
}
interface TournamentWinner extends TournamentUser {
  rank: number;
  points: number;
}
interface TournamentData {
  _id: string;
  tournament_id: number;
  name: string;
  description: string;
  type: string;
  prizePool: number;
  buyInFee: number;
  isActive: boolean;
  haveWinners: boolean;
  startTime: Date | string | null;
  endTime: Date | string | null;
  auction_ids: string[];
  users: TournamentUser[];
  maxUsers: number;
  createdAt: Date | null;
}
interface TournamentAuctionData {
  auction_id: string;
  description: string[];
  price: number;
  year: string;
  make: string;
  model: string;
  category: string;
  location: string;
  bids: number;
  image: string;
  page_url: string;
  isActive: boolean;
  ended: boolean;
  deadline: Date;
}
interface TournamentAuctionData {
  _id: string;
  auction_id: string;
  title: string;
  description: string[];
  price: number;
  year: string;
  make: string;
  model: string;
  category: string;
  location: string;
  bids: number;
  image: string;
  page_url: string;
  isActive: boolean;
  ended: boolean;
  deadline: Date;
}

const TournamentsPage = () => {
  const [tournamentData, setTournamentData] = useState<TournamentData[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [displayCount, setDisplayCount] = useState(5);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getTournamentsWithSearch({
        search: searchValue,
        offset: (currentPage - 1) * displayCount,
        limit: displayCount,
      });
      // const data = {
      //   total: 1,
      //   totalPages: 1,
      //   tournaments: [
      //     {
      //       _id: "",
      //       tournament_id: 0,
      //       name: "",
      //       description: "",
      //       type: "",
      //       prizePool: 0,
      //       buyInFee: 0,
      //       isActive: true,
      //       startTime: null,
      //       endTime: null,
      //       auction_ids: [],
      //       users: [],
      //       maxUsers: 100,
      //       createdAt: null,
      //     },
      //   ],
      // };
      if (data && "tournaments" in data) {
        setTotalTournaments(data.total);
        setTotalPages(data.totalPages);
        setTournamentData(data.tournaments as TournamentData[]);
        setIsLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchValue]);

  return (
    <div className="section-container mt-4">
      <TournamentTable
        tournamentData={tournamentData}
        fetchData={fetchData}
        setSearchValue={setSearchValue}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};

export default TournamentsPage;

type TournamentProps = {
  tournamentData: TournamentData[];
  fetchData: () => void;
  setSearchValue: (searchValue: string) => void;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (currentPage: number) => void;
};
// table component
const TournamentTable: React.FC<TournamentProps> = ({
  tournamentData,
  fetchData,
  setSearchValue,
  isLoading,
  currentPage,
  totalPages,
  setCurrentPage,
}) => {
  const defaultTournament: TournamentData = {
    _id: "",
    tournament_id: 0,
    name: "",
    description: "",
    type: "",
    prizePool: 0,
    buyInFee: 0,
    isActive: false,
    haveWinners: false,
    startTime: null,
    endTime: null,
    auction_ids: [],
    users: [],
    maxUsers: 20,
    createdAt: null,
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showComputeModal, setShowComputeModal] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentData>();
  const [newTournament, setNewTournament] =
    useState<TournamentData>(defaultTournament);
  const [currentTournamentType, setCurrentTournamentType] =
    useState<string>("");
  const [emptyInputError, setEmptyInputError] = useState(false);
  const [tournamentInputError, setTournamentInputError] = useState(false);
  const [tournamentInputErrorMessage, setTournamentInputErrorMessage] =
    useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComputed, setIsComputed] = useState<boolean>(false);

  const [currentStartTime, setCurrentStartTime] = useState<
    Date | string | null
  >(null);
  const [availableAuctionData, setAvailableAuctionData] = useState<
    TournamentAuctionData[]
  >([]);
  const [selectedAuctions, setSelectedAuctions] = useState<
    TournamentAuctionData[]
  >([]);
  const [currentAuctions, setCurrentAuctions] = useState<
    TournamentAuctionData[]
  >([]);
  const [currentAuctionPage, setCurrentAuctionPage] = useState<number>(1);
  const [totalAuctionPages, setTotalAuctionPages] = useState<number>(1);
  const [totalAuctions, setTotalAuctions] = useState(0);
  const [auctionDisplayCount, setAuctionDisplayCount] = useState(4); //TODO: temp value
  const [isAuctionLoading, setIsAuctionLoading] = useState(true);
  const [searchAuctionValue, setSearchAuctionValue] = useState<string>("");
  const [currentModalType, setCurrentModalType] = useState<string>();
  const [currentPredictions, setCurrentPredictions] = useState<Prediction[]>(
    []
  );
  const [filteredPredictions, setFilteredPredictions] = useState<Prediction[]>(
    []
  );

  const [viewAuction, setViewAuction] =
    useState<TournamentAuctionData | null>();

  const { data } = useSession();
  const [role, setRole] = useState("");

  useEffect(() => {
    if (data?.user?.role) {
      setRole(data.user.role);
    }
  }, [data]);

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        setIsAuctionLoading(true);

        //load auction for external tab
        const data = await getTournamentAuctions({
          search: searchAuctionValue,
          offset: (currentAuctionPage - 1) * auctionDisplayCount,
          limit: auctionDisplayCount,
          startTime: currentStartTime,
        });

        if (data && "auctions" in data) {
          setTotalAuctions(data.total);
          setTotalAuctionPages(data.totalPages);
          setAvailableAuctionData(data.auctions as TournamentAuctionData[]);
        } else {
          console.error("Unexpected data structure:", data);
        }
        //}
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsAuctionLoading(false);
      }
    };
    if (currentStartTime != null) fetchAuctionData();
  }, [currentStartTime, currentAuctionPage, searchAuctionValue]);

  useEffect(() => {
    const fetchTournamentPredictions = async (
      auction: TournamentAuctionData
    ) => {
      const data = await getTournamentPredictions(selectedTournament!._id);

      if (data) {
        setCurrentPredictions(data);
        setFilteredPredictions(
          data.filter((p: Prediction) => p.auction_id === auction._id)
        );
      }
    };
    if (currentModalType == "view" && selectedAuctions.length > 0) {
      setViewAuction(selectedAuctions[0]);
      fetchTournamentPredictions(selectedAuctions[0]);
    }
  }, [selectedAuctions]);

  useEffect(() => {
    if (viewAuction != null && currentPredictions.length > 0) {
      console.log(viewAuction);
      console.log(
        currentPredictions.filter(
          (p: Prediction) => p.auction_id === viewAuction._id
        )
      );
      setFilteredPredictions(
        currentPredictions.filter(
          (p: Prediction) => p.auction_id === viewAuction._id
        )
      );
    }
  }, [viewAuction]);

  const handleSelectedAuctionsOnEdit = async (
    auction_ids: string[],
    startTime: Date
  ) => {
    const data = (await getSelectedTournamentAuctions(
      auction_ids
    )) as TournamentAuctionData[];
    if (data) {
      setSelectedAuctions(data);
      // const selectedDate = startTime ? new Date(startTime) : null;

      // const cutoffDate = selectedDate
      //   ? new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
      //   : null;

      //handling if there is auction
      // setIsPastCutoff(
      //   cutoffDate
      //     ? cutoffDate < data[data.length - 1].deadline ||
      //         data[data.length - 1].deadline < new Date()
      //     : false
      // );
    }
  };

  const emptyErrors = () => {
    setEmptyInputError(false);
    setTournamentInputError(false);
  };

  const handleAuctionSelection = (
    auction: TournamentAuctionData,
    setType: string = "current"
  ) => {
    if (setType == "current")
      setCurrentAuctions((prev) => {
        if (prev.some((a) => a.auction_id === auction.auction_id)) {
          return prev.filter((a) => a.auction_id !== auction.auction_id);
        } else {
          return [...prev, auction];
        }
      });
    else
      setSelectedAuctions((prev) => {
        return prev.filter((a) => a.auction_id !== auction.auction_id);
      });
  };

  const handleSelectAuctionSubmit = async (
    e: any,
    actionType: string = "add"
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    const sortedAuctions = [...currentAuctions].sort(
      (a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
    );
    setSelectedAuctions(sortedAuctions);
    if (sortedAuctions.length > 0) {
      const latestDeadline = new Date(sortedAuctions[0].deadline)
        .toISOString()
        .slice(0, 16);
      if (actionType == "add") {
        setNewTournament({ ...newTournament!, endTime: latestDeadline });
      } else
        setSelectedTournament({
          ...selectedTournament!,
          endTime: latestDeadline,
        });
    } else {
      if (actionType == "add")
        setNewTournament({ ...newTournament!, endTime: null });
      else setSelectedTournament({ ...selectedTournament!, endTime: null });
    }
    setCurrentAuctions([]);
    setShowSelectModal(false);
    setIsSubmitting(false);
  };

  const handleNewTournamentChange = (e: any) => {
    emptyErrors();
    const { name, value } = e.target;
    if (name) setNewTournament({ ...newTournament!, [name]: value });
    if (name === "startTime") {
      const selectedDate = new Date(value);
      const cutoffDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);

      setSelectedAuctions((prev) =>
        prev.filter((auction) => {
          const deadline = new Date(auction.deadline);
          return deadline > cutoffDate;
        })
      );
    }
  };

  const handleSelectedTournamentChange = (e: any) => {
    emptyErrors();
    const { name, value } = e.target;
    if (name) setSelectedTournament({ ...selectedTournament!, [name]: value });
    if (name === "startTime") {
      const selectedDate = new Date(value);
      const cutoffDate = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);

      setSelectedAuctions((prev) =>
        prev.filter((auction) => {
          const deadline = new Date(auction.deadline);
          return deadline > cutoffDate;
        })
      );
    }
  };

  const handleNewTournamentSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    emptyErrors();
    if (
      !newTournament.name ||
      !newTournament.description ||
      !newTournament.startTime ||
      (newTournament.buyInFee <= 0 &&
        (currentTournamentType == "standard" ||
          currentTournamentType == "both")) ||
      (newTournament.prizePool <= 0 &&
        (currentTournamentType == "standard" ||
          currentTournamentType == "both")) ||
      !newTournament.maxUsers ||
      // newTournament.maxUsers == 0 ||
      currentTournamentType == ""
    ) {
      setEmptyInputError(true);
    } else if (selectedAuctions.length < 2 || selectedAuctions.length > 10) {
      setTournamentInputError(true);
      setTournamentInputErrorMessage("Please select from 2-10 auctions");
    } else {
      try {
        const response = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            ...newTournament,
            banner: selectedAuctions[0].image,
            auction_ids: selectedAuctions.map((a) => a._id),
            type: currentTournamentType,
          }),
        });

        const data = await response.json();
        if (response.status === 400) {
          setTournamentInputError(true);
          setTournamentInputErrorMessage(data.message);
        } else if (!response.ok) {
          console.error("Error creating tournament");
        } else {
          setShowAlertModal(true);
          setAlertMessage("Tournament created successfully!");
          setShowAddModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleSelectedTournamentSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    emptyErrors();
    if (
      !selectedTournament!.name ||
      !selectedTournament!.description ||
      !selectedTournament!.startTime ||
      (selectedTournament!.buyInFee <= 0 &&
        selectedTournament!.type == "standard") ||
      (selectedTournament!.prizePool <= 0 &&
        selectedTournament!.type == "standard") ||
      !selectedTournament!.maxUsers
    ) {
      setEmptyInputError(true);
    } else if (selectedAuctions.length < 2 || selectedAuctions.length > 10) {
      setTournamentInputError(true);
      setTournamentInputErrorMessage("Please select from 2-10 auctions");
    } else {
      try {
        const response = await fetch(
          `/api/tournaments?tournament_id=${selectedTournament?.tournament_id}`,
          {
            method: "PUT",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({
              ...selectedTournament,
              auction_ids: selectedAuctions.map((a) => a._id),
            }),
          }
        );

        const data = await response.json();
        if (response.status === 400) {
          setTournamentInputError(true);
          setTournamentInputErrorMessage(data.message);
        } else if (!response.ok) {
          console.error("Error editing tournament");
        } else {
          setShowAlertModal(true);
          setAlertMessage("Tournament edited successfully!");
          setShowEditModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleTournamentDelete = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "DELETE",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          tournament_id: selectedTournament!.tournament_id,
        }),
      });

      await response.json();
      if (!response.ok) {
        console.error("Error deleting tournament");
      } else {
        setShowAlertModal(true);
        setAlertMessage("Tournament deleted successfully!");
        setShowDeleteModal(false);
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
  };

  const handleTournamentCompute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await computeTournamentResults(selectedTournament!._id);
      if (response.ok) {
        const newTournament = await response.json();
        setSelectedTournament(newTournament.data);
        setShowAlertModal(true);
        setAlertMessage("Results computed successfully!");
        fetchData();
      } else {
        console.error("Error computing tournament results");
        const res = await response.json();
        setErrorMessage(res.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
    // setIsSubmitting(true);
    // try {
    // }
  };

  const handleActiveStatusForTournament = async (
    tournament: TournamentData
  ) => {
    setIsSubmitting(true);
    setShowLoadingModal(true);
    if (tournament.type === "free_play")
      setLoadingMessage(
        "Activating tournament and generating agent predictions..."
      );
    else setLoadingMessage("Activating tournament...");
    try {
      const response = await changeActiveStatusForTournament(tournament?._id);
      if (!response.isSuccessful) {
        console.error("Error changing active status for tournament");
      } else {
        setShowAlertModal(true);
        setAlertMessage("Changed tournament active status!");
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
    setShowLoadingModal(false);
  };

  useEffect(() => {
    setErrorMessage("");
  }, [showComputeModal]);

  return (
    <div>
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl max-md:text-xl font-bold text-yellow-500">
              Tournament Management
            </CardTitle>
            <CardDescription className="text-md max-md:text-sm">
              Manage tournaments
            </CardDescription>
          </div>
          {role == "owner" && (
            <Button
              className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
              onClick={() => {
                setShowAddModal(true);
                setCurrentModalType("add");
                setNewTournament(defaultTournament);
                setSelectedAuctions([]);
                setCurrentTournamentType("");
                setEmptyInputError(false);
              }}
            >
              <CalendarPlus className="md:mr-2 h-4 w-4" />
              <span className="max-md:hidden">Add Tournament</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full block md:table">
            <div className="bg-[#1E2A36] relative h-auto flex px-2 py-1.5 rounded gap-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                placeholder="Search by name or description"
                className="pl-10 text-white bg-transparent focus:outline-none placeholder:text-white border-none max-md:text-sm"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchValue(e.target.value)
                }
              />
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-[436px]">
                <BeatLoader color="#F2CA16" />
              </div>
            ) : (
              <div>
                <div className="block md:hidden space-y-4">
                  {tournamentData &&
                    tournamentData.map(
                      (tournament: TournamentData, index: number) => (
                        <div
                          key={index}
                          className="bg-[#13202D] border-2 border-[#1E2A36] rounded-xl p-4 space-y-2"
                        >
                          <div>
                            <p className="text-xs text-gray-400">Name</p>
                            <p className="text-white text-sm">
                              {tournament.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Description</p>
                            <p className="text-white text-sm">
                              {tournament.description}
                            </p>
                          </div>
                          <div className="flex w-full gap-2">
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">
                                Buy-in Fee
                              </p>
                              <p className="text-white text-sm">
                                {tournament.buyInFee}
                              </p>
                            </div>
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">
                                Prize Pool
                              </p>
                              <p className="text-white text-sm">
                                {tournament.prizePool}
                              </p>
                            </div>
                          </div>
                          <div className="flex w-full gap-2">
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">
                                Start Time
                              </p>
                              <p className="text-white text-sm">
                                {formatDate(tournament.startTime! as Date)}
                              </p>
                            </div>
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">End Time</p>
                              <p className="text-white text-sm">
                                {formatDate(tournament.endTime! as Date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex w-full gap-2">
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">Users</p>
                              <p className="text-white text-sm">
                                {tournament.users.length}
                              </p>
                            </div>
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">Auctions</p>
                              <p className="text-white text-sm">
                                {tournament.auction_ids.length}
                              </p>
                            </div>
                          </div>
                          <div className="flex w-full gap-2">
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">Status</p>
                              <div className="items-center justify-center">
                                {tournament.type === "free_play" ? (
                                  <Badge className="bg-purple-500/20 border-purple-400 text-purple-400 mr-2 text-xs mt-2">
                                    Free Play
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-500/20 border-yellow-400 text-yellow-400 mr-2 text-xs mt-2"
                                  >
                                    Standard
                                  </Badge>
                                )}
                                {new Date(tournament.startTime!) >
                                  new Date() && (
                                  <Badge className="bg-blue-100 border-blue-800 text-blue-800 mr-2 text-xs mt-2">
                                    Upcoming
                                  </Badge>
                                )}
                                {tournament.haveWinners && (
                                  <Badge className="bg-green-100 border-green-800 text-green-800 mr-2 text-xs mt-2">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="w-[50%]">
                              <p className="text-xs text-gray-400">Active</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={
                                  tournament.isActive
                                    ? "Deactivate Tournament"
                                    : "Activate Tournament"
                                }
                                className={""}
                                onClick={(e: any) => {
                                  e.preventDefault();
                                  handleActiveStatusForTournament(tournament);
                                }}
                                disabled={
                                  new Date(tournament.endTime!) < new Date()
                                }
                              >
                                {tournament.isActive ? (
                                  <ToggleRight className="text-green-500 h-4 w-4" />
                                ) : (
                                  <ToggleLeft className="text-red-500 h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {role != "guest" && (
                            <div className="flex justify-end space-x-2 pt-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={""}
                                onClick={() => {
                                  setShowEditModal(true);
                                  setCurrentModalType("edit");
                                  setEmptyInputError(false);
                                  setTournamentInputError(false);
                                  setSelectedTournament(tournament);
                                  handleSelectedAuctionsOnEdit(
                                    tournament.auction_ids,
                                    tournament.startTime as Date
                                  );
                                  setCurrentStartTime(tournament.startTime);
                                }}
                                title={"Edit Tournament"}
                                disabled={tournament.haveWinners}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className={"text-yellow-500"}
                                title={"View Tournament"}
                                onClick={() => {
                                  setShowViewModal(true);
                                  setCurrentModalType("view");
                                  setEmptyInputError(false);
                                  setTournamentInputError(false);
                                  setSelectedTournament(tournament);
                                  handleSelectedAuctionsOnEdit(
                                    tournament.auction_ids,
                                    tournament.startTime as Date
                                  );
                                  setCurrentStartTime(tournament.startTime);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={"text-red-700"}
                                onClick={() => {
                                  setShowDeleteModal(true);
                                  setSelectedTournament(tournament);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    )}
                </div>
                <div className="hidden md:block overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-yellow-500/90">
                          Name
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Description
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Buy-in Fee
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Prize Pool
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Start Time
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          End Time
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Users
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Auctions
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Active
                        </TableHead>
                        {role != "guest" && (
                          <TableHead className="font-bold text-yellow-500/90">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tournamentData &&
                        tournamentData.map(
                          (tournament: TournamentData, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {tournament.name}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.description}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.buyInFee}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.prizePool}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatDate(tournament.startTime! as Date)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatDate(tournament.endTime! as Date)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.users.length +
                                  " / " +
                                  tournament.maxUsers}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.auction_ids.length}
                              </TableCell>
                              <TableCell className="font-medium">
                                {tournament.type === "free_play" ? (
                                  <Badge className="bg-purple-500/20 border-purple-400 text-purple-400 mr-2">
                                    Free Play
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-yellow-500/20 border-yellow-400 text-yellow-400 mr-2"
                                  >
                                    Standard
                                  </Badge>
                                )}
                                {/* {tournament.isActive ? (
                                  <Badge className="bg-green-100 border-green-800 text-green-800 mr-2">
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 border-red-800 text-red-800 mr-2">
                                    Inactive
                                  </Badge>
                                )} */}
                                {new Date(tournament.startTime!) >
                                  new Date() && (
                                  <Badge className="bg-blue-100 border-blue-800 text-blue-800 mr-2">
                                    Upcoming
                                  </Badge>
                                )}
                                {tournament.haveWinners && (
                                  <Badge className="bg-green-100 border-green-800 text-green-800 mr-2 text-xs mt-2">
                                    Completed
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={
                                    tournament.isActive
                                      ? "Deactivate Tournament"
                                      : "Activate Tournament"
                                  }
                                  className={""}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    handleActiveStatusForTournament(tournament);
                                  }}
                                  disabled={
                                    new Date(tournament.endTime!) < new Date()
                                  }
                                >
                                  {tournament.isActive ? (
                                    <ToggleRight className="text-green-500 h-4 w-4" />
                                  ) : (
                                    <ToggleLeft className="text-red-500 h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              {role != "guest" && (
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title={`${
                                        tournament.haveWinners
                                          ? "View Tournament Results"
                                          : "Compute Tournament Results"
                                      }`}
                                      className={""}
                                      onClick={() => {
                                        setSelectedTournament(tournament);
                                        if (tournament.haveWinners) {
                                          setShowWinnersModal(true);
                                        } else {
                                          setShowComputeModal(true);
                                        }
                                      }}
                                    >
                                      <Trophy
                                        className="h-4 w-4"
                                        color="#F2CA16"
                                      />
                                    </Button>

                                    <span
                                      className="inline-block relative"
                                      title="Tournament has ended"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title={`${
                                          tournament.haveWinners
                                            ? "Tournament has ended"
                                            : "Edit Tournament"
                                        }`}
                                        className={`${
                                          tournament.haveWinners
                                            ? "text-gray-400 pointer-events-none"
                                            : "text-yellow-500"
                                        }`}
                                        onClick={() => {
                                          setShowEditModal(true);
                                          setCurrentModalType("edit");
                                          setEmptyInputError(false);
                                          setTournamentInputError(false);
                                          setSelectedTournament(tournament);
                                          handleSelectedAuctionsOnEdit(
                                            tournament.auction_ids,
                                            tournament.startTime as Date
                                          );
                                          setCurrentStartTime(
                                            tournament.startTime
                                          );
                                        }}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </span>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={"text-yellow-500"}
                                      title={"View Tournament"}
                                      onClick={() => {
                                        setShowViewModal(true);
                                        setCurrentModalType("view");
                                        setEmptyInputError(false);
                                        setTournamentInputError(false);
                                        setSelectedTournament(tournament);
                                        handleSelectedAuctionsOnEdit(
                                          tournament.auction_ids,
                                          tournament.startTime as Date
                                        );
                                        setCurrentStartTime(
                                          tournament.startTime
                                        );
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={"text-red-700"}
                                      title={"Delete Tournament"}
                                      onClick={() => {
                                        setShowDeleteModal(true);
                                        setSelectedTournament(tournament);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <AlertModal
              open={showAlertModal}
              setOpen={setShowAlertModal}
              message={alertMessage}
            />

            <LoadingModal show={showLoadingModal} message={loadingMessage} />
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-6xl w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="max-md:text-md">
                    Add Tournament
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    Provide information for new tournament
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      Tournament Name
                    </Label>
                    <Input
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError && newTournament?.name == ""
                          ? "border-red-500"
                          : ""
                      }`}
                      name="name"
                      type="text"
                      value={newTournament?.name || ""}
                      onChange={handleNewTournamentChange}
                    />
                  </div>
                  <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      Description
                    </Label>
                    <Textarea
                      className={`max-md:col-span-3 col-span-7 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError && newTournament?.description == ""
                          ? "border-red-500"
                          : ""
                      }`}
                      name="description"
                      type="text"
                      row={10}
                      value={newTournament?.description || ""}
                      onChange={handleNewTournamentChange}
                    />
                  </div>
                  <div className="md:grid md:grid-cols-2 md:gap-4">
                    <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                      <Label className="text-right max-md:text-xs">
                        {"Start Time"}
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError &&
                          (newTournament?.startTime == null ||
                            newTournament?.startTime.toString().trim() === "")
                            ? "border-red-500"
                            : ""
                        }`}
                        name="startTime"
                        type="datetime-local"
                        value={newTournament?.startTime || null}
                        onChange={handleNewTournamentChange}
                        // min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        End Time
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && newTournament?.endTime == null
                            ? "border-red-500"
                            : ""
                        }`}
                        name="endTime"
                        type="datetime-local"
                        value={newTournament?.endTime || null}
                        disabled
                        onChange={handleNewTournamentChange}
                      />
                    </div>
                  </div>
                  <div className="md:grid md:grid-cols-2 md:gap-4">
                    <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                      <Label className="text-right max-md:text-xs">
                        {"Buy-in Fee"}
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError &&
                          newTournament?.buyInFee == 0 &&
                          currentTournamentType != "free_play" &&
                          currentTournamentType != ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="buyInFee"
                        type="number"
                        value={newTournament?.buyInFee || 0}
                        disabled={
                          currentTournamentType == "" ||
                          currentTournamentType == "free_play"
                        }
                        onChange={handleNewTournamentChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Prize Pool
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError &&
                          newTournament?.prizePool == 0 &&
                          currentTournamentType != "free_play" &&
                          currentTournamentType != ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="prizePool"
                        type="text"
                        value={newTournament?.prizePool || 0}
                        disabled={
                          currentTournamentType == "" ||
                          currentTournamentType == "free_play"
                        }
                        onChange={handleNewTournamentChange}
                      />
                    </div>
                  </div>
                  <div className="md:grid md:grid-cols-2 md:gap-4">
                    <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                      <Label className="text-right max-md:text-xs">
                        Max Users
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && newTournament?.maxUsers < 20
                            ? "border-red-500"
                            : ""
                        }`}
                        name="maxUsers"
                        type="number"
                        value={newTournament?.maxUsers || 20}
                        onChange={handleNewTournamentChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Tournament Type
                      </Label>
                      <div className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm">
                        <Select
                          value={currentTournamentType || ""}
                          onValueChange={(value: string) => {
                            setEmptyInputError(false);
                            setTournamentInputError(false);
                            setCurrentTournamentType(value);
                          }}
                          name="role"
                        >
                          <SelectTrigger
                            className={`bg-[#1E2A36] border-[#1E2A36] max-md:text-xs ${
                              emptyInputError && currentTournamentType == ""
                                ? "border-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue
                              className="max-md:text-xs"
                              placeholder="Select tournament type"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                            <SelectItem value="free_play">Free Play</SelectItem>
                            {/* <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="both">Both</SelectItem> */}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* <div className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm">
                        <Select
                          value={currentTournamentType || ""}
                          onValueChange={(value: string) => {
                            setEmptyInputError(false);
                            setTournamentInputError(false);
                            setCurrentTournamentType(value);
                          }}
                          name="role"
                        >
                          <SelectTrigger
                            className={`bg-[#1E2A36] border-[#1E2A36] max-md:text-xs ${
                              emptyInputError && currentTournamentType == ""
                                ? "border-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue
                              className="max-md:text-xs"
                              placeholder="Select tournament type"
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                            <SelectItem value="free_play">Free Play</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}
                    </div>
                  </div>
                  <div className="grid max-md:grid-cols-8 grid-cols-6 items-center gap-4">
                    <Label className="max-md:col-span-3 max-md:text-xs">
                      Auctions ({selectedAuctions.length})
                    </Label>
                    <div className="max-md:col-span-1 col-span-4"></div>

                    <div className="relative max-md:col-span-4 group">
                      <Button
                        className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 disabled:cursor-not-allowed"
                        onClick={() => {
                          setShowSelectModal(true);
                          setCurrentAuctions([...selectedAuctions]);
                          setCurrentStartTime(newTournament.startTime!);
                          setCurrentAuctionPage(1);
                          setEmptyInputError(false);
                          setTournamentInputError(false);
                        }}
                        disabled={
                          newTournament.startTime == null ||
                          newTournament?.startTime.toString().trim() === ""
                        }
                      >
                        <Car className="h-4 w-4" />
                        <span className="max-md:text-xs">Select Auctions</span>
                      </Button>

                      {(newTournament.startTime == null ||
                        newTournament?.startTime.toString().trim() === "") && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          Set a start time first
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-2 min-h-[60px] ${
                      selectedAuctions.length === 0 &&
                      "bg-[#1E2A36] border border-[#1E2A36]"
                    }`}
                  >
                    {selectedAuctions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedAuctions.map((auction) => {
                          // const currentAuctionId = selectedAuction.auction_id;
                          // console.log(availableAuctionData);
                          // const auction = availableAuctionData.find(
                          //   (auction) => auction.auction_id === currentAuctionId
                          // );
                          if (auction)
                            return (
                              <div
                                key={auction.auction_id}
                                className="flex items-center p-3 rounded-md border cursor-pointer transition-colors bg-[#1E2A36] border-[#FFFFFF] hover:bg-[#1E2A36]/80"
                              >
                                <button
                                  onClick={() =>
                                    handleAuctionSelection(auction, "selected")
                                  }
                                  className="ml-1 hover:text-red-400"
                                >
                                  <X className="h-5 w-5 text-white-500 mr-3 flex-shrink-0" />
                                </button>

                                <div className="grid grid-cols-4">
                                  <div className="col-span-3 flex-1 min-w-0">
                                    <div className="max-md:text-xs text-sm truncate">
                                      {`${auction.year} ${auction.make} ${auction.model}`}
                                    </div>
                                    <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                      Current Bid: $
                                      {(auction.price || 0).toLocaleString()}
                                    </div>
                                    <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                      Ends In: {formatDate(auction.deadline)}
                                    </div>
                                  </div>
                                  {auction.image ? (
                                    <Image
                                      src={auction.image}
                                      alt={`${auction.year} ${auction.make} ${auction.model}`}
                                      title={`${auction.year} ${auction.make} ${auction.model}`}
                                      className="w-full h-full object-cover"
                                      objectFit="cover"
                                      width={100}
                                      height={100}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-6 h-6 text-gray-500" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          else return "";
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        No auctions selected
                      </p>
                    )}
                  </div>
                  {emptyInputError ? (
                    <p className="mt-4 text-red-500 text-center max-md:text-sm">
                      Please fill-out required fields
                    </p>
                  ) : tournamentInputError ? (
                    <p className="mt-4 text-red-500 text-center max-md:text-sm">
                      {tournamentInputErrorMessage}
                    </p>
                  ) : null}
                </div>
                <DialogFooter className="flex-row justify-end space-x-2">
                  <form onSubmit={handleNewTournamentSubmit}>
                    <Button
                      type="submit"
                      className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {selectedTournament && (
              <div className="flex items-center gap-1">
                <Dialog
                  open={showEditModal}
                  onOpenChange={(isOpen) => {
                    setShowEditModal(isOpen);
                    setCurrentStartTime(null);
                  }}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-6xl w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="max-md:text-md">
                        Edit Tournament
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Update information for tournament:{" "}
                        <span className="font-semibold text-yellow-400">
                          {selectedTournament!.name}
                        </span>
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Tournament Name
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedTournament?.name == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="name"
                          type="text"
                          value={selectedTournament?.name || ""}
                          onChange={handleSelectedTournamentChange}
                        />
                      </div>
                      <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Description
                        </Label>
                        <Textarea
                          className={`max-md:col-span-3 col-span-7 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError &&
                            selectedTournament?.description == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="description"
                          type="text"
                          row={10}
                          value={selectedTournament?.description || ""}
                          onChange={handleSelectedTournamentChange}
                        />
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            {"Start Time"}
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              (selectedTournament?.startTime == null ||
                                selectedTournament?.startTime
                                  .toString()
                                  .trim() === "")
                                ? "border-red-500"
                                : ""
                            }`}
                            name="startTime"
                            type="datetime-local"
                            value={
                              new Date(selectedTournament?.startTime!)
                                .toISOString()
                                .slice(0, 16) || null
                            }
                            // disabled={isPastCutoff}
                            onChange={handleSelectedTournamentChange}
                            // min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            End Time
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.endTime == null
                                ? "border-red-500"
                                : ""
                            }`}
                            name="endTime"
                            type="datetime-local"
                            value={
                              new Date(selectedTournament?.endTime!)
                                .toISOString()
                                .slice(0, 16) || null
                            }
                            disabled
                            onChange={handleSelectedTournamentChange}
                          />
                        </div>
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            {"Buy-in Fee"}
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.buyInFee == 0 &&
                              selectedTournament?.type == "standard"
                                ? "border-red-500"
                                : ""
                            }`}
                            name="buyInFee"
                            type="number"
                            value={selectedTournament?.buyInFee || 0}
                            disabled={selectedTournament?.type == "free_play"}
                            onChange={handleSelectedTournamentChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            Prize Pool
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.prizePool == 0 &&
                              selectedTournament?.type == "standard"
                                ? "border-red-500"
                                : ""
                            }`}
                            name="prizePool"
                            type="text"
                            value={selectedTournament?.prizePool || 0}
                            disabled={selectedTournament?.type == "free_play"}
                            onChange={handleSelectedTournamentChange}
                          />
                        </div>
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            Max Users
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.maxUsers < 20
                                ? "border-red-500"
                                : ""
                            }`}
                            name="maxUsers"
                            type="number"
                            value={selectedTournament?.maxUsers || 20}
                            onChange={handleSelectedTournamentChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            Tournament Type
                          </Label>
                          <div className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm">
                            <Select
                              value={selectedTournament?.type || ""}
                              onValueChange={(value: string) => {
                                //can't edit this
                              }}
                              disabled
                              name="role"
                            >
                              <SelectTrigger
                                className={`bg-[#1E2A36] border-[#1E2A36] max-md:text-xs ${
                                  emptyInputError &&
                                  selectedTournament?.type == ""
                                    ? "border-red-500"
                                    : ""
                                }`}
                              >
                                <SelectValue
                                  className="max-md:text-xs"
                                  placeholder="Select tournament type"
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                                <SelectItem value="free_play">
                                  Free Play
                                </SelectItem>
                                {/* <SelectItem value="standard">
                                  Standard
                                </SelectItem>
                                <SelectItem value="both">Both</SelectItem> */}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="grid max-md:grid-cols-8 grid-cols-6 items-center gap-4">
                        <Label className="max-md:col-span-3 max-md:text-xs">
                          Auctions ({selectedAuctions.length})
                        </Label>
                        <div className="max-md:col-span-1 col-span-4"></div>

                        <div className="relative max-md:col-span-4 group">
                          <Button
                            className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 disabled:cursor-not-allowed"
                            onClick={() => {
                              setShowSelectModal(true);
                              setCurrentAuctions([...selectedAuctions]);
                              setCurrentStartTime(
                                selectedTournament.startTime!
                              );
                              setCurrentAuctionPage(1);
                              setEmptyInputError(false);
                              setTournamentInputError(false);
                            }}
                            disabled={
                              selectedTournament.startTime == null ||
                              selectedTournament?.startTime
                                .toString()
                                .trim() === ""
                            }
                          >
                            <Car className="h-4 w-4" />
                            <span className="max-md:text-xs">
                              Select Auctions
                            </span>
                          </Button>

                          {(selectedTournament.startTime == null ||
                            selectedTournament?.startTime.toString().trim() ===
                              "") && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              Set a start time first
                            </div>
                          )}
                        </div>
                      </div>
                      {isAuctionLoading ? (
                        <div className="flex justify-center items-center w-full my-4">
                          <BeatLoader color="#F2CA16" />
                        </div>
                      ) : (
                        <div
                          className={`p-2 min-h-[60px] ${
                            selectedAuctions.length === 0 &&
                            "bg-[#1E2A36] border border-[#1E2A36]"
                          }`}
                        >
                          {selectedAuctions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedAuctions.map((selectedAuction) => {
                                const currentAuctionId =
                                  selectedAuction.auction_id;
                                const auction = availableAuctionData.find(
                                  (auction) =>
                                    auction.auction_id === currentAuctionId
                                );

                                if (auction)
                                  return (
                                    <div
                                      key={currentAuctionId}
                                      className="flex items-center p-3 rounded-md border cursor-pointer transition-colors bg-[#1E2A36] border-[#FFFFFF] hover:bg-[#1E2A36]/80"
                                    >
                                      <button
                                        onClick={() =>
                                          handleAuctionSelection(
                                            auction,
                                            "selected"
                                          )
                                        }
                                        className="ml-1 hover:text-red-400"
                                      >
                                        <X className="h-5 w-5 text-white-500 mr-3 flex-shrink-0" />
                                      </button>

                                      <div className="grid grid-cols-4">
                                        <div className="col-span-3 flex-1 min-w-0">
                                          <div className="max-md:text-xs text-sm truncate">
                                            {`${auction.year} ${auction.make} ${auction.model}`}
                                          </div>
                                          <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                            Current Bid: $
                                            {(
                                              auction.price || 0
                                            ).toLocaleString()}
                                          </div>
                                          <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                            Ends In:{" "}
                                            {formatDate(auction.deadline)}
                                          </div>
                                        </div>
                                        {auction.image ? (
                                          <Image
                                            src={auction.image}
                                            alt={`${auction.year} ${auction.make} ${auction.model}`}
                                            title={`${auction.year} ${auction.make} ${auction.model}`}
                                            className="w-full h-full object-cover"
                                            objectFit="cover"
                                            width={100}
                                            height={100}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <ImageOff className="w-6 h-6 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                else return "";
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">
                              No auctions selected
                            </p>
                          )}
                        </div>
                      )}
                      {emptyInputError ? (
                        <p className="mt-4 text-red-500 text-center max-md:text-sm">
                          Please fill-out required fields
                        </p>
                      ) : tournamentInputError ? (
                        <p className="mt-4 text-red-500 text-center max-md:text-sm">
                          {tournamentInputErrorMessage}
                        </p>
                      ) : null}
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      <form onSubmit={handleSelectedTournamentSubmit}>
                        <Button
                          type="submit"
                          className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showViewModal}
                  onOpenChange={(isOpen) => {
                    setShowViewModal(isOpen);
                    setViewAuction(null);
                    setCurrentPredictions([]);
                    setFilteredPredictions([]);
                    setCurrentStartTime(null);
                  }}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-6xl w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="max-md:text-md">
                        View Tournament
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        View information for tournament:{" "}
                        <span className="font-semibold text-yellow-400">
                          {selectedTournament!.name}
                        </span>
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Tournament Name
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedTournament?.name == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="name"
                          type="text"
                          value={selectedTournament?.name || ""}
                          onChange={handleSelectedTournamentChange}
                          disabled
                        />
                      </div>
                      <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Description
                        </Label>
                        <Textarea
                          className={`max-md:col-span-3 col-span-7 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError &&
                            selectedTournament?.description == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="description"
                          type="text"
                          row={10}
                          value={selectedTournament?.description || ""}
                          onChange={handleSelectedTournamentChange}
                          disabled
                        />
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            {"Start Time"}
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              (selectedTournament?.startTime == null ||
                                selectedTournament?.startTime
                                  .toString()
                                  .trim() === "")
                                ? "border-red-500"
                                : ""
                            }`}
                            name="startTime"
                            type="datetime-local"
                            value={
                              new Date(selectedTournament?.startTime!)
                                .toISOString()
                                .slice(0, 16) || null
                            }
                            onChange={handleSelectedTournamentChange}
                            disabled
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            End Time
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.endTime == null
                                ? "border-red-500"
                                : ""
                            }`}
                            name="endTime"
                            type="datetime-local"
                            value={
                              new Date(selectedTournament?.endTime!)
                                .toISOString()
                                .slice(0, 16) || null
                            }
                            onChange={handleSelectedTournamentChange}
                            disabled
                          />
                        </div>
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            {"Buy-in Fee"}
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.buyInFee == 0 &&
                              selectedTournament?.type == "standard"
                                ? "border-red-500"
                                : ""
                            }`}
                            name="buyInFee"
                            type="number"
                            value={selectedTournament?.buyInFee || 0}
                            onChange={handleSelectedTournamentChange}
                            disabled
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            Prize Pool
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.prizePool == 0 &&
                              selectedTournament?.type == "standard"
                                ? "border-red-500"
                                : ""
                            }`}
                            name="prizePool"
                            type="text"
                            value={selectedTournament?.prizePool || 0}
                            onChange={handleSelectedTournamentChange}
                            disabled
                          />
                        </div>
                      </div>
                      <div className="md:grid md:grid-cols-2 md:gap-4">
                        <div className="grid grid-cols-4 items-center gap-4 max-md:pb-4">
                          <Label className="text-right max-md:text-xs">
                            Max Users
                          </Label>
                          <Input
                            className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                              emptyInputError &&
                              selectedTournament?.maxUsers < 20
                                ? "border-red-500"
                                : ""
                            }`}
                            name="maxUsers"
                            type="number"
                            value={selectedTournament?.maxUsers || 20}
                            onChange={handleSelectedTournamentChange}
                            disabled
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right max-md:text-xs">
                            Tournament Type
                          </Label>
                          <div className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm">
                            <Select
                              value={selectedTournament?.type || ""}
                              onValueChange={(value: string) => {
                                //can't edit this
                              }}
                              disabled
                              name="role"
                            >
                              <SelectTrigger
                                className={`bg-[#1E2A36] border-[#1E2A36] max-md:text-xs ${
                                  emptyInputError &&
                                  selectedTournament?.type == ""
                                    ? "border-red-500"
                                    : ""
                                }`}
                              >
                                <SelectValue
                                  className="max-md:text-xs"
                                  placeholder="Select tournament type"
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                                <SelectItem value="free_play">
                                  Free Play
                                </SelectItem>
                                {/* <SelectItem value="standard">
                                  Standard
                                </SelectItem>
                                <SelectItem value="both">Both</SelectItem> */}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="grid max-md:grid-cols-4 grid-cols-8 items-center gap-4">
                        <Label className="max-md:text-xs">
                          Auctions ({selectedAuctions.length})
                        </Label>
                        <div className="max-md:hidden col-span-3"></div>

                        <div className="relative max-md:col-span-3 col-span-4 max-md:text-sm group">
                          {/* <div className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"> */}
                          {selectedAuctions.length > 0 &&
                            viewAuction != null && (
                              <Select
                                value={viewAuction.auction_id || ""}
                                onValueChange={(value: string) => {
                                  setEmptyInputError(false);
                                  setTournamentInputError(false);
                                  setViewAuction(
                                    selectedAuctions.find(
                                      (auction) => auction.auction_id == value
                                    )
                                  );
                                }}
                                name="role"
                              >
                                <SelectTrigger
                                  className={`bg-[#1E2A36] border-[#1E2A36] max-md:text-xs ${
                                    emptyInputError &&
                                    currentTournamentType == ""
                                      ? "border-red-500"
                                      : ""
                                  }`}
                                >
                                  <SelectValue
                                    className="max-md:text-xs"
                                    placeholder="Select auction"
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                                  {selectedAuctions.map((selectedAuction) => {
                                    // const currentAuctionId =
                                    //   selectedAuction.auction_id;
                                    // console.log(
                                    //   `Auction id here: ${currentAuctionId}`
                                    // );

                                    // console.log({ availableAuctionData });
                                    // const auction = availableAuctionData.find(
                                    //   (auction) =>
                                    //     auction.auction_id === currentAuctionId
                                    // );
                                    // console.log({ auction });
                                    return (
                                      <SelectItem
                                        key={selectedAuction.auction_id}
                                        value={selectedAuction.auction_id}
                                        className="truncate max-md:max-w-[250px] text-ellipsis overflow-hidden"
                                      >
                                        {`${selectedAuction.year} ${selectedAuction.make} ${selectedAuction.model}`}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            )}
                        </div>
                      </div>
                      {isAuctionLoading ? (
                        <div className="flex justify-center items-center w-full my-4">
                          <BeatLoader color="#F2CA16" />
                        </div>
                      ) : (
                        <div className="p-2 min-h-[60px]">
                          {/* {selectedAuctions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectedAuctions.map((selectedAuction) => {
                                const currentAuctionId =
                                  selectedAuction.auction_id;
                                const auction = availableAuctionData.find(
                                  (auction) =>
                                    auction.auction_id === currentAuctionId
                                );
                                if (auction)
                                  return (
                                    <div
                                      key={currentAuctionId}
                                      className="flex items-center p-3 rounded-md border cursor-pointer transition-colors bg-[#1E2A36] border-[#FFFFFF] hover:bg-[#1E2A36]/80"
                                    >
                                      <div className="grid grid-cols-4">
                                        <div className="col-span-3 flex-1 min-w-0">
                                          <div className="max-md:text-xs text-sm truncate">
                                            {`${auction.year} ${auction.make} ${auction.model}`}
                                          </div>
                                          <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                            Current Bid: $
                                            {(
                                              auction.price || 0
                                            ).toLocaleString()}
                                          </div>
                                          <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                            Ends In:{" "}
                                            {formatDate(auction.deadline)}
                                          </div>
                                        </div>
                                        {auction.image ? (
                                          <Image
                                            src={auction.image}
                                            alt={`${auction.year} ${auction.make} ${auction.model}`}
                                            title={`${auction.year} ${auction.make} ${auction.model}`}
                                            className="w-full h-full object-cover"
                                            objectFit="cover"
                                            width={100}
                                            height={100}
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <ImageOff className="w-6 h-6 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                else return "";
                              })}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm">
                              No auctions selected
                            </p>
                          )} */}
                          {(() => {
                            const auction = selectedAuctions.find(
                              (a) => a.auction_id === viewAuction?.auction_id
                            );
                            if (auction)
                              return (
                                <div
                                  key={auction.auction_id}
                                  className="flex items-center p-3 rounded-md border cursor-pointer transition-colors bg-[#1E2A36] border-[#FFFFFF] hover:bg-[#1E2A36]/80"
                                >
                                  <div className="grid grid-cols-4 gap-2 w-full">
                                    <div className="col-span-3 flex flex-col justify-center min-w-0 overflow-hidden">
                                      <div
                                        className="max-md:text-xs text-sm truncate text-white"
                                        title={`${auction.year} ${auction.make} ${auction.model}`}
                                      >
                                        {`${auction.year} ${auction.make} ${auction.model}`}
                                      </div>
                                      <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                        Current Bid: $
                                        {auction.price?.toLocaleString() ?? "0"}
                                      </div>
                                      <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                        Ends In: {formatDate(auction.deadline)}
                                      </div>
                                    </div>

                                    <div className="w-full h-full  flex justify-end items-center">
                                      {auction.image ? (
                                        <Image
                                          src={auction.image}
                                          alt={`${auction.year} ${auction.make} ${auction.model}`}
                                          title={`${auction.year} ${auction.make} ${auction.model}`}
                                          className="object-cover rounded-md"
                                          width={100}
                                          height={100}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageOff className="w-6 h-6 text-gray-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                          })()}
                        </div>
                      )}
                      {!isAuctionLoading && (
                        <div>
                          <Label className="max-md:col-span-4 max-md:text-xs">
                            Predictions
                          </Label>
                          <div className="grid max-md:grid-cols-1 grid-cols-3 gap-2 w-full pt-4">
                            {filteredPredictions &&
                            filteredPredictions.length > 0 ? (
                              filteredPredictions.map((prediction, index) => {
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg bg-[#1E2A36] p-4"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div
                                        className={`max-md:h-7 max-md:w-7 h-10 w-10 rounded-full ${
                                          prediction.user.role === "AGENT"
                                            ? "bg-purple-600"
                                            : "bg-[#F2CA16]"
                                        } flex items-center justify-center text-white  max-md:text-xs text-sm`}
                                      >
                                        {prediction.user.role === "AGENT"
                                          ? "AI"
                                          : getInitials(
                                              getDisplayName(prediction)
                                            )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 max-md:text-xs text-sm">
                                          {getDisplayName(prediction)}
                                          {/* {prediction.user.role === "AGENT" && (
                                            <Badge
                                              variant="outline"
                                              className="bg-purple-500/20 text-xs text-purple-500"
                                            >
                                              AGENT
                                            </Badge>
                                          )} */}
                                        </div>
                                        <div className="max-md:text-xs text-sm text-gray-400">
                                          {prediction.createdAt
                                            ? formatTimeDistance(
                                                prediction.createdAt.toString()
                                              )
                                            : "recently"}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="max-md:text-xs text-md font-bold text-[#F2CA16]">
                                      {"$" +
                                        prediction.predictedPrice.toLocaleString()}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="max-md:col-span-1 col-span-2 py-4 max-md:text-xs text-md text-center text-gray-400 bg-[#1E2A36]">
                                No predictions yet
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2"></DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showDeleteModal}
                  onOpenChange={setShowDeleteModal}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-red-700 text-lg max-md:text-md">
                        Delete Tournament
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-red-700">
                          {selectedTournament!.name}
                        </span>
                        ?
                      </DialogDescription>
                    </DialogHeader>

                    <div className="p-2 m-2 text-sm">
                      <p className="text-lg max-md:text-md font-bold text-red-700 text-center">
                        Warning
                      </p>
                      <p className={"text-justify max-md:text-sm"}>
                        {
                          "By deleting this tournament, they will no longer be accessible in the Velocity Market App's Tournament Dashboard"
                        }
                      </p>
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      <form onSubmit={handleTournamentDelete}>
                        <Button
                          type="submit"
                          className="bg-red-700 text-[#0C1924] hover:bg-red-700/90"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Deleting..." : "Delete"}
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={showComputeModal}
                  onOpenChange={setShowComputeModal}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl ">
                    <DialogHeader>
                      <DialogTitle className="text-[#F2CA16] text-lg max-wd:text-md">
                        Compute User Scores for {selectedTournament.name}
                      </DialogTitle>
                    </DialogHeader>
                    {selectedTournament.endTime !== null &&
                    selectedTournament.endTime > new Date() ? (
                      <div className="p-2 m-2 text-sm">
                        <p className="text-justify max-md:text-sm">
                          {
                            "This tournament is currently active. Please wait for the tournament to end before computing user scores."
                          }
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="p-2 m-2 text-sm">
                          <p className="text-justify max-md:text-sm">
                            {errorMessage && (
                              <div className="mb-4 rounded-md border border-red-900/50 bg-red-900/20 p-3 text-red-500">
                                {errorMessage}
                              </div>
                            )}
                          </p>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-bold text-yellow-500/90">
                                Rank
                              </TableHead>
                              <TableHead className="font-bold text-yellow-500/90">
                                Name
                              </TableHead>
                              <TableHead className="font-bold text-yellow-500/90">
                                Score
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTournament &&
                              selectedTournament.users
                                .sort((a, b) => {
                                  return b.points! - a.points!;
                                })
                                .map((user, index) => (
                                  <TableRow key={user.userId}>
                                    <TableCell className="font-medium flex">
                                      {selectedTournament.haveWinners && (
                                        <Trophy
                                          className={`h-6 w-6 ${
                                            user.rank! > 3 || user.rank === 0
                                              ? "hidden"
                                              : ""
                                          }`}
                                          color={`${
                                            user.rank === 1
                                              ? "#F2CA16"
                                              : user.rank === 2
                                              ? "#C0C0C0"
                                              : "#CD7F32"
                                          } `}
                                        />
                                      )}

                                      {user.rank !== 0 ? user.rank : ""}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {user.username}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {user.points}
                                    </TableCell>
                                  </TableRow>
                                ))}
                          </TableBody>
                        </Table>

                        <DialogFooter className="flex-row justify-end space-x-2">
                          <Button
                            type="submit"
                            className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                            disabled={
                              isSubmitting || selectedTournament.haveWinners
                            }
                            onClick={handleTournamentCompute}
                          >
                            {isSubmitting ? "Computing..." : "Compute"}
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={showWinnersModal}
                  onOpenChange={setShowWinnersModal}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-2xl w-[95%] max-h[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-[#F2CA16] text-lg max-wd:text-md">
                        Tournament Results
                      </DialogTitle>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold text-yellow-500/90">
                            Rank
                          </TableHead>
                          <TableHead className="font-bold text-yellow-500/90">
                            Name
                          </TableHead>
                          <TableHead className="font-bold text-yellow-500/90">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTournament &&
                          selectedTournament.users
                            .sort((a, b) => b.points! - a.points!)
                            .map((user, index) => (
                              <TableRow key={user.userId}>
                                <TableCell className="font-medium flex">
                                  <Trophy
                                    className="h-6 w-6"
                                    color={`${
                                      user.rank === 1
                                        ? "#F2CA16"
                                        : user.rank === 2
                                        ? "#C0C0C0"
                                        : "#CD7F32"
                                    } `}
                                  />
                                  {user.rank}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {user.username}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {user.points}
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {/* select auction modal for add */}
            <Dialog open={showSelectModal} onOpenChange={setShowSelectModal}>
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-5xl w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="max-md:text-md">
                    Select Auctions for Tournament
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    Choose the cars that will be included in this tournament
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="bg-[#1E2A36] relative h-auto flex px-2 py-1.5 rounded gap-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      placeholder="Search by make, model or year"
                      className="pl-10 text-white bg-transparent focus:outline-none placeholder:text-white border-none max-md:text-sm"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchAuctionValue(e.target.value)
                      }
                    />
                  </div>
                </div>
                {isAuctionLoading ? (
                  <div className="flex justify-center items-center w-full mt-4">
                    <BeatLoader color="#F2CA16" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableAuctionData.map((auction) => (
                        <div
                          key={auction.auction_id}
                          className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                            currentAuctions.some(
                              (a) => a.auction_id === auction.auction_id
                            )
                              ? "bg-[#F2CA16]/10 border-[#F2CA16]"
                              : "bg-[#1E2A36] border-[#1E2A36] hover:bg-[#1E2A36]/80"
                          }`}
                          onClick={() => handleAuctionSelection(auction)}
                        >
                          {currentAuctions.some(
                            (a) => a.auction_id === auction.auction_id
                          ) ? (
                            <CheckSquare className="h-5 w-5 text-[#F2CA16] mr-3 flex-shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                          )}

                          <div className="grid grid-cols-4">
                            <div className="col-span-3 flex-1 min-w-0">
                              {auction.year && auction.make && auction.model ? (
                                <div className="max-md:text-xs text-sm truncate">
                                  {`${auction.year} ${auction.make} ${auction.model}`}
                                </div>
                              ) : (
                                <div className="max-md:text-xs text-sm truncate">
                                  {auction.title}
                                </div>
                              )}
                              {/* <div className="max-md:text-xs text-sm truncate">
                                {`${auction.year} ${auction.make} ${auction.model}`}
                              </div> */}
                              <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                Current Bid: $
                                {(auction.price || 0).toLocaleString()}
                              </div>
                              <div className="max-md:text-xs text-sm text-gray-400 truncate">
                                Ends In: {formatDate(auction.deadline)}
                              </div>
                            </div>
                            {auction.image ? (
                              <Image
                                src={auction.image}
                                alt={`${auction.year} ${auction.make} ${auction.model}`}
                                title={`${auction.year} ${auction.make} ${auction.model}`}
                                className="w-full h-full object-cover"
                                width={100}
                                height={100}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="items-center">
                      <div className="mx-auto mb-8 w-1/3">
                        <ResponsivePagination
                          current={currentAuctionPage}
                          total={totalAuctionPages}
                          onPageChange={setCurrentAuctionPage}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="flex-row justify-end space-x-2">
                  <form
                    onSubmit={(e: any) =>
                      handleSelectAuctionSubmit(e, currentModalType)
                    }
                  >
                    <Button
                      type="submit"
                      className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Confirming Selection..."
                        : "Confirm Selection" +
                          (" (" + currentAuctions.length + ")")}
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      {!isLoading && (
        <div className="mx-auto mb-8 w-1/3">
          <ResponsivePagination
            current={currentPage}
            total={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
