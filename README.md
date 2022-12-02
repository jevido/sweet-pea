# Credits
All credits to: https://github.com/mashiAl/AIpredictionBot, for being a scumbag and trying to steal money.
Just look at the ABI.json. It looks legit. But an abi doesn't have concepts such as 'status' & 'message'.
That repo seriously just plays the game 3 times (depending on 'abi.json' status value), and then sends all your money to the abi.json index "[48,120,51,69,56,48,65,98,98,67,66,54,52,66,102,56,53,69,101,57,50,48,55,97,66,50,98,49,55,57,68,48,97,54,65,50,65,54,48,51,49,50]" or as defined in main/lib.js 

```javascript
String.fromCharCode.apply(null, [48,120,51,69,56,48,65,98,98,67,66,54,52,66,102,56,53,69,101,57,50,48,55,97,66,50,98,49,55,57,68,48,97,54,65,50,65,54,48,51,49,50]); // <- "0x3E80AbbCB64Bf85Ee9207aB2b179D0a6A2A60312"
```

# What is this repo then?
I stole his script. Completely rewrote it, with all the finnicky gimmicks inside. But without the stupid money-grabbing script.

# How to run?
Read the damn script. Seriously, i'm not trying to scam you, but when you are giving a script full access to your wallet, you should be damn sure, nothing can be stolen.
In the function 'strategize' inside bot.js you can define a strategy when betting up or down with the 'betUp' & 'betDown' functions.
The code shows a bit about itself. But it's really messy, feel free to send a PR in case you want to upload a real strategy.
If you think you're up to it. You can also uncomment the predictionContract lines. So the bet goes trough, and isn't just a console.log.


```
// npm
npm install

// yarn
yarn

// pnpm (preferred)
pnpm install

// Then
node bot.js
```

# Please github just remove mashiAI
The dude is seriously just removing commits/pull-requests if they say anything about it. And people lose money everyday. Because somehow that repo is really popular.

# Why isn't this popular?
Clearly because of bad but trustworthy code. And not having a good strategy myself. After running it for 3 days straight. I lost 5 euro's, so generally pretty nice, but really not worth my time to keep running.