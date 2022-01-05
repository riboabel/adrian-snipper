"use strict";

// Helper script that buys ONLYONE token from a specified address specified on text file SPECIFY_ACCOUNTS_YOU_WANT_TO_BUY_FOR_HERE.json
// The amount is specified with 'originalAmountToBuyWith' variable in the source
// The JSON file should have an array with objects with 'address' field and 'privateKey' field.
// Buys ONLYONE for ${bnbAmount} BNB from pancakeswap for address ${targetAccounts[targetIndex].address}
// targetIndex is passed as an argument: process.argv.splice(2)[0]

const numeral = require('numeral');
const Tx = require('ethereumjs-tx').Transaction;
const Common = require('ethereumjs-common').default;
const routerAbi = require('./contracts.json').PancakeSwapFactory.abi;
const tokenData = require('./token');
const Big = require('big.js');

let web3 = require('./provider')();

const BSC_FORK = Common.forCustomChain(
    'mainnet',
    {
        name: 'Binance Smart Chain Mainnet',
        networkId: 56,
        chainId: 56,
        url: 'https://bsc-dataseed.binance.org/'
    },
    'istanbul',
);

let config = require('./config.json');
let pancakeSwapRouterAddress = '0x10ed43c718714eb63d5aa57b78b54704e256024e';

async function buyWithBNB(targetAccount, tokenAddress, amount) {

    let amountToBuyWith = web3.utils.toHex(amount);
    let privateKey = Buffer.from(targetAccount.privateKey, 'hex');
    let WBNBAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'; // WBNB token address

    let amountOutMin = '100' + Math.random().toString().slice(2,6);

    let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
    let data = contract.methods.swapExactETHForTokens(
        web3.utils.toHex(0),
        [WBNBAddress,
         tokenAddress],
        targetAccount.address,
        web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
    );

    let estimatedGas = await data.estimateGas({"value": web3.utils.toHex(amountToBuyWith)});

    console.log(`Gas estimado para la transacción: ${estimatedGas} GWEI...`);

    let count = await web3.eth.getTransactionCount(targetAccount.address);
    let rawTransaction = {
        "from": targetAccount.address,
        "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
        "gasLimit": web3.utils.toHex(config.gasLimit),
        "to": pancakeSwapRouterAddress,
        "value": web3.utils.toHex(amountToBuyWith),
        "data": data.encodeABI(),
        "nonce": web3.utils.toHex(count)
    };

    let transaction = new Tx(rawTransaction, { 'common': BSC_FORK });
    transaction.sign(privateKey);

    return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
}

async function buyWithBUSD(targetAccount, tokenAddress, amount) {

    let amountToBuyWith = web3.utils.toHex(amount * 1000000000000000000 + 1);
    let privateKey = Buffer.from(targetAccount.privateKey, 'hex');
    let BUSDAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56'; // BUSD token address

    let amountOutMin = '100' + Math.random().toString().slice(2,6);
    
    let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});

    let data = contract.methods.swapExactTokensForTokens(
        web3.utils.toHex(amountToBuyWith),
        web3.utils.toHex(amountOutMin),
        [BUSDAddress, tokenAddress],
        targetAccount.address,
        web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
    );

    let estimatedGas = await data.estimateGas({from: targetAccount.address, gas: 10});

    console.log(`Gas estimado para la compra: ${estimatedGas} GWEI...`);

    let count = await web3.eth.getTransactionCount(targetAccount.address);
    let rawTransaction = {
        "from": targetAccount.address,
        "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
        "gasLimit": web3.utils.toHex(config.gasLimit),
        "to": pancakeSwapRouterAddress,
        "value": web3.utils.toHex(amountToBuyWith),
        "data": data.encodeABI(),
        "nonce": web3.utils.toHex(count)
    };

    let transaction = new Tx(rawTransaction, { 'common': BSC_FORK });
    transaction.sign(privateKey);

    return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
}

async function buyWithToken(targetAccount, tokenAddress, amount) {

    let amountToBuyWith = web3.utils.toHex(amount);
    let privateKey = Buffer.from(targetAccount.privateKey, 'hex');
    let WBNBAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'; // WBNB token address

    let amountOutMin = '100' + Math.random().toString().slice(2,6);

    let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
    let data = contract.methods.swapETHForExactTokens(
        web3.utils.toHex(amountOutMin),
        [tokenAddress, WBNBAddress],
        targetAccount.address,
        web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
    );

    let estimatedGas = await data.estimateGas({"value": web3.utils.toHex(amountToBuyWith)});

    console.log(`Gas estimado para la transacción: ${estimatedGas} GWEI...`);

    let count = await web3.eth.getTransactionCount(targetAccount.address);
    let rawTransaction = {
        "from": targetAccount.address,
        "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
        "gasLimit": web3.utils.toHex(config.gasLimit),
        "to": pancakeSwapRouterAddress,
        "value": web3.utils.toHex(amountToBuyWith),
        "data": data.encodeABI(),
        "nonce": web3.utils.toHex(count)
    };

    let transaction = new Tx(rawTransaction, { 'common': BSC_FORK });
    transaction.sign(privateKey);

    return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
}

