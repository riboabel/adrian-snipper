"use strict";

const web3 = require('../provider')();

let config = require('../config');
config = config[config.mode];

class Token {
    constructor(address) {
        this.address = address;
    }

    async name() {
        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        return await router.methods.name().call();
    }

    async symbol() {
        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        return await router.methods.symbol().call();
    }

    async getBalanceOf(accountAddress) {
        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        return await router.methods.balanceOf(accountAddress).call();
    }

    async decimals() {
        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        return await router.methods.decimals().call();
    }
}

module.exports = Token;