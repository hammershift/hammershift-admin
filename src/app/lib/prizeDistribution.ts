type Wager = {
    userID: string;
    priceGuessed: number;
};

type Winner = {
    userID: string;
    prize: number;
    rank: number;
};

type WagerWithDelta = Wager & {
    delta: number;
};

export function prizeDistribution(
    wagers: any,
    finalSellingPrice: number,
    totalPot: number
): Winner[] {
    // add delta to each wager (diff between guessed price and final selling price)
    const wagersWithDelta: WagerWithDelta[] = wagers.map((wager: any) => ({
        ...wager,
        delta: Math.abs(wager.priceGuessed - finalSellingPrice),
    }));

    // sort wagers by their delta (closeness to the final selling price)
    const sortedWagers: WagerWithDelta[] = [...wagersWithDelta].sort(
        (a, b) => a.delta - b.delta
    );

    const winners: Winner[] = [];
    const prizeDistributionPercentages = [0.5, 0.3, 0.2];

    // these variables track the distribution of the prize pool and the ranking of winners
    let prizePercentageIndex = 0;
    let currentRank = 1;

    for (let i = 0; i < sortedWagers.length; i++) {
        const wager = sortedWagers[i];

        // this will find all wagers that have the same delta, meaning for tie cases.
        const tiedWinners = sortedWagers.filter((w) => w.delta === wager.delta);

        let prizePercentageForGroup = 0;
        for (let j = 0; j < tiedWinners.length; j++) {
            prizePercentageForGroup +=
                prizeDistributionPercentages[prizePercentageIndex + j] || 0;
        }

        // calculate the total prize for this group based on the prize/winning percentage
        // Ex. if the pot is 1000 and that group's % is 80%, total prize is 1000 * .8 = 800
        const totalPrizeForGroup = totalPot * prizePercentageForGroup;

        // to determine the prize each winner in the group will get
        const prizePerWinner = totalPrizeForGroup / tiedWinners.length;

        // add each winner to the winners array
        // Ex. if two tied winners, each gets 800/2 = 400
        for (const tiedWager of tiedWinners) {
            if (!winners.some((winner) => winner.userID === tiedWager.userID)) {
                winners.push({
                    userID: tiedWager.userID,
                    prize: prizePerWinner,
                    rank: currentRank,
                });
            }
        }

        // if two winners tied for the first place, the next prize % considered is for the 3rd place
        prizePercentageIndex += tiedWinners.length;
        currentRank += tiedWinners.length;

        // skip over the other tied winners in the outer loop
        i += tiedWinners.length - 1;
    }

    return winners;
}

export default prizeDistribution;

{
    /*
Sample Test Cases: 
{
  "wagers": [
    { "userID": "user1", "priceGuessed": 900 },
    { "userID": "user2", "priceGuessed": 1100 },
    { "userID": "user3", "priceGuessed": 880 },
    { "userID": "user4", "priceGuessed": 1150 },
    { "userID": "user5", "priceGuessed": 800 }
  ],
  "finalSellingPrice": 1000,
  "totalPot": 500
}



*/
}
