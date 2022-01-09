"use strict";

const Big = require('big.js');

const Token = require('./token');

const getAmountTokenHumanReadable = async (tokenAddress, amount) => {
    let token = new Token(tokenAddress);

    let decimals = await token.decimals();

    return (new Big(amount)).div((new Big(10)).pow(Number(decimals)));
};

const addressesAreEquals = (first, second) => {
    return first.toLowerCase() === second.toLowerCase();
};

module.exports = {
    getAmountTokenHumanReadable: getAmountTokenHumanReadable,
    addressesAreEquals: addressesAreEquals
};
