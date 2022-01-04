"use strict";

const Web3 = require('web3');
const contracts = require('./contracts.json');

let testing = true;

const web3 = new Web3(new Web3.providers.HttpProvider(testing ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443'));

async function getTokenDecimals(tokenAddress) {
    let tokenRouter = await new web3.eth.Contract(contracts.Token.abi, tokenAddress);
    return await tokenRouter.methods.decimals().call();
}
async function init() {
    let tokenAddress = '0x707C689FFcA3FB28a078a8eD44F4F95F3d2F4C02';
    console.log(await getTokenDecimals(tokenAddress));
}

init();