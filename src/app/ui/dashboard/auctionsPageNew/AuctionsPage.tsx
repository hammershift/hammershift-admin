"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatDistanceToNow, isValid, subDays } from "date-fns";
import { BeatLoader, ClipLoader } from "react-spinners";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/ui/components/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/app/ui/components/card";
import { Switch } from "@/app/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import { Button } from "@/app/ui/components/button";
import { Input } from "../../components/input";
import { Badge } from "@/app/ui/components/badge";
import { CarData } from "@/app/dashboard/auctions/page";
import ResponsivePagination from "react-responsive-pagination";
import { Prediction } from "@/app/models/prediction.model";
//import "react-responsive-pagination/themes/classic.css";
import "react-responsive-pagination/themes/minimal-light-dark.css";
import {
  updateAuctionStatus,
  promptAgentPredictions,
  getPredictions,
  deleteAgentPrediction,
  editAuctionWithId,
} from "@/app/lib/data";
import {
  Car,
  Search,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  ImageOff,
  RefreshCcw,
  Filter,
  Calendar,
  CircleCheck,
  Clock,
} from "lucide-react";
import { Label } from "../../components/label";
import { DateTime } from "luxon";
import { Textarea } from "../../components/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/app/ui/components/dialog";

interface AuctionsPageProps {
  auctionData: CarData[];
  currentPage: number;
  currentTab: string;
  totalPages: number;
  isLoading: boolean;
  refreshToggle: boolean;
  searchedKeyword: String;
  setCurrentPage: (page: number) => void;
  setRefreshToggle: (toggle: boolean) => void;
  setCurrentTab: (tab: string) => void;
  handleSearch: (input: string) => void;
}

