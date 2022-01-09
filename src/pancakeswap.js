"use strict";

let config = require('../config');

config = config[config.mode];

let { address, abi } = config.contracts.Pancake;

let web3 = require('../provider')();

class PancakeSwap {
    constructor() {
        this.address = address;
        this.abi = abi;
        this._router = null;
    }

    async swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline) {
        return (await this._getRouter()).methods.swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    }

    async swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, path, to, deadline) {
        return (await this._getRouter()).methods.swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, path, to, deadline);
    }

    async swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline) {
        return (await this._getRouter()).methods.swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    }

    async addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline) {
        return (await this._getRouter()).methods.addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline);
    }

    async getAmountsOut(amountIn, path) {
        let c = await new web3.eth.Contract(this.abi, this.address);

        return await c.methods.getAmountsOut(amountIn, path).call();
    }

    async _getRouter() {
        if (null !== this._router) {
            return this._router;
        }

        this._router = await new web3.eth.Contract(this.abi, this.address);

        return this._router;
    }
}

module.exports = PancakeSwap;