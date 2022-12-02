const fs = require("fs");
const Web3 = require("web3");
const { JsonRpcProvider } = require("@ethersproject/providers");
const { Wallet } = require("@ethersproject/wallet");
const { Contract, utils } = require("ethers");
const _ = require("lodash");
const Big = require("big.js");
const fetch = require("cross-fetch");

const config = require("./config.json");
// https://bscscan.com/address/0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA#code
const abi = require("./abi.json");

const w = new Web3("https://bsc-dataseed.binance.org/");
const wallet = w.eth.accounts.wallet.add(
    w.eth.accounts.privateKeyToAccount(config.privatekey)
);
w.eth.defaultAccount = w.eth.accounts.privateKeyToAccount(
    config.privatekey
).address;

const signer = new Wallet(
    config.privatekey,
    new JsonRpcProvider("https://bsc-dataseed.binance.org/")
);

const contract = new Contract(
    "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA",
    abi,
    signer
);

const reduceWaitingTimeByTwoBlocks = (waitingTime) => {
    if (waitingTime <= 6000) {
        return waitingTime;
    }
    return waitingTime - 6000;
};

const checkBalance = async (amount) => {
    let balance = await w.eth.getBalance(wallet.address);
    let wei = Web3.utils.fromWei(balance, "ether");

    return wei < parseFloat(amount);
};

// CheckResult won't be implemented because
// The confirmContract function was the malicious code, and abi.json[index] was a literal encoding of the fake wallet

const getHistory = async (fileName) => {
    let history = fileName ? fileName : await getHistoryName();
    let path = `./history/${history}.json`;
    try {
        if (fs.existsSync(path)) {
            let history, historyParsed;
            try {
                history = fs.readFileSync(path);
                historyParsed = JSON.parse(history);
            } catch (e) {
                console.log("Error reading history:", e);
                return;
            }
            return historyParsed;
        } else {
            return;
        }
    } catch (err) {
        console.error(err);
    }
};

// misc
const percentageChange = (a, b) => {
    if (a == 0 && b == 0) {
        return 0;
    }
    return ((b - a) * 100) / a;
};
const percentage = (a, b) => {
    return parseInt((100 * a) / (a + b));
};
const getHistoryName = async () => {
    let date = new Date();
    let day = date.getDate();
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let year = date.getFullYear();

    let fullDate = `${year}${month}${day}`;
    return fullDate;
};

const getBNBPrice = async () => {
    const apiUrl = "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT";
    try {
        const res = await fetch(apiUrl);
        if (res.status >= 400) {
            throw new Error("Bad response from server");
        }
        const price = await res.json();
        return parseFloat(price.price);
    } catch (err) {
        console.error("Unable to connect to Binance API", err);
    }
};

const saveRound = async (round, arr) => {
    let roundData = arr ? arr : await getRoundData(round);
    let historyName = await getHistoryName();

    let path = `./history/${historyName}.json`;
    try {
        if (fs.existsSync(path)) {
            let updated, history, merged, historyParsed;
            try {
                history = fs.readFileSync(path);
                historyParsed = JSON.parse(history);
                merged = _.merge(
                    _.keyBy(historyParsed, "round"),
                    _.keyBy(roundData, "round")
                );
                updated = _.values(merged);
            } catch (e) {
                console.log(e);
                return;
            }
            fs.writeFileSync(path, JSON.stringify(updated), "utf8");
        } else {
            fs.writeFileSync(path, JSON.stringify(roundData), "utf8");
        }
    } catch (err) {
        console.error(err);
    }
};

const getRoundData = async (round) => {
    try {
        const data = await contract.functions.rounds(round);
        const closePrice = data.closePrice;
        const lockPrice = data.lockPrice;
        const bullAmount = data.bullAmount;
        const bearAmount = data.bearAmount;
        const totalAmount = new Big(data.totalAmount);
        const bullPayout = totalAmount.div(bullAmount).round(3).toString();
        const bearPayout = totalAmount.div(bearAmount).round(3).toString();

        const parsedRound = [
            {
                round: round.toString(),
                openPrice: utils.formatUnits(data.lockPrice, "8"),
                closePrice: utils.formatUnits(data.closePrice, "8"),
                bullAmount: utils.formatUnits(data.bullAmount, "18"),
                bearAmount: utils.formatUnits(data.bearAmount, "18"),
                bullPayout: bullPayout,
                bearPayout: bearPayout,
                winner: closePrice.gt(lockPrice) ? "bull" : "bear",
            },
        ];
        return parsedRound;
    } catch (e) {
        console.log(e);
        return null;
    }
};

const predictionContract = contract.connect(signer);

module.exports = {
    getHistory,
    checkBalance,
    percentage,
    percentageChange,
    getBNBPrice,
    saveRound,
    predictionContract,
    reduceWaitingTimeByTwoBlocks,
};