interface EditDetails {
  image: string;
  make: string;
  model: string;
  year: number;
  price: number;
  description: string[];
  status: string | null;
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({
  auctionData: auctionData,
  currentTab,
  currentPage,
  totalPages,
  isLoading,
  refreshToggle,
  searchedKeyword,
  setCurrentPage,
  setRefreshToggle,
  handleSearch,
  setCurrentTab,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});
  const [auctionLoadingStates, setAuctionLoadingStates] = useState<{
    [key: string]: string;
  }>({});
  const [editAuction, setEditAuction] = useState<boolean>(false);
  const [deleteAuction, setDeleteAuction] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [viewingPredictions, setViewingPredictions] = useState<boolean>(false);
  const [currentAuction, setCurrentAuction] = useState<CarData | null>();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [refreshPrediction, setRefreshPrediction] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });
  const [predictionLoading, setPredictionLoading] = useState<boolean>(false);
  const [searchString, setSearchString] = useState<string>("");
  const [editAuctionDetails, setEditAuctionDetails] = useState<EditDetails>({
    image: "",
    make: "",
    model: "",
    year: 0,
    price: 0,
    description: [],
    status: null,
  });

  useEffect(() => {
    setViewportWidth(window.innerWidth);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchString);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchString, handleSearch]);
  useEffect(() => {
    // TODO: might have to rewrite this when using pagination and search
    const initialActiveAuctions = auctionData.reduce(
      (acc, item) => ({
        ...acc,
        [item._id]: item.isActive,
      }),
      {}
    );

    const auctionLoadingStates = auctionData.reduce(
      (acc, item) => ({
        ...acc,
        [item._id]: "off",
      }),
      {}
    );

    setAuctionLoadingStates(auctionLoadingStates);
    setActiveAuctions(initialActiveAuctions);
  }, [auctionData, searchedKeyword]);

  useEffect(() => {
    async function fetchPredictions() {
      console.log("test");
      if (currentAuction) {
        const predictions = await getPredictions(currentAuction._id);
        setPredictions(predictions);
      } else {
        setPredictions([]);
      }

      setPredictionLoading(false);
    }
    fetchPredictions();
  }, [currentAuction, refreshPrediction]);

  const formatTimeLeft = (dateString: string) => {
    if (!dateString) return "No end date";

    try {
      const endDate = subDays(new Date(dateString), 1);

      if (!isValid(endDate)) {
        return "Invalid date";
      }

      const now = new Date();
      if (endDate < now) {
        return "Ended";
      }

      return formatDistanceToNow(endDate, { addSuffix: true });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date error";
    }
  };
  async function handleViewPrediction(auction: CarData) {
    //get predictions from auction_id
    setCurrentAuction(auction);
    setPredictionLoading(true);
    setViewingPredictions(true);
  }

  async function handleDeleteAuction(auction: CarData) {
    setCurrentAuction(auction);
    setDeleteAuction(true);
  }

  async function handleToggleInactive(e: any) {
    e.preventDefault();
    setIsSubmitting(true);
    if (!currentAuction) {
      alert("No auction selected");
      return;
    }
    try {
      await updateAuctionStatus(currentAuction._id, false);
    } catch (e) {
      console.log(e);
      alert("An error occured while disabling auction");
    } finally {
      setRefreshToggle(!refreshToggle);
      setAuctionLoadingStates((prevStates) => ({
        ...prevStates,
        [currentAuction._id]: "off",
      }));
      setActiveAuctions((prevStates) => ({
        ...prevStates,
        [currentAuction._id]: false,
      }));
      setIsSubmitting(false);
      setDeleteAuction(false);
      setCurrentAuction(null);
    }
  }

  async function handleEditAuction(auction: CarData) {
    setCurrentAuction(auction);
    setEditAuction(true);
  }

  async function handleSaveEdits() {
    try {
      if (currentAuction === null || currentAuction === undefined) {
        alert("No auction selected");
        return;
      }
      setEditLoading(true);
      const response = await editAuctionWithId(
        currentAuction._id,
        editAuctionDetails
      );
    } catch (e) {
      console.log(e);
      alert("An error occured while editing auction");
    } finally {
      setEditLoading(false);
      setEditAuction(false);
      setCurrentAuction(null);
      setEditAuctionDetails({
        image: "",
        make: "",
        model: "",
        year: 0,
        price: 0,
        description: [],
        status: null,
      });
      setRefreshToggle(!refreshToggle);
    }
  }

  async function handleDeleteAgentPrediction(id: string) {
    try {
      await deleteAgentPrediction(id);
      setRefreshPrediction(!refreshPrediction);
      setPredictionLoading(true);
    } catch (e) {
      console.error(e);
    }
  }
  async function handleStatusToggle(id: string) {
    const auction = auctionData.find((x) => x._id === id);

    if (!auction) {
      alert("Auction not found");
      console.error("Auction not found");
      return;
    }
    if (
      !auction.isActive &&
      Date.parse(subDays(auction.deadline, 1).toString()) < Date.now()
    ) {
      alert("Deadline has passed for this auction");
      return;
    }
    setAuctionLoadingStates((prevStates) => ({
      ...prevStates,
      [id]: "loading",
    }));
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));

    try {
      if (!activeAuctions[id]) {
        //TODO: merge the two functions into one
        await updateAuctionStatus(id, !activeAuctions[id]);
        await promptAgentPredictions(id);
      }
    } catch (error) {
      alert("An error has occured while enabling the auction.");
      console.error(error);
    } finally {
      setAuctionLoadingStates((prevStates) => ({
        ...prevStates,
        [id]: "added",
      }));
    }
  }

  return (
    <div className="section-container mt-4">
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl max-md:text-xl font-bold text-yellow-500">
              Car Management
            </CardTitle>
            <CardDescription className="text-md max-md:text-sm">
              Manage car feed and auctions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full block md:table">
            <div className="bg-[#1E2A36] relative h-auto flex px-2 py-1.5 rounded gap-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                placeholder="Search by make, model, or year"
                className="pl-10 text-white bg-transparent focus:outline-none placeholder:text-white border-none max-md:text-sm"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchString(e.target.value)
                }
              />
            </div>
            <Tabs
              value={currentTab}
              onValueChange={setCurrentTab}
              className="mb-6 mt-6"
            >
              <TabsList className="grid grid-cols-2 bg-[#1E2A36]">
                <TabsTrigger
                  value="external"
                  className={`border-2 ${
                    currentTab === "external"
                      ? " border-yellow-400"
                      : "border-transparent"
                  }`}
                >
                  External Feed
                </TabsTrigger>
                <TabsTrigger
                  value="platform"
                  className={`border-2 ${
                    currentTab === "platform"
                      ? "border-yellow-400"
                      : "border-transparent"
                  }  `}
                >
                  Platform Auctions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="external">
                <Card className="bg-[#13202D] border-[#1E2A36]">
                  <CardHeader>
                    <CardTitle>External Car Feed</CardTitle>
                    <CardDescription>
                      Cars available from external feed. Add them to your
                      platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading && currentTab === "external" ? (
                      <div className="flex items-center justify-center">
                        <BeatLoader color="#F2CA16" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {auctionData.map((auction) => (
                          <Card
                            key={auction.auction_id}
                            className="bg-[#1E2A36] border-[#1E2A36] overflow-hidden flex flex-col"
                          >
                            <div className="relative h-48 bg-gray-800">
                              {auction.image ? (
                                <Image
                                  src={auction.image}
                                  alt={`${auction.year} ${auction.make} ${auction.model}`}
                                  title={`${auction.year} ${auction.make} ${auction.model}`}
                                  className="w-full h-full object-cover"
                                  objectFit="cover"
                                  fill
                                ></Image>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageOff className="w-12 h-12 text-gray-500" />
                                </div>
                              )}
                              <Badge className="absolute top-2 right-2 bg-[#F2CA16] text-[#0C1924]">
                                {auction.make}
                              </Badge>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="text-xl max-md:text-lg font-bold mb-1 truncate">
                                {auction.year} {auction.make} {auction.model}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {auction.auction_id}
                              </p>
                              <a
                                href={auction.page_url}
                                className="underline text-blue-600 whitespace-nowrap hover:text-blue-800 visited:text-purple-600 text-sm max-md:text-xs mb-3"
                              >
                                {auction.page_url}
                              </a>

                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="text-xs text-gray-400">
                                    Current Bid
                                  </div>
                                  <div className="text-[#F2CA16] font-bold max-md:text-sm">
                                    ${auction.price}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-400">
                                    Time Left
                                  </div>
                                  <div className="flex items-center max-md:text-sm ">
                                    <Clock className="mr-1 h-4 w-4 text-gray-400" />

                                    {formatTimeLeft(
                                      auction.deadline.toString()
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    auction.isActive ||
                                    auctionLoadingStates[auction._id] ===
                                      "added"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {auction.isActive ||
                                  auctionLoadingStates[auction._id] === "added"
                                    ? "Active"
                                    : "Inactive"}
                                </Badge>
                              </div>
                              {auction.isActive ||
                              auctionLoadingStates[auction._id] === "added" ? (
                                <Button
                                  className="w-full bg-green-600 text-[#0C1924] cursor-default "
                                  disabled
                                >
                                  <CircleCheck className="mr-2 h-4 w-4" />
                                  Added to Platform
                                </Button>
                              ) : auctionLoadingStates[auction._id] ===
                                "loading" ? (
                                <Button
                                  className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                                  disabled
                                >
                                  <ClipLoader color="#000" />
                                </Button>
                              ) : (
                                <Button
                                  className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                                  onClick={() =>
                                    handleStatusToggle(auction._id)
                                  }
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add to Platform
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* {filteredExternalCars.length === 0 && (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Cars Found</h3>
                  <p className="text-gray-400">
                    No cars match your search criteria
                  </p>
                </div>
              )} */}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    {/* <div className="text-sm text-gray-400">
                Showing {filteredExternalCars.length} of{" "}
                {MOCK_EXTERNAL_CARS.length} cars
              </div> */}
                    {/* <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh Feed
                </Button> */}
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="platform">
                <Card className="bg-[#13202D] border-[#1E2A36]">
                  <CardHeader>
                    <CardTitle>Platform Cars</CardTitle>
                    <CardDescription>
                      Manage cars that are currently on your platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading && currentTab === "platform" ? (
                      <div className="flex justify-center items-center">
                        <BeatLoader color="#F2CA16" />
                      </div>
                    ) : (
                      <>
                        <div className="block md:hidden space-y-4">
                          {auctionData &&
                            auctionData.map((auction, index: number) => (
                              <div
                                key={index}
                                className="bg-[#1E2A36] border-2 border-[#1E2A36] rounded-xl p-4 space-y-2"
                              >
                                <div className="flex w-full gap-2">
                                  <div className="w-[75%]">
                                    <p className="text-xs text-gray-400">Car</p>
                                    <div className="flex items-center gap-3">
                                      <div>
                                        <div className="text-xs">
                                          {auction.year} {auction.make}{" "}
                                          {auction.model}
                                        </div>
                                        {/* <div className="text-sm text-gray-400">
                                  {car.description.substring(0, 30)}...
                                </div> */}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="w-[25%]">
                                    <div className="w-12 h-12 rounded-md bg-gray-800 overflow-hidden">
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
                                </div>
                                <div className="flex w-full gap-2">
                                  <div className="w-[50%]">
                                    <p className="text-xs text-gray-400">
                                      Current Bid
                                    </p>
                                    <p className="text-white text-sm font-mono">
                                      ${auction.price.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="w-[50%]">
                                    <p className="text-xs text-gray-400">
                                      Status
                                    </p>
                                    <Badge
                                      className={
                                        auction.isActive
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }
                                    >
                                      {auction.isActive ? "Active" : "Ended"}
                                    </Badge>
                                  </div>
                                </div>
                                <div></div>

                                <div className="flex justify-end space-x-2 pt-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Edit Car"
                                    className=""
                                    onClick={() => handleEditAuction(auction)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="View Predictions"
                                    className="text-yellow-500"
                                    onClick={() =>
                                      handleViewPrediction(auction)
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Car</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Current Bid</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {auctionData.map((auction) => (
                                <TableRow key={auction.auction_id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded-md bg-gray-800 overflow-hidden">
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
                                      <div>
                                        <div className="font-medium truncate">
                                          {auction.year} {auction.make}{" "}
                                          {auction.model}
                                        </div>
                                        {/* <div className="text-sm text-gray-400">
                                  {car.description.substring(0, 30)}...
                                </div> */}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {DateTime.fromJSDate(
                                      new Date(auction.deadline)
                                    ).toLocaleString(
                                      DateTime.DATETIME_FULL
                                    )}{" "}
                                    (
                                    {formatTimeLeft(
                                      new Date(auction.deadline).toString()
                                    )}
                                    )
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    ${auction.price.toLocaleString()}
                                  </TableCell>

                                  <TableCell>
                                    {/* TODO: Change to using status from attributes */}
                                    <Badge
                                      className={
                                        auction.isActive
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }
                                    >
                                      {auction.isActive ? "Active" : "Ended"}
                                    </Badge>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Edit Car"
                                        className=""
                                        onClick={() =>
                                          handleEditAuction(auction)
                                        }
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="View Predictions"
                                        className="text-yellow-500"
                                        onClick={() =>
                                          handleViewPrediction(auction)
                                        }
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Delete Car"
                                        className="text-red-500"
                                        onClick={() =>
                                          handleDeleteAuction(auction)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                      {/* <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Game Timing"
                                onClick={() => handleEditGameTiming(car)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button> */}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {auctionData.length === 0 && (
                          <div className="text-center py-8">
                            <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">
                              No Cars Found
                            </h3>
                            <p className="text-gray-400">
                              No cars match your search criteria
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <Dialog
              open={viewingPredictions}
              onOpenChange={setViewingPredictions}
            >
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg max-md:text-md">
                    Predictions
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    {currentAuction &&
                      `Viewing predictions for ${currentAuction.year} ${currentAuction.make} ${currentAuction.model}`}
                  </DialogDescription>
                </DialogHeader>

                {predictionLoading ? (
                  <div className="flex justify-center items-center w-full mt-4">
                    <BeatLoader color="#F2CA16" />
                  </div>
                ) : (
                  <div className="py-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Prediction</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {predictions.map((prediction) => (
                          <TableRow key={prediction._id.toString()}>
                            <TableCell>{prediction.user.username}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  prediction.user.role === "USER"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-purple-100 text-purple-800"
                                }
                              >
                                {prediction.user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              ${prediction.predictedPrice.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  prediction.refunded
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }
                              >
                                {prediction.refunded
                                  ? "refunded"
                                  : prediction.isActive
                                  ? "active"
                                  : "completed"}
                              </Badge>
                            </TableCell>
                            {prediction.user.role === "AGENT" && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete Agent Prediction"
                                  className=""
                                  onClick={() =>
                                    handleDeleteAgentPrediction(
                                      prediction._id.toString()
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {predictions.length === 0 && (
                      <div className="text-center py-8">
                        <h3 className="text-xl font-bold mb-2">
                          No Predictions
                        </h3>
                        <p className="text-gray-400">
                          This auction has no predictions yet
                        </p>
                      </div>
                    )}
                    {/* {MOCK_PREDICTIONS.filter(pred => pred.car_id === viewingPredictions.id).length === 0 && (
                <div className="text-center py-8">
                  <h3 className="text-xl font-bold mb-2">No Predictions</h3>
                  <p className="text-gray-400">This car has no predictions yet</p>
                </div>
              )} */}
                  </div>
                )}

                <DialogFooter className="flex-row justify-end space-x-2">
                  <Button
                    className=""
                    onClick={() => setViewingPredictions(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={editAuction} onOpenChange={setEditAuction}>
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg max-md:text-md">
                    Edit Auction
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    Make changes to auction details
                  </DialogDescription>
                </DialogHeader>
                {currentAuction && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block max-md:text-xs">
                          Car Image
                        </Label>
                        <div className="h-48 bg-gray-800 rounded-md mb-4 overflow-hidden">
                          {currentAuction.image ? (
                            <Image
                              src={currentAuction.image}
                              alt={`${currentAuction.year} ${currentAuction.make} ${currentAuction.model}`}
                              title={`${currentAuction.year} ${currentAuction.make} ${currentAuction.model}`}
                              className="w-full h-full object-cover"
                              objectFit="cover"
                              width={200}
                              height={200}
                            ></Image>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <Input
                          placeholder="Image URL"
                          defaultValue={currentAuction.image}
                          className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditAuctionDetails({
                              ...editAuctionDetails,
                              image: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="max-md:text-xs">Make</Label>
                          <Input
                            defaultValue={currentAuction.make}
                            className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setEditAuctionDetails({
                                ...editAuctionDetails,
                                make: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label className="max-md:text-xs">Model</Label>
                          <Input
                            defaultValue={currentAuction.model}
                            className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setEditAuctionDetails({
                                ...editAuctionDetails,
                                model: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label className="max-md:text-xs">Year</Label>
                          <Input
                            type="number"
                            defaultValue={currentAuction.year}
                            className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setEditAuctionDetails({
                                ...editAuctionDetails,
                                year: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label className="max-md:text-xs">Current Bid</Label>
                          <Input
                            type="number"
                            defaultValue={currentAuction.price}
                            className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              setEditAuctionDetails({
                                ...editAuctionDetails,
                                price: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="max-md:text-xs">Description</Label>
                      <Textarea
                        defaultValue={currentAuction.description}
                        className="bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                        rows={3}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditAuctionDetails({
                            ...editAuctionDetails,
                            description: [e.target.value],
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <Label className="max-md:text-xs">Status</Label>
                      <select
                        defaultValue={
                          currentAuction.isActive && !currentAuction.ended
                            ? "active"
                            : "ended"
                        }
                        className="bg-[#1E2A36] border border-[#1E2A36] rounded-md p-2 max-md:text-sm"
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setEditAuctionDetails({
                            ...editAuctionDetails,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="ended">Ended</option>
                      </select>

                      {/* <div className="ml-auto flex items-center gap-2">
                  <Label>Visible</Label>
                  <Switch defaultChecked={selectedCar.visible} />
                </div> */}
                    </div>
                  </div>
                )}
                <DialogFooter className="flex-row justify-end space-x-2">
                  <Button
                    variant="outline"
                    className=""
                    onClick={() => {
                      setCurrentAuction(null);
                      setEditAuction(false);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                    onClick={handleSaveEdits}
                    disabled={editLoading}
                  >
                    {editLoading ? (
                      <BeatLoader color="#000" />
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={deleteAuction} onOpenChange={setDeleteAuction}>
              <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-red-700 text-lg max-md:text-md">
                    Toggle Auction to Inactive
                  </DialogTitle>
                  <DialogDescription className="max-md:text-sm">
                    Are you sure you want to set{" "}
                    <span className="font-semibold text-red-700">
                      {currentAuction?.year} {currentAuction?.make}{" "}
                      {currentAuction?.model}
                    </span>{" "}
                    to inactive?
                  </DialogDescription>
                </DialogHeader>

                <div className="p-2 m-2 text-sm">
                  <p className="text-lg max-md:text-md font-bold text-red-700 text-center">
                    Warning
                  </p>
                  <p className={"text-justify max-md:text-sm"}>
                    {
                      "By setting this auction to inactive, they will no longer be accessible in the Velocity Market App's auctions section."
                    }
                  </p>
                  <p className={"text-justify max-md:text-sm"}>
                    {"However, predictions will be retained."}
                  </p>
                </div>
                <DialogFooter className="flex-row justify-end space-x-2">
                  <form onSubmit={handleToggleInactive}>
                    <Button
                      type="submit"
                      className="bg-red-700 text-[#0C1924] hover:bg-red-700/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Toggling..." : "Toggle Inactive"}
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

export default AuctionsPage;
