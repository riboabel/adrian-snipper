'use strict';

const Web3 = require('web3');
const moment = require('moment');
const Big = require('big.js');
const Common = require('ethereumjs-common').default;
const Tx = require('ethereumjs-tx').Transaction;

const Token = require('./src/token');
const PancakeSwap = require('./src/pancakeswap');
const utils = require('./src/utils');
const provider = require('./provider');

const getConfig = () => {
    let config = require('./config');

    return config[config.mode];
};

let web3, token, pancake, config, tokenDecimals, bsc_fork, boughtWith, boughtPrice;

const getBuyPriceBNB = async () => {
    if (config.buyWith === 'BUSD') {
        return '0';
    }

    let amountToSpend = Web3.utils.toWei(config.amountsToSpend.BNB.toString());
    let amountOut = 0;

    try {
        let amounts = await pancake.getAmountsOut(
            Web3.utils.toHex(amountToSpend),
            [
                config.tokens.WBNB.address,
                config.tokens.MiToken.address
            ]
        );

        amountOut = amounts[1];
    } catch (e) {
        return null;
    }

    return (new Big(amountToSpend)).div(amountOut).round(10).toString();
};

const getBuyPriceBUSD = async () => {
    if (config.buyWith === 'BNB') {
        return '0';
    }

    let amountToSpend = (new Big(config.amountsToSpend.BUSD)).times((new Big(10)).pow(tokenDecimals)).toString();
    let amountOut = 0;

    try {
        let amounts = await pancake.getAmountsOut(
            Web3.utils.toHex(amountToSpend),
            [
                config.tokens.BUSD.address,
                config.tokens.MiToken.address
            ]
        );

        amountOut = amounts[1];
    } catch (e) {
        return null;
    }

    return (new Big(amountToSpend)).div(amountOut).round(10).toString();
};

const canBuy = (prices) => {
    if (((config.buyWith === 'BNB') || (config.buyWith === 'both')) && (prices.BNB !== null) && ((new Big(prices.BNB)).lte(config.maxPricesToBuy.BNB))) {
        return 'BNB';
    } else if (((config.buyWith === 'BUSD') || (config.buyWith === 'both')) && (prices.BUSD !== null) && ((new Big(prices.BUSD)).lte(config.maxPricesToBuy.BUSD))) {
        return 'BUSD';
    }

    return false;
};

const getSellPriceBNB = async (amountToSell) => {
    if (boughtWith === 'BUSD' ) {
        return '0';
    }

    let amountOut = 0;

    try {
        let amounts = await pancake.getAmountsOut(
            Web3.utils.toHex(amountToSell),
            [
                config.tokens.MiToken.address,
                config.tokens.WBNB.address
            ]
        );

        amountOut = amounts[1];
    } catch (e) {
        return null;
    }

    return (new Big(amountOut)).div(amountToSell).round(10).toString();
};

const getSellPriceBUSD = async (amountToSell) => {
    if (boughtWith === 'BNB' ) {
        return '0';
    }

    let amountOut = 0;

    try {
        let amounts = await pancake.getAmountsOut(
            Web3.utils.toHex(amountToSell),
            [
                config.tokens.MiToken.address,
                config.tokens.BUSD.address
            ]
        );

        amountOut = amounts[1];
    } catch (e) {
        return null;
    }

    return (new Big(amountOut)).div(amountToSell).round(10).toString();
};

const canSell = prices => {
    if (false === config.sellWhenPriceIs) {
        return false;
    }

    let r =
        ((boughtWith === 'BNB') && (new Big(prices.BNB)).gte((new Big(boughtPrice)).times(config.sellWhenPriceIs)))
        ||
        ((boughtWith === 'BUSD') && (new Big(prices.BUSD)).gte((new Big(boughtPrice)).times(config.sellWhenPriceIs)));

    return r;
};

