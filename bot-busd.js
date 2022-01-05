"use strict";

const _ = require('underscore'),
    Big = require('big.js'),
    colors = require('colors'),
    moment = require('moment'),
    config = require('./config.json'),
    calcBNBPrice = require('./get-prices'),
    tokenData = require('./token'),
    { buyTokenWithBNB, buyTokenWithBUSD, sellTokenToBNB, sellTokenToBUSD } = require('./buyer');

const token = require('./tokens.json'),
    wallet = require('./wallet.json');

let priceWhenBought = false;

async function prepareToken() {
    let data = await tokenData.getDecimals(token.address);

    console.log(`Preparando proceso para ${token.name} con BUSD...`);
    console.log(`Contrato ${token.address}`);
    console.log(`${data} decimales`);
    console.log('\n');
}

function readyForBuying(bnbPrice, busdPrice) {
    if (busdPrice == 0) {
        return false;
    }

    let priceToCompare = new Big(config.tokenToCompare === 'BNB' ? bnbPrice : busdPrice);

    if (false === config.maxTokenPrice) {
        return true;
    }

    let maxTokenPrice = new Big(config.maxTokenPrice);

    return maxTokenPrice.gte(priceToCompare);
}

async function watchBuyingPrices() {
    let prices, oldPrices = [new Big(0), new Big(0)];

    do {
        prices = await calcBNBPrice(config.amountToSpend, token.address);
        if (prices.priceInBUSD == 0) {
            console.log('Token sin liquidez aun.');
        } else if (!oldPrices[1].eq(prices.priceInBUSD)) {
            oldPrices[1] = new Big(prices.priceInBUSD);
            console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBUSD)} BUSD`);
        }
    } while (!readyForBuying(prices.priceInBNB, prices.priceInBUSD));

    return [prices.priceInBNB, prices.priceInBUSD];
}

async function buyToken(prices) {
    let price = prices[config.buyWith === 'BNB' ? 0 : 1];
    let estimatedTokensToReceive = (config.amountToSpend / price) * 0.995;

    console.log(`Vamos a comprar ~${estimatedTokensToReceive} ${token.name} con ${config.amountToSpend} ${config.buyWith}...`);

    let res;
    if (config.buyWith === 'BNB') {
        res = await buyTokenWithBNB(config.amountToSpend, token.address, wallet);
    } else {
        res = await buyTokenWithBUSD(config.amountToSpend, token.address, wallet);
    }

    priceWhenBought = prices[config.tokenToCompare === 'BNB' ? 0 : 1];

    console.log('Compra realizada con éxito!');
    console.log(`Se compró a ${prices[1]} BUSD`);
    console.log(`Tx: ${res.transactionHash}\n\n`);

    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    console.log(`Se han comprado exactamente ${balance.balance / (10 ** balance.decimals)} ${token.name}`);

    return balance;
}

function readyForSell(priceInBNB, priceInBUSD) {
    let price = new Big(config.tokenToCompare === 'BNB' ? priceInBNB : priceInBUSD);

    if ((false === config.sellWhenPrice) || (priceWhenBought === false)) {
        return true;
    }

    let sellWhenPrice = new Big(config.sellWhenPrice);

    return ((new Big(priceWhenBought)).times(sellWhenPrice).lte(price));
}

async function watchSellPrices() {
    let oldPrices = [new Big(0), new Big(0)];

    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;

    let prices = await calcBNBPrice(config.amountToSpend, token.address);

    if ((false !== config.sellWhenPrice) && (priceWhenBought !== false)) {
        console.log(`Comprado en ${priceWhenBought} BUSD. Precio actual: ${prices.priceInBNB}. Tiene que llegar a ${(new Big(priceWhenBought)).times(config.sellWhenPrice).toString()}`);
        console.log('\n\n');
        console.log('Vigilando el precio...')
    }

    do {
        prices = await calcBNBPrice(config.amountToSpend, token.address);
        if (!oldPrices[0].eq(prices.priceInBNB) || !oldPrices[1].eq(prices.priceInBUSD)) {
            oldPrices[0] = new Big(prices.priceInBNB);
            oldPrices[1] = new Big(prices.priceInBUSD);
            console.log(`${moment().format('H:mm:ss').blue}: ${token.name.green}: ${colors.green(prices.priceInBNB)} BNB`);
        }
    } while (!readyForSell(prices.priceInBNB, prices.priceInBUSD));

    return [prices.priceInBNB, prices.priceInBUSD];
}

async function sellToken() {
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;

    console.log(`Vamos a vender ${(new Big(tokensToSell)).div((new Big(10)).pow(Number(balance.decimals))).toString()} ${token.name}...`);

    let res;
    if (config.buyWith == 'BNB') {
        res = await sellTokenToBNB(tokensToSell, token.address, wallet);
    } else {
        res = await sellTokenToBUSD(tokensToSell, token.address, wallet);
    }

    console.log('Venta exitosa.');
    console.log(`Tx: ${res.transactionHash}`);
}

const init = async () => {
    try {
        await prepareToken();

        if (false !== config.buy) {
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
};

init();

