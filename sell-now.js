"use strict";

const Big = require('big.js');

const { sellTokenToBNB } = require('./buyer');

const token = require('./tokens.json'),
    tokenData = require('./token'),
    wallet = require('./wallet.json');

async function sellToken() {
    let balance = await tokenData.getBalanceOf(token.address, wallet.address);
    let tokensToSell = balance.balance;

    console.log(`Vamos a vender ${(new Big(tokensToSell)).div((new Big(10)).pow(Number(balance.decimals))).toString()} ${token.name}...`);

    let res = await sellTokenToBNB(tokensToSell, token.address, wallet);

    console.log('Venta exitosa.');
    console.log(`Tx: ${res.transactionHash}`);
}

let init = async () => {
    await sellToken();
};

init();