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
