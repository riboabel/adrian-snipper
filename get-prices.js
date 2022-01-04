"use strict";

const Big = require('big.js');

const contracts = require('./contracts.json');
const token = require('./token');

const WBNBTokenAddress  = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; //WBNB
const USDTokenAddress  = '0x55d398326f99059fF775485246999027B3197955'; //USDT
const BUSDTokenAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'; //BUSD

let web3 = require('./provider')();
let router = new web3.eth.Contract(contracts.PancakeSwapFactory.abi, contracts.PancakeSwapFactory.address);

function setDecimals( number, decimals ){
    number = number.toString();
    let numberAbs = number.split('.')[0];
    let numberDecimals = number.split('.')[1] ? number.split('.')[1] : '';
    while( numberDecimals.length < decimals ){
        numberDecimals += "0";
    }
    return numberAbs + numberDecimals;
}

async function calcTokenPriceInBNB(tokensToSell, tokenAddress) {
    let tokenDecimals = await token.getDecimals(tokenAddress);

    tokensToSell = setDecimals(tokensToSell, tokenDecimals);
    let amountOut;
    try {
        amountOut = await router.methods.getAmountsOut(tokensToSell, [tokenAddress, WBNBTokenAddress]).call();
        amountOut =  web3.utils.fromWei(amountOut[1]);
    } catch (error) {}
    if (!amountOut) return 0;

    return amountOut;
}

async function calcTokenPriceInBUSD(tokensToSell, tokenAddress) {
    let tokenDecimals = await token.getDecimals(tokenAddress);
    
    tokensToSell = setDecimals(tokensToSell, tokenDecimals);
    let amountOut;
    try {
        amountOut = await router.methods.getAmountsOut(tokensToSell, [tokenAddress ,BUSDTokenAddress]).call();
        amountOut =  web3.utils.fromWei(amountOut[1]);
    } catch (error) {}
    if (!amountOut) return 0;

    return amountOut;
}

async function calcBNBPrice(){
    let bnbToSell = web3.utils.toWei("1", "ether") ;
    let amountOut;
    try {
        amountOut = await router.methods.getAmountsOut(bnbToSell, [WBNBTokenAddress ,USDTokenAddress]).call();
        amountOut =  web3.utils.fromWei(amountOut[1]);
    } catch (error) {}
    if(!amountOut) return 0;

    return amountOut;
}

module.exports = (amountToSpend, tokenAddress) => new Promise(resolve => {
    Promise.all([
        calcTokenPriceInBNB(amountToSpend, tokenAddress),
        calcTokenPriceInBUSD(amountToSpend, tokenAddress)
    ])
        .then(r => {
            let bnb = new Big(r[0]), busd = new Big(r[1]);

            resolve({
                priceInBNB: bnb.div(amountToSpend).toString(),
                priceInBUSD: busd.div(amountToSpend).toString()
            });
        });
});