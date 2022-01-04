"use strict";

const _ = require('underscore'),
    colors = require('colors'),
    moment = require('moment'),
    buyer = require('./buyer'),
    config = require('./config.json'),
    calcBNBPrice = require('./get-prices'),
    tokenData = require('./token'),
    wallet = require('./wallet.json'),
    { buyTokenWithBNB, butTokenWithBUSD, sellTokenToBNB } = require('./buyer');

// mainnet
//const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

// testnet
//const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

const token = require('./tokens.json'),
    targetWallet = require('./wallet.json');

let priceWhenBought = false;

async function prepareToken() {
    let data = await tokenData.getDecimals(token.address);

    console.log(`Preparando para ${token.name} (${data} decimales)...`);
}

function readyForBuying(bnbPrice, busdPrice) {
    let priceToCompare = config.tokenToCompare === 'BNB' ? bnbPrice : busdPrice;
    return (false === config.maxTokenPrice) || config.maxTokenPrice >= priceToCompare;
}

const watchBuyingPrices = () => new Promise(resolve => {
    let go = () => {
        calcBNBPrice(config.amountToSpend, token.address)
            .then(prices => {
                console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBNB)} BNB | ${colors.green(prices.priceInBUSD)} BUSD`);
                if (readyForBuying(prices.priceInBNB, prices.priceInBUSD)) {
                    return resolve([prices.priceInBNB, prices.priceInBUSD]);
                }
                go();
            })
            .catch(e => {
                console.log('Error watching prices for buying...');
                reject(e);
            })
    };

    go();
});

const buyToken = prices => new Promise((resolve, reject) =>  {
    let price = prices[config.buyWith === 'BNB' ? 0 : 1];
    let estimatedTokensToReceive = (config.amountToSpend / price) * 0.995;

    console.log(`Vamos a comprar ~${estimatedTokensToReceive} ${token.name} con ${config.amountToSpend} ${config.buyWith}...`);

    if (config.buyWith !== 'BNB') {
        throw new Error('No implementamos comprar con BUSD aún.');
    }

    buyTokenWithBNB(config.amountToSpend, token.address, targetWallet)
        .then(res => {
            priceWhenBought = price;

            console.log('Compra realizada con éxito!');
            console.log(`Tx: ${res.transactionHash}\n\n`);

            tokenData.getBalanceOf(token.address, wallet.address)
                .then(balance => {
                    console.log(`Se han comprado exactamente ${balance.balance / (10 ** balance.decimals)} ${token.name}`);

                    resolve(balance);
                })
                .catch(reject);
        })
        .catch(reject);
});

function readyForSell(priceInBNB, priceInBUSD) {
    let price = config.buyWith === 'BNB' ? priceInBNB : priceInBUSD;

    return (false === config.sellWhenPrice) || (priceWhenBought === false) || (config.sellWhenPrice * priceWhenBought >= price);
}

async function watchSellPrices() {
    let prices;
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;
    do {
        prices = await calcBNBPrice(tokensToSell, token.address);
        console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBNB)} BNB | ${colors.green(prices.priceInBUSD)} BUSD`);
    } while (!readyForSell(prices));

    return [prices.priceInBNB, prices.priceInBUSD];
}

async function sellToken() {
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;

    console.log(`Vamos a vender ~${tokensToSell / (10 ** balance.decimals)} ${token.name}...`);

    let res = await sellTokenToBNB(tokensToSell, token.address, wallet);

    console.log('Venta exitosa.');
    console.log(`Tx: ${res.transactionHash}`);
}

let init = async () => {
    try {
        if (false !== config.buy) {
            await prepareToken();
            let prices = await watchBuyingPrices();
            await buyToken(prices);
        }

        if (config.sellAfterBuy) {
            await watchSellPrices();
            await sellToken();
        }

        console.log('Proceso terminado');
    } catch (e) {
        console.log('Error');
        console.log(e.message);
    }
}

// let init = async () => new Promise(resolve => {
//     Promise.resolve()
//         .then(prepareToken)
//         .then(watchBuyingPrices)
//         .then(buyToken)
//         .then(() => {
//             if (config.sellAfterBuy) {
//                 return watchSellPrices()
//                     .then(sellToken)
//             }
//         })
//         .then(() => console.log('Proceso terminado.'))
//         .catch(e => {
//             console.log(e.message);
//             resolve(false);
//         });
// });

init();

