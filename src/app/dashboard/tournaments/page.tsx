"use client";
import React, { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import { useSession } from "next-auth/react";
import {
  changeActiveStatusForTournament,
  getTournamentsWithSearch,
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
  Edit,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
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
import { formatDate } from "@/app/helpers/utils";

interface TournamentUser {
  userId: string;
  fullName: string;
  username: string;
  role: string;
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
  startTime: Date | null;
  endTime: Date | null;
  auction_ids: string[];
  users: TournamentUser[];
  maxUsers: number;
  createdAt: Date | null;
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
        console.log(data);
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
    startTime: null,
    endTime: null,
    auction_ids: [],
    users: [],
    maxUsers: 0,
    createdAt: null,
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const { data } = useSession();
  const [role, setRole] = useState("");

  useEffect(() => {
    if (data?.user?.role) {
      setRole(data.user.role);
    }
  }, [data]);

  const handleChange = (e: any) => {
    //temp
  };

  const emptyErrors = () => {
    setEmptyInputError(false);
    setTournamentInputError(false);
    setEmptyInputError(false);
  };

  const handleNewTournamentChange = (e: any) => {
    emptyErrors;
    const { name, value } = e.target;
    if (name) setNewTournament({ ...newTournament!, [name]: value });
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
      console.log(newTournament.prizePool);
      setEmptyInputError(true);
    } else {
      try {
        const response = await fetch("/api/tournaments", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            ...newTournament,
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
          alert("Tournament created successfully!");
          setShowAddModal(false);
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
        body: JSON.stringify(selectedTournament),
      });

      await response.json();
      if (!response.ok) {
        console.error("Error deleting tournament");
      } else {
        alert("Tournament delete successfully!");
        setShowDeleteModal(false);
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
  };

  const handleActiveStatusForTournament = async (
    tournament: TournamentData
  ) => {
    setIsSubmitting(true);
    try {
      const response = await changeActiveStatusForTournament(
        tournament?.tournament_id
      );
      if (!response.isSuccessful) {
        console.error("Error changing active status for tournament");
      } else {
        // alert("Change active status for tournament successfully!");
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
  };

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
                setNewTournament(defaultTournament);
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
                          {/* <div className="flex w-full gap-2">
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">First Name</p>
                            <p className="text-white text-sm">
                              {admin.first_name}
                            </p>
                          </div>
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">Last Name</p>
                            <p className="text-white text-sm">
                              {admin.last_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full gap-2">
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">Username</p>
                            <p className="text-white text-sm">
                              {admin.username}
                            </p>
                          </div>
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">Admin Role</p>
                            <Badge
                              className={`text-xs ${getRoleBadgeColor(
                                admin.role
                              )}`}
                            >
                              {admin.role.charAt(0).toUpperCase() +
                                admin.role.substring(1, admin.role.length)}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Email</p>
                          <p className="text-white text-sm">{admin.email}</p>
                        </div>
                        {role == "owner" && (
                          <div className="flex justify-end space-x-2 pt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={""}
                              onClick={() => {
                                setShowEditModal(true);
                                setSelectedAdmin({ ...admin, password: "" });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={"text-red-700"}
                              onClick={() => {
                                setShowDeleteModal(true);
                                setSelectedAdmin(admin);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )} */}
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
                                {formatDate(tournament.startTime!)}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatDate(tournament.endTime!)}
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
                                  <Badge className="bg-purple-500/20 border-purple-400 text-purple-400 mr-2 max-md:text-xs">
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
                              </TableCell>
                              <TableCell className="font-medium">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Activate Tournament"
                                  className={""}
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    handleActiveStatusForTournament(tournament);
                                  }}
                                  disabled={tournament.endTime! < new Date()}
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
                                      title="Edit Tournament"
                                      className={""}
                                      onClick={() => {
                                        setShowEditModal(true);
                                        setSelectedTournament(tournament);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={"text-red-700"}
                                      title={"Delete User"}
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
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-3xl w-[95%] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="max-md:text-md">
                    Add Tournament
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    Provide information for new tournament
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      Description
                    </Label>
                    <Textarea
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
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
                  <div className="grid grid-cols-8 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      {"Start Time"}
                    </Label>
                    <Input
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError && newTournament?.startTime == null
                          ? "border-red-500"
                          : ""
                      }`}
                      name="startTime"
                      type="datetime-local"
                      value={newTournament?.startTime || null}
                      onChange={handleNewTournamentChange}
                    />
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
                      onChange={handleNewTournamentChange}
                    />
                  </div>
                  <div className="grid grid-cols-8 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      {"Buy-in Fee"}
                    </Label>
                    <Input
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError &&
                        newTournament?.buyInFee == 0 &&
                        currentTournamentType != "free_play"
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
                    <Label className="text-right max-md:text-xs">
                      Prize Pool
                    </Label>
                    <Input
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError &&
                        newTournament?.prizePool == 0 &&
                        currentTournamentType != "free_play"
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
                  <div className="grid grid-cols-8 items-center gap-4">
                    <Label className="text-right max-md:text-xs">
                      Max Users
                    </Label>
                    <Input
                      className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                        emptyInputError && newTournament?.maxUsers == 0
                          ? "border-red-500"
                          : ""
                      }`}
                      name="maxUsers"
                      type="number"
                      value={newTournament?.maxUsers || 0}
                      onChange={handleNewTournamentChange}
                    />
                    <Label className="mb-2 block max-md:text-xs">
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
                          className={`bg-[#1E2A36] border-[#1E2A36] ${
                            emptyInputError && currentTournamentType == ""
                              ? "border-red-500"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Select tournament type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                          <SelectItem value="free_play">Free Play</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="max-md:text-md">
                        Edit Tournament
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Update information for{" "}
                        <span className="font-semibold text-yellow-400">
                          {selectedTournament!.name}
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          First Name
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedAdmin?.first_name == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="first_name"
                          type="text"
                          value={selectedAdmin?.first_name || ""}
                          onChange={handleSelectedAdminChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Last Name
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedAdmin?.last_name == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="last_name"
                          type="text"
                          value={selectedAdmin?.last_name || ""}
                          onChange={handleSelectedAdminChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Email
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedAdmin?.email == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="email"
                          type="email"
                          value={selectedAdmin?.email || ""}
                          onChange={handleSelectedAdminChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Username
                        </Label>
                        <Input
                          className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                            emptyInputError && selectedAdmin?.username == ""
                              ? "border-red-500"
                              : ""
                          }`}
                          name="username"
                          type="text"
                          value={selectedAdmin?.username || ""}
                          onChange={handleSelectedAdminChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Password
                        </Label>
                        <Input
                          className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          name="password"
                          type="password"
                          value={selectedAdmin?.password || ""}
                          onChange={handleSelectedAdminChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Confirm Password
                        </Label>
                        <Input
                          className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          name="confirm_password"
                          type="password"
                          value={confirmPassword.confirm_password || ""}
                          onChange={handleConfirmPasswordChange}
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block max-md:text-xs">
                          Role
                        </Label>
                        <Select
                          value={selectedAdmin?.role || ""}
                          onValueChange={handleSelectedAdminRoleChange}
                          name="role"
                        >
                          <SelectTrigger
                            className={`bg-[#1E2A36] border-[#1E2A36] ${
                              emptyInputError && selectedAdmin?.role == ""
                                ? "border-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                        {emptyInputError ? (
                          <p className="mt-4 text-red-500 text-center max-md:text-sm">
                            Please fill-out required fields
                          </p>
                        ) : passwordMismatchError ? (
                          <p className="mt-4 text-red-500 text-center max-md:text-sm">
                            Passwords do not match
                          </p>
                        ) : tournamentInputError ? (
                          <p className="mt-4 text-red-500 text-center max-md:text-sm">
                            {tournamentInputErrorMessage}
                          </p>
                        ) : null}
                      </div> */}
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      {/* <form onSubmit={handleSelectedAdminSubmit}>
                        <Button
                          type="submit"
                          className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Updating..." : "Update"}
                        </Button>
                      </form> */}
                    </DialogFooter>
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
              </div>
            )}
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
