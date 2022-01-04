"use strict";

const _ = require('underscore'),
    Big = require('big.js'),
    colors = require('colors'),
    moment = require('moment'),
    buyer = require('./buyer'),
    config = require('./config.json'),
    calcBNBPrice = require('./get-prices'),
    tokenData = require('./token'),
    { buyTokenWithBNB, butTokenWithBUSD, sellTokenToBNB } = require('./buyer');

const token = require('./tokens.json'),
    wallet = require('./wallet.json');

let priceWhenBought = false;

async function prepareToken() {
    let data = await tokenData.getDecimals(token.address);

    console.log(`Preparando proceso para ${token.name}...`);
    console.log(`Contrato ${token.address}`);
    console.log(`${data} decimales`);
}

function readyForBuying(bnbPrice, busdPrice) {
    let priceToCompare = new Big(config.tokenToCompare === 'BNB' ? bnbPrice : busdPrice);

    if (false === config.maxTokenPrice) {
        return true;
    }

    let maxTokenPrice = new Big(config.maxTokenPrice);

    return maxTokenPrice.gte(priceToCompare);
}

const watchBuyingPrices = async () => {
    let prices, oldPrices = [new Big(0), new Big(0)];

    do {
        prices = await calcBNBPrice(config.amountToSpend, token.address);
        if (!oldPrices[0].eq(prices.priceInBNB) || !oldPrices[1].eq(prices.priceInBUSD)) {
            oldPrices[0] = new Big(prices.priceInBNB);
            oldPrices[1] = new Big(prices.priceInBUSD);
            console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBNB)} BNB | ${colors.green(prices.priceInBUSD)} BUSD`);
        }
    } while (!readyForBuying(prices.priceInBNB, prices.priceInBUSD));

    return [prices.priceInBNB, prices.priceInBUSD];
};

const buyToken = prices => new Promise((resolve, reject) =>  {
    let price = prices[config.buyWith === 'BNB' ? 0 : 1];
    let estimatedTokensToReceive = (config.amountToSpend / price) * 0.995;

    console.log(`Vamos a comprar ~${estimatedTokensToReceive} ${token.name} con ${config.amountToSpend} ${config.buyWith}...`);

    if (config.buyWith !== 'BNB') {
        throw new Error('No implementamos comprar con BUSD aún.');
    }

    buyTokenWithBNB(config.amountToSpend, token.address, wallet)
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
    let price = new Big(config.buyWith === 'BNB' ? priceInBNB : priceInBUSD);

    if ((false === config.sellWhenPrice) || (priceWhenBought === false)) {
        return true;
    }

    let sellWhenPrice = new Big(config.sellWhenPrice);

    return (new Big(priceWhenBought)).times(sellWhenPrice).gte(price);
}

async function watchSellPrices() {
    let prices, oldPrices = [new Big(0), new Big(0)];
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;
    do {
        prices = await calcBNBPrice(tokensToSell, token.address);
        if (!oldPrices[0].eq(prices.priceInBNB) || !oldPrices[1].eq(prices.priceInBUSD)) {
            oldPrices[0] = new Big(prices.priceInBNB);
            oldPrices[1] = new Big(prices.priceInBUSD);
            console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBNB)} BNB | ${colors.green(prices.priceInBUSD)} BUSD`);
        }
    } while (!readyForSell(prices.priceInBNB, prices.priceInBUSD));

    return [prices.priceInBNB, prices.priceInBUSD];
}

async function sellToken() {
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;

    console.log(`Vamos a vender ${(new Big(tokensToSell)).div((new Big(10)).pow(Number(balance.decimals))).toString()} ${token.name}...`);

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
            let prices = await watchSellPrices();
            await sellToken(prices);
        }

        console.log('Proceso terminado');
    } catch (e) {
        console.log('Error');
        console.log(e.message);
        console.log(e);
    }
}

init();