module.exports = {
    buyTokenWithBNB: (amountToPayInBNB, tokenAddress, targetAccount) => new Promise((resolve, reject) => {
        let originalAmountToBuyWith = numeral(amountToPayInBNB).format('0.00000000');
        let bnbAmount = web3.utils.toWei(originalAmountToBuyWith, 'ether');

        buyWithBNB(targetAccount, tokenAddress, bnbAmount)
            .then(resolve)
            .catch(reject);
    }),
    buyTokenWithBUSD: async (amountToPayInBUSD, tokenAddress, targetAccount) => {
        let BUSDAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56';

        let tokensToSell = (new Big(amountToPayInBUSD)).times((new Big(10)).pow(18)).toString();

        let privateKey = Buffer.from(targetAccount.privateKey, 'hex');

        let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
        let data = contract.methods.swapExactTokensForTokens(
            web3.utils.toHex(tokensToSell),
            web3.utils.toHex(0),
            [BUSDAddress, tokenAddress],
            targetAccount.address,
            web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
        );

        let estimatedGas = await data.estimateGas({gas: 10});

        console.log(`Gas estimado para la venta: ${estimatedGas} GWEI...`);

        let count = await web3.eth.getTransactionCount(targetAccount.address);
        let rawTransaction = {
            "from": targetAccount.address,
            "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
            "gasLimit": web3.utils.toHex(config.gasLimit),
            "to": pancakeSwapRouterAddress,
            "data": data.encodeABI(),
            "nonce": web3.utils.toHex(count)
        };

        let transaction = new Tx(rawTransaction, {'common': BSC_FORK});

        transaction.sign(privateKey);

        return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
    },
    sellTokenToWBNB: async (amountToPayInToken, tokenAddress, targetAccount) => {
        let WBNBAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

        let tokensToSell = amountToPayInToken;

        let privateKey = Buffer.from(targetAccount.privateKey, 'hex');

        let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
        let data = contract.methods.swapExactTokensForTokens(
            web3.utils.toHex(tokensToSell),
            web3.utils.toHex(0),
            [tokenAddress, WBNBAddress],
            targetAccount.address,
            web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
        );

        let estimatedGas = await data.estimateGas({gas: 10});

        console.log(`Gas estimado para la venta: ${estimatedGas} GWEI...`);

        let count = await web3.eth.getTransactionCount(targetAccount.address);
        let rawTransaction = {
            "from": targetAccount.address,
            "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
            "gasLimit": web3.utils.toHex(config.gasLimit),
            "to": pancakeSwapRouterAddress,
            "data": data.encodeABI(),
            "nonce": web3.utils.toHex(count)
        };

        let transaction = new Tx(rawTransaction, {'common': BSC_FORK});

        transaction.sign(privateKey);

        return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
    },

    sellTokenToBNB: async (tokensToSell, tokenAddress, targetAccount) => {
        let WBNBAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';

        let privateKey = Buffer.from(targetAccount.privateKey, 'hex');

        let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
        let data = contract.methods.swapExactTokensForETH(
            web3.utils.toHex(tokensToSell),
            web3.utils.toHex(0),
            [tokenAddress, WBNBAddress],
            targetAccount.address,
            web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
        );

        let estimatedGas = await data.estimateGas({gas: 10});

        console.log(`Gas estimado para la venta: ${estimatedGas} GWEI...`);

        let count = await web3.eth.getTransactionCount(targetAccount.address);
        let rawTransaction = {
            "from": targetAccount.address,
            "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
            "gasLimit": web3.utils.toHex(config.gasLimit),
            "to": pancakeSwapRouterAddress,
            "data": data.encodeABI(),
            "nonce": web3.utils.toHex(count)
        };

        let transaction = new Tx(rawTransaction, {'common': BSC_FORK});

        transaction.sign(privateKey);

        return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
    },
    sellTokenToBUSD: async (amountToPayInToken, tokenAddress, targetAccount) => {
        let BUSDAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56';

        let tokensToSell = amountToPayInToken;

        let privateKey = Buffer.from(targetAccount.privateKey, 'hex');

        let contract = new web3.eth.Contract(routerAbi, pancakeSwapRouterAddress, {from: targetAccount.address});
        let data = contract.methods.swapExactTokensForTokens(
            web3.utils.toHex(tokensToSell),
            web3.utils.toHex(0),
            [tokenAddress, BUSDAddress],
            targetAccount.address,
            web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3),
        );

        let estimatedGas = await data.estimateGas({gas: 10});

        console.log(`Gas estimado para la venta: ${estimatedGas} GWEI...`);

        let count = await web3.eth.getTransactionCount(targetAccount.address);
        let rawTransaction = {
            "from": targetAccount.address,
            "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
            "gasLimit": web3.utils.toHex(config.gasLimit),
            "to": pancakeSwapRouterAddress,
            "data": data.encodeABI(),
            "nonce": web3.utils.toHex(count)
        };

        let transaction = new Tx(rawTransaction, {'common': BSC_FORK});

        transaction.sign(privateKey);

        return await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
    }
};