///////////////////////// Auctions //////////////////////////

export interface getCarsWithFilterProps {
  make?: string[];
  category?: string[];
  era?: string[];
  location?: string[];
  limit?: number;
  sort?: string;
}

export const getCarsWithFilter = async (props: getCarsWithFilterProps) => {
  const queries = Object.entries(props)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array values, for example, joining them with commas
        return `${key}=${value
          .map((item) => encodeURIComponent(item))
          .join("$")}`;
      } else {
        // Handle single values
        return `${key}=${encodeURIComponent(value)}`;
      }
    })
    .join("&");

  try {
    const response = await fetch(`/api/auctions/filter?` + queries, {
      cache: "no-store", //dynamic rendering
    });

    if (response.ok) {
      const list = await response.json();
      let auctions = {
        total: list.total,
        cars: list.cars.map((data: any) => ({
          _id: data._id,
          auction_id: data.auction_id,
          description: [...data.description],
          images_list: [...data.images_list],
          listing_details: [...data.listing_details],
          image: data.image,
          page_url: data.page_url,
          website: data.website,
          price: data.attributes[0].value,
          year: data.attributes[1].value,
          make: data.attributes[2].value,
          model: data.attributes[3].value,
          category: data.attributes[4].value,
          era: data.attributes[5].value,
          chassis: data.attributes[6].value,
          seller: data.attributes[7].value,
          location: data.attributes[8].value,
          state: data.attributes[9].value,
          lot_num: data.attributes[10].value,
          listing_type: data.attributes[11].value,
          deadline: data.attributes[12].value,
          bids: data.attributes[13].value,
          status: data.attributes[14].value,
          isActive: data.isActive,
          display: data.display,
        })),
      };

      return auctions;
    } else {
      throw new Error("Failed to fetch cars list!");
    }
  } catch (err) {
    console.error(err);
  }
};

