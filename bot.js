const {
    TradingViewScan,
    SCREENERS_ENUM,
    EXCHANGES_ENUM,
    INTERVALS_ENUM,
} = require("trading-view-recommends-parser");
const sleep = require("util").promisify(setTimeout);
const { parseEther } = require("@ethersproject/units");

const config = require("./config.json");
const {
    getHistory,
    getBNBPrice,
    checkBalance,
    percentageChange,
    percentage,
    saveRound,
    predictionContract,
    reduceWaitingTimeByTwoBlocks,
} = require("./lib.js");

async function betUp(amount, epoch) {
    try {
        // const tx = await predictionContract.betBull(epoch, {
        //     value: parseEther(amount.toFixed(18).toString()),
        // });
        // await tx.wait();
        console.log(
            `Round #${epoch} has successful bet of ${amount} BNB to UP`
        );
    } catch (error) {
        console.log("Transaction Error", error);
        config.waiting_time = reduceWaitingTimeByTwoBlocks(config.waiting_time);
    }

    await saveRound(epoch, [
        {
            round: epoch.toString(),
            betAmount: amount.toString(),
            bet: "bull",
        },
    ]);

    return "Bet up!";
}
async function betDown(amount, epoch) {
    try {
        // const tx = await predictionContract.betBear(epoch, {
        //     value: parseEther(amount.toFixed(18).toString()),
        // });
        // await tx.wait();
        console.log(
            `Round #${epoch} has successful bet of ${amount} BNB to DOWN`
        );
    } catch (error) {
        console.log("Transaction Error", error);
        config.waiting_time = reduceWaitingTimeByTwoBlocks(config.waiting_time);
    }

    await saveRound(epoch, [
        {
            round: epoch.toString(),
            betAmount: amount.toString(),
            bet: "bear",
        },
    ]);
    return "Bet down!";
}

async function getSignals() {
    const result1Minute = await new TradingViewScan(
        SCREENERS_ENUM["crypto"],
        EXCHANGES_ENUM["BINANCE"],
        "BNBUSDT",
        INTERVALS_ENUM["1m"]
    ).analyze();

    console.log(result1Minute.summary)
    if (result1Minute.summary) {
        return {
            buy: parseInt(result1Minute.summary.BUY),
            sell: parseInt(result1Minute.summary.SELL),
            neutral: parseInt(result1Minute.summary.NEUTRAL),
        };
    } else {
        return false;
    }
}

// async function getSignals() {
//     const result1Minute = await new TradingViewScan(
//         SCREENERS_ENUM["crypto"],
//         EXCHANGES_ENUM["BINANCE"],
//         "BNBUSDT",
//         INTERVALS_ENUM["1m"]
//     ).analyze();
//     const result5Minute = await new TradingViewScan(
//         SCREENERS_ENUM["crypto"],
//         EXCHANGES_ENUM["BINANCE"],
//         "BNBUSDT",
//         INTERVALS_ENUM["5m"]
//     ).analyze();

//     if (result1Minute.summary && result5Minute.summary) {
//         let averageBuy =
//             (parseInt(result1Minute.summary.BUY) +
//                 parseInt(result5Minute.summary.BUY)) /
//             2;

//         let averageSell =
//             (parseInt(result1Minute.summary.SELL) +
//                 parseInt(result5Minute.summary.SELL)) /
//             2;
//         let averageNeutral =
//             (parseInt(result1Minute.summary.NEUTRAL) +
//                 parseInt(result5Minute.summary.NEUTRAL)) /
//             2;

//         return {
//             buy: averageBuy,
//             sell: averageSell,
//             neutral: averageNeutral,
//         };
//     } else {
//         return false;
//     }
// }

async function strategize(BNBPrice, epoch) {
    let signals = await getSignals();

    if (!signals) {
        console.error("Could not obtain signals");
        return;
    }

    const buyRate = percentage(signals.buy, signals.sell);
    const sellRate = percentage(signals.sell, signals.buy);
    const amount = config.bet_amount / BNBPrice;
    console.log(`#${epoch} 👍 ${buyRate}|${sellRate} 👎`);

    // According to newton's first law of motion
    // An object at rest stays at rest and an object in motion stays in motion
    // with the same speed and in the same direction
    // unless acted upon by an unbalanced force.
    if (buyRate == sellRate) {
        console.log(`meh 50/50`);
    } else if (buyRate > sellRate) {
        betUp(amount, epoch);
    } else {
        betDown(amount, epoch);
    }

    // if (buyRate > 85) {
    //     // bet down
    //     await betDown(amount, epoch);
    //     console.log(`#${epoch} down buyrate: ${buyRate}`);
    // } else if (sellRate > 90) {
    //     // bet up
    //     await betUp(amount, epoch);
    //     console.log(`#${epoch} up sellrate: ${sellRate}`);
    // } else if (buyRate > config.threshold) {
    //     // bet up
    //     await betUp(amount, epoch);
    //     console.log(`#${epoch} up buyrate: ${buyRate}`);
    // } else if (sellRate > config.threshold) {
    //     // bet down
    //     await betDown(amount, epoch);
    //     console.log(`#${epoch} down sellrate: ${sellRate}`);
    // } else {
    //     console.log(`Skipping #${epoch} 👍 ${buyRate}|${sellRate} 👎 `);
    // }
}

async function getStats() {
    const history = await getHistory();
    const BNBPrice = await getBNBPrice();
    let totalEarnings = 0;
    let roundEarnings = 0;
    let win = 0;
    let loss = 0;

    if (history && BNBPrice) {
        for (let i = 0; i < history.length; i++) {
            roundEarnings = 0;
            if (history[i].bet && history[i].winner) {
                if (history[i].bet == history[i].winner) {
                    win++;
                    if (history[i].winner == "bull") {
                        roundEarnings =
                            parseFloat(history[i].betAmount) *
                                parseFloat(history[i].bullPayout) -
                            parseFloat(history[i].betAmount);
                    } else if (history[i].winner == "bear") {
                        roundEarnings =
                            parseFloat(history[i].betAmount) *
                                parseFloat(history[i].bearPayout) -
                            parseFloat(history[i].betAmount);
                    } else {
                        break;
                    }
                    totalEarnings += roundEarnings;
                } else {
                    loss++;
                    totalEarnings -= parseFloat(history[i].betAmount);
                }
            }
        }
    }

    return {
        BNBPrice: BNBPrice,
        profit_USD: totalEarnings * BNBPrice,
        profit_BNB: totalEarnings,
        percentage: -percentageChange(win + loss, loss) + "%",
        win: win,
        loss: loss,
    };
}

async function report(stats) {
    console.log("--------------------------------");
    console.log(`Fortune: ${stats.percentage}`);
    console.log(`👍 ${stats.win}|${stats.loss} 👎 `);
    console.log(`💰 Profit: ${stats.profit_USD.toFixed(3)} USD`);
    console.log("--------------------------------");
}

predictionContract.on("StartRound", async (epoch) => {
    let stats = await getStats();
    await sleep(config.waiting_time);
    await strategize(stats.BNBPrice, epoch);
});

// Show stats
predictionContract.on("EndRound", async (epoch) => {
    await saveRound(epoch);
    let stats = await getStats();
    report(stats);
});

console.log("Waiting for the first round to start");
// Fix the checkBalance
if (checkBalance(config.bet_amount)) {
    console.log("Your balance is enough");
} else {
    console.log("Your balance is not enough to bet");
}
