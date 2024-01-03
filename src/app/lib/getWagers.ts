// get all wagers
export const getWagers = async () => {
    const res = await fetch(`/api/wagers`);
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
    const res = await fetch(`/api/wagers/edit?wager_id=${id}`, {
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
