"use strict";

const web3 = require('./provider')();
const contracts = require('./contracts.json');

const getDecimals = async (address) => {
    let tokenRouter = await new web3.eth.Contract(contracts.Token.abi, address);

    return await tokenRouter.methods.decimals().call();
};

const getBalanceOf = async (tokenAddress, accountAddress) => {
    let tokenRouter = await new web3.eth.Contract(contracts.Token.abi, tokenAddress);
    let balance = await tokenRouter.methods.balanceOf(accountAddress).call(),
        decimals = await getDecimals(tokenAddress);

    return {
        balance: balance,
        decimals: decimals
    };
};

module.exports = {
    getDecimals: getDecimals,
    getBalanceOf: getBalanceOf
};
