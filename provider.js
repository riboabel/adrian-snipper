"use strict";

const Web3 = require('web3');

const config = require('./config.json');

// mainnet
//const web3 = new Web3('https://bsc-dataseed1.binance.org:443');

// testnet
//const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');

let web3 = new Web3(config.testing ? 'https://data-seed-prebsc-1-s1.binance.org:8545' : 'https://bsc-dataseed1.binance.org:443');

module.exports = () => web3;