const init = async() => {
    config = getConfig();
    web3 = provider();
    token = await new Token(config.tokens.MiToken.address);

    try {
        tokenDecimals = Number(await token.decimals());
    } catch (e) {
        console.log(`${token.address} no parece ser un token válido.`);
        process.exit(1);
    }

    bsc_fork = Common.forCustomChain(config['BSC-FORK'].name, config['BSC-FORK'].options, config['BSC-FORK'].mode);
    pancake = new PancakeSwap();

    console.log('Iniciando proceso...');

    await (async() => {
        console.log(`Usaremos ${config.tokens.MiToken.name} (${tokenDecimals} decimales) para comprar y vender.`);
        console.log(`Compraremos con ${config.buyWith === 'both' ? 'BNB ó BUSD' : config.buyWith}.`);
        console.log('--- *** ---');
    })();

    boughtWith = await (async () => {
        let prices = {BNB: 0, BUSD: 0};
        let buyWith;

        do {
            let s = [];
            if ((config.buyWith === 'BNB') || (config.buyWith === 'both')) {
                prices.BNB = await getBuyPriceBNB();
                s.push(`BNB: ${null !== prices.BNB ? prices.BNB : '<sin liquidez>'}`);
            }
            if ((config.buyWith === 'BUSD') || (config.buyWith === 'both')) {
                prices.BUSD = await getBuyPriceBUSD();
                s.push(`BUSD: ${null !== prices.BUSD ? prices.BUSD : '<sin liquidez>'}`);
            }

            console.log(`${moment().format('HH:mm:ss')}: ${s.join(' | ')}`);
        } while (false === (buyWith = canBuy(prices)));

        boughtPrice = prices[buyWith];

        return buyWith;
    })();

    if (config.buyWith === 'both') {
        console.log(`Compraremos con ${boughtWith}`);
    } else {
        console.log(`Compraremos!!!!`);
    }

    let tokensReceived = await (async() => {
        let tx, done = false;

        do {
            if (boughtWith === 'BNB') {
                let amountToSpend = Web3.utils.toWei(config.amountsToSpend.BNB.toString());
                let callData = await pancake.swapExactETHForTokensSupportingFeeOnTransferTokens(
                    Web3.utils.toHex(0),
                    [config.tokens.WBNB.address, token.address],
                    config.wallet.address,
                    Web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
                );

                let estimatedGas = await callData.estimateGas({"value": Web3.utils.toHex(amountToSpend)});
                console.log(`Gas estimado: ${estimatedGas} GWEI`);

                let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
                let count = await web3.eth.getTransactionCount(config.wallet.address);
                let rawTransaction = {
                    "from": config.wallet.address,
                    "gasPrice": Web3.utils.toHex(config.gasPrice * 1000000000),
                    "gasLimit": Web3.utils.toHex(config.gasLimit),
                    "to": pancake.address,
                    "value": Web3.utils.toHex(amountToSpend),
                    "data": callData.encodeABI(),
                    "nonce": Web3.utils.toHex(count)
                };

                let transaction = new Tx(rawTransaction, {'common': bsc_fork});
                transaction.sign(privateKey);

                try {
                    tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
                    done = true;
                } catch (e) {
                    console.log(`Compra no realizada. ${e.message}`);
                    console.log('Intentamos otra vez...');
                }
            } else {
                let amountToSpend = (new Big(config.amountsToSpend.BUSD)).times((new Big(10)).pow(tokenDecimals)).toString();
                let callData = await pancake.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                    Web3.utils.toHex(amountToSpend),
                    Web3.utils.toHex(0),
                    [config.tokens.BUSD.address, token.address],
                    config.wallet.address,
                    Web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
                );

                let estimatedGas = await callData.estimateGas({"from": config.wallet.address});
                console.log(`Gas estimado: ${estimatedGas} GWEI`);

                let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
                let count = await web3.eth.getTransactionCount(config.wallet.address);
                let rawTransaction = {
                    "from": config.wallet.address,
                    "gasPrice": Web3.utils.toHex(config.gasPrice * 1000000000),
                    "gasLimit": Web3.utils.toHex(config.gasLimit),
                    "to": pancake.address,
                    "data": callData.encodeABI(),
                    "nonce": Web3.utils.toHex(count)
                };

                let transaction = new Tx(rawTransaction, {'common': bsc_fork});
                transaction.sign(privateKey);

                try {
                    tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
                    done = true;
                } catch (e) {
                    console.log(`Compra no realizada. ${e.message}`);
                    console.log('Intentamos otra vez...');
                }
            }
        } while (!done);

        console.log('Compra exitosa');
        console.log(`Tx: ${tx.transactionHash}`);
        console.log(`Gas usado: ${tx.gasUsed}`);

        return await (async() => {
            let returnValue;

            let transferEventSignature = Web3.utils.keccak256('Transfer(address,address,uint256)');

            for (const log of tx.logs) {
                if (log.topics[0] !== transferEventSignature) {
                    continue; // only interested in Transfer events
                }

                if (!utils.addressesAreEquals(log.address, token.address)) {
                    continue;
                }

                returnValue = web3.eth.abi.decodeParameter('uint256', log.data);
            }

            return returnValue;
        })();
    })();

    console.log(`${(new Big(tokensReceived)).div((new Big(10)).pow(tokenDecimals)).toString()} ${config.tokens.MiToken.name} recbidos.`);
    console.log('--- *** ---');
    console.log('\n\n\n');

    console.log('Vigilando precios para la venta');
    await (async() => {
        let prices = {BNB: 0, BUSD: 0};

        do {
            let s = [];
            if (boughtWith === 'BNB') {
                prices.BNB = await getSellPriceBNB(tokensReceived);
                s.push(`BNB: ${prices.BNB}`);
            } else {
                prices.BUSD = await getSellPriceBUSD(tokensReceived);
                s.push(`BUSD: ${prices.BUSD}`);
            }

            console.log(s.join(' | '));
        } while (!canSell(prices));
    })();

    console.log('Venderemos...');

    await (async() => {
        let tx, done = false;

        do {
            if (boughtWith === 'BNB') {
                let callData = await pancake.swapExactTokensForETHSupportingFeeOnTransferTokens(
                    Web3.utils.toHex(tokensReceived),
                    Web3.utils.toHex(0),
                    [token.address, config.tokens.WBNB.address],
                    config.wallet.address,
                    Web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
                );

                let estimatedGas = await callData.estimateGas({"from": config.wallet.address});
                console.log(`Gas estimado: ${estimatedGas} GWEI`);

                let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
                let count = await web3.eth.getTransactionCount(config.wallet.address);
                let rawTransaction = {
                    "from": config.wallet.address,
                    "gasPrice": Web3.utils.toHex(config.gasPrice * 1000000000),
                    "gasLimit": Web3.utils.toHex(config.gasLimit),
                    "to": pancake.address,
                    "data": callData.encodeABI(),
                    "nonce": Web3.utils.toHex(count)
                };

                let transaction = new Tx(rawTransaction, {'common': bsc_fork});
                transaction.sign(privateKey);

                try {
                    tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
                    done = true;
                } catch (e) {
                    console.log(`Venta no realizada. ${e.message}`);
                    console.log('Intentamos otra vez...');
                }
            } else {
                let callData = await pancake.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                    Web3.utils.toHex(tokensReceived),
                    Web3.utils.toHex(0),
                    [token.address, config.tokens.BUSD.address],
                    config.wallet.address,
                    Web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
                );

                let estimatedGas = await callData.estimateGas({"from": config.wallet.address});
                console.log(`Gas estimado: ${estimatedGas} GWEI`);

                let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
                let count = await web3.eth.getTransactionCount(config.wallet.address);
                let rawTransaction = {
                    "from": config.wallet.address,
                    "gasPrice": Web3.utils.toHex(config.gasPrice * 1000000000),
                    "gasLimit": Web3.utils.toHex(config.gasLimit),
                    "to": pancake.address,
                    "data": callData.encodeABI(),
                    "nonce": Web3.utils.toHex(count)
                };

                let transaction = new Tx(rawTransaction, {'common': bsc_fork});
                transaction.sign(privateKey);

                try {
                    tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
                    done = true;
                } catch (e) {
                    console.log(`Venta no realizada. ${e.message}`);
                    console.log('Intentamos otra vez...');
                }
            }
        } while (!done);

        console.log('Venta exitosa');
        console.log(`Tx: ${tx.transactionHash}`);
        console.log(`Gas usado: ${tx.gasUsed}`);
    })();

    console.log('Terminado.');
};

init();