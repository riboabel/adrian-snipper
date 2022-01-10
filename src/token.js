"use strict";

const web3 = require('../provider')();

let config = require('../config');
config = config[config.mode];

class Token {
    constructor(address) {
        this.address = address;
        this._name = null;
        this._symbol = null;
        this._decimals = null;
    };

    async name() {
        if (null !== this._name) {
            return this._name;
        }

        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);
        this._name = await router.methods.name().call();

        return this._name;
    }

    async symbol() {
        if (null !== this._symbol) {
            return this._symbol;
        }

        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);
        this._symbol = await router.methods.symbol().call();

        return this._symbol;
    }

    async getBalanceOf(accountAddress) {
        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        return await router.methods.balanceOf(accountAddress).call();
    }

    async decimals() {
        if (null !== this._decimals) {
            return this._decimals;
        }

        let router = await new web3.eth.Contract(config.contracts.Token.abi, this.address);

        this._decimals = await router.methods.decimals().call();

        return this._decimals;
    }
}

module.exports = Token;