// get one auction by id
export const getOneAuction = async (auction_id: string) => {
  try {
    const res = await fetch("/api/auctions?auction_id=" + auction_id);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log("Response data:", data);
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};

//get all admins
export const getAdmins = async () => {
  const res = await fetch("/api/admins");
  const data = await res.json();
  return data;
};

///////////////////////// Users //////////////////////////
// get all users
export const getUsers = async () => {
  const res = await fetch("/api/users");
  const data = await res.json();
  return data;
};

//get limited users
export const getLimitedUsers = async (limit: number) => {
  const res = await fetch(`/api/users?limit=${limit}`);
  const data = await res.json();
  return data;
};

// get one user by id
export const getOneUser = async (id: string) => {
  const res = await fetch("/api/users?user_id=" + id);
  const data = await res.json();
  return data;
};

// search users
export const getUsersWithSearch = async (searchString: string) => {
  const res = await fetch("/api/users/filters?search=" + searchString);
  const data = await res.json();
  return data;
};

// edit and ban user
export const editUserWithId = async (id: string, body: any) => {
  const res = await fetch(`/api/users?user_id=${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res.status === 200) {
    return { user: await res.json(), status: res.status };
  } else {
    console.error("Edit Unsuccessful");
  }
};

export const deleteUserWithId = async (id: string) => {
  const res = await fetch(`/api/users?user_id=${id}`, {
    method: "DELETE",
  });

  if (res.status === 200) {
    return { status: res.status };
  } else {
    console.error("Delete Unsuccessful");
  }
};

///////////////////////// Tournaments //////////////////////////

// create tournament
/* sample data: 
{
    "title": "Random Collections Tournament"
    "auctionID": ["65b06c9a5860b968d880c6e9", "65b309b0990459fcb7461e02", "65b309b1990459fcb7461e34", "65b309b1990459fcb7461e66", "65b38cc682288dfdce7db1c9" ],
    "buyInFee": 50,
    "startTime": "2024-02-05T07:34:45.337Z",
    "endTime": "2024-02-10T07:34:45.337Z"
}*/

// create tournament
export const createTournament = async (body: any) => {
  const res = await fetch(`/api/tournaments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status === 200) {
    console.log("Create Tournament Successful");
    return { isSuccessful: true };
  } else {
    console.log("Create Tournament Unsuccessful");
    return { isSuccessful: false };
  }
};

// fetch multiple tournaments
export const getLimitedTournaments = async (limit: number) => {
  const res = await fetch(`/api/tournaments?limit=${limit}`);
  if (res.status === 200) {
    return await res.json();
  } else {
    console.error("Get Tournaments Unsuccessful");
  }
};

//fetch one tournament
export const getTournamentData = async (id: string) => {
  const res = await fetch(`/api/tournaments?id=${id}`);
  if (res.status === 200) {
    return await res.json();
  } else {
    console.error("Get Tournament Unsuccessful");
  }
};

// delete tournament
export const deleteTournament = async (id: string) => {
  const res = await fetch(`/api/tournaments?id=${id}`, {
    method: "PUT",
    body: JSON.stringify({ isActive: false }),
  });
  if (res.status === 200) {
    console.log("Tournament Deleted");
    return await res.json();
  } else {
    console.error("Get Tournaments Unsuccessful");
  }
};

//fetch all auctions for auctions
export const getAuctionsForTournaments = async (id: string) => {
  const res = await fetch(`/api/auctions/filter?tournament_id=${id}`);
  if (res) {
    return res;
  } else {
    console.log("cannot fetch auctions");
  }
};

// edit tournament
export const editTournament = async (id: string, body: any) => {
  const res = await fetch(`/api/tournaments?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res.status === 200) {
    return res;
  } else {
    console.log("Edit Unsuccessful");
  }
};

// search tournament
export const searchTournaments = async (searchWord: string) => {
  const res = await fetch(`/api/tournaments/search?search=${searchWord}`, {
    method: "GET",
  });
  if (res.status === 200) {
    return res;
  } else {
    console.log("search Unsuccessful");
  }
};

///////////////////////// Wagers //////////////////////////

// export interface CreateWagerProps {
//   auctionID?: string;
//   priceGuessed?: number;
//   wagerAmount?: number;
//   user?: {
//     _id: string;
//     fullName: string;
//     username: string;
//   };
//   page?: number;
//   limit?: number;
// }

// get all wagers
export const getWagers = async () => {
  const res = await fetch(`/api/wagers`);
  if (res.status === 200) {
    const data = await res.json();
    return data;
  }

  throw new Error("Failed to fetch wagers!");
};

// get wagers with limit
export const getLimitedWagers = async (limit: number) => {
  const res = await fetch(`/api/wagers/filters?limit=${limit}`);
  if (res.status === 200) {
    const data = await res.json();
    return data;
  }

  throw new Error("Failed to fetch wagers!");
};

// get wagers Count
export const getWagersCount = async () => {
  const res = await fetch(`/api/wagers/count`);
  if (res.status === 200) {
    const data = await res.json();
    return data;
  }
  throw new Error("Failed to fetch wagers!");
};

// get one wager by id
export const getOneWager = async (id: string) => {
  try {
    const res = await fetch("/api/wagers?wager_id=" + id);
    if (!res.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to fetch wager!");
  }
};

// edit wager
export const editWagerWithId = async (id: string, body: any) => {
  const res = await fetch(`/api/wagers?wager_id=${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res.status === 200) {
    return res;
  } else {
    console.log("Edit Unsuccessful");
  }
};

// search users
export const getWagersWithSearch = async (searchString: string) => {
  const res = await fetch("/api/wagers/filters?search=" + searchString);
  const data = await res.json();
  return data;
};

// get wagers on Date
export const getWagersOnDate = async (date: string) => {
  const res = await fetch(`/api/wagers/day?date=${date}`);
  if (res.status === 200) {
    const data = await res.json();
    return data;
  }
  console.error("Failed to fetch wagers!");
};

export const refundWager = async (wager_id: string) => {
  const res = await fetch("/api/refundAuctionWagers", {
    method: "POST",
    body: JSON.stringify({ wager_id }),
  });

  if (res.status === 200) {
    return res;
  } else {
    console.log("Refund Unsuccessful");
  }
};

// toggle auction isActive status
export const updateAuctionStatus = async (
  auction_id: string,
  isActive: boolean
) => {
  const res = await fetch(`/api/auctions?auction_id=${auction_id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive }),
  });

  if (!res.ok) {
    throw new Error("Failed to update auction status");
  }
};

export const promptAgentPredictions = async (auction_id: string) => {
  const res = await fetch(`/api/prompt?auction_id=${auction_id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to prompt Vertex AI");
  }
};

//toggle auction display
export const toggleAuctionDisplay = async (
  auction_id: string,
  display: boolean
) => {
  const res = await fetch(`/api/auctions?auction_id=${auction_id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ display }),
  });

  if (!res.ok) {
    throw new Error("Failed to toggle display of auction");
  }
};

//get all comments
export const getAllComments = async (limit: number) => {
  const response = await fetch(`/api/comments?limit=${limit}`);
  const data = await response.json();
  console.log(data);
  return data;
};

export const getSortedComments = async (limit: number, sort: string) => {
  const response = await fetch(`/api/comments?limit=${limit}&sort=${sort}`);
  const data = await response.json();
  return data;
};

export const deleteComment = async (commentID: string) => {
  await fetch("/api/comments", {
    method: "DELETE",
    body: JSON.stringify({ ids: [commentID] }),
  });
};

export const deleteMultipleComments = async (ids: string[]) => {
  await fetch("/api/comments", {
    method: "DELETE",
    body: JSON.stringify({ ids: [...ids] }),
  });
};

export const getCommentReplies = async (id: string) => {
  const response = await fetch(`/api/comments?parent_id=${id}`);
  const data = await response.json();
  return data;
};

export const getParentComment = async (id: string) => {
  const response = await fetch(`/api/comments?id=${id}`);
  const data = await response.json();
  return data;
};

export const getAgents = async () => {
  const res = await fetch("/api/agents");
  const data = await res.json();
  return data;
};
export const editAgentWithId = async (id: string, body: any) => {
  const res = await fetch(`/api/agents?agent_id=${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  console.log(res);
  if (res.status === 200) {
    return { message: "Edit Successful" };
  } else {
    const data = await res.json();
    console.error("Edit Unsuccessful");
    console.log(data);
    return { message: data.message };
  }
};
