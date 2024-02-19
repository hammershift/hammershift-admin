export interface getCarsWithFilterProps {
    make?: string[];
    category?: string[];
    era?: string[];
    location?: string[];
    limit?: number;
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

// edit user
export const editUserWithId = async (id: string, body: any) => {
    const res = await fetch(`/api/users/edit?user_id=${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
    if (res.status === 200) {
        return { message: "Edit Successful" };
    } else {
        console.error("Edit Unsuccessful");
    }
};

// create tournament
/*{
    "title": "Random Collections Tournament"
    "auctionID": ["65b06c9a5860b968d880c6e9", "65b309b0990459fcb7461e02", "65b309b1990459fcb7461e34", "65b309b1990459fcb7461e66", "65b38cc682288dfdce7db1c9" ],
    "buyInFee": 50,
    "startTime": "2024-02-05T07:34:45.337Z",
    "endTime": "2024-02-10T07:34:45.337Z"
}*/

// create tournament
export const createTournament = async (body: any) => {
    // return { message: "Successful", body };
    // TODO: uncomment this when the API is ready

    const res = await fetch(`/api/tournaments`, {
        method: "POST",
        body: JSON.stringify(body),
    });
    if (res.status === 200) {
        return { message: "Created Tournament" };
    } else {
        console.error("Create Tournament Unsuccessful");
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
    // const res = await fetch(`/api/auctions/filter?tournament_id=${id}}`);
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
