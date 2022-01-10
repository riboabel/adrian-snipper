"use strict";

const Big = require('big.js');
const Tx = require('ethereumjs-tx').Transaction;
const Common = require('ethereumjs-common').default;

const Token = require('./src/token');
const PancakeSwap = require('./src/pancakeswap');
const Provider = require('./provider');

let config = require('./config');
config = config[config.mode];
let web3 = Provider();
let bsc_fork = Common.forCustomChain(config['BSC-FORK'].name, config['BSC-FORK'].options, config['BSC-FORK'].mode);

let init = async() => {
    let sellWith = config.sellNow.sellWith;
    let token = new Token(config.tokens.MiToken.address);
    let pancake = new PancakeSwap();
    let amountToSell = await token.getBalanceOf(config.wallet.address);

    await (async() => {
        console.log(`Usaremos ${config.tokens.MiToken.name} (${await token.decimals()} decimales) para vender de inmediato.`);
        console.log(`Venderemos ${(new Big(amountToSell)).div((new Big(10)).pow(Number(await token.decimals()))).toString()} ${await token.symbol()} para recibir con ${config.sellNow.sellWith}.`);
        console.log('--- *** ---');
    })();

    await (async() => {
        let tx;

        if (sellWith === 'BNB') {
            let callData = await pancake.swapExactTokensForETHSupportingFeeOnTransferTokens(
                web3.utils.toHex(amountToSell),
                web3.utils.toHex(0),
                [token.address, config.tokens.WBNB.address],
                config.wallet.address,
                web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
            );

            let estimatedGas = await callData.estimateGas({"from": config.wallet.address});
            console.log(`Gas estimado: ${estimatedGas} GWEI`);

            let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
            let count = await web3.eth.getTransactionCount(config.wallet.address);
            let rawTransaction = {
                "from": config.wallet.address,
                "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
                "gasLimit": web3.utils.toHex(config.gasLimit),
                "to": pancake.address,
                "data": callData.encodeABI(),
                "nonce": web3.utils.toHex(count)
            };

            let transaction = new Tx(rawTransaction, {'common': bsc_fork});
            transaction.sign(privateKey);

            tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
        } else {
            let callData = await pancake.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                web3.utils.toHex(amountToSell),
                web3.utils.toHex(0),
                [token.address, config.tokens.BUSD.address],
                config.wallet.address,
                web3.utils.toHex(Math.round(Date.now() / 1000) + 60 * 3)
            );

            let estimatedGas = await callData.estimateGas({"from": config.wallet.address});
            console.log(`Gas estimado: ${estimatedGas} GWEI`);

            let privateKey = Buffer.from(config.wallet.privateKey, 'hex');
            let count = await web3.eth.getTransactionCount(config.wallet.address);
            let rawTransaction = {
                "from": config.wallet.address,
                "gasPrice": web3.utils.toHex(config.gasPrice * 1000000000),
                "gasLimit": web3.utils.toHex(config.gasLimit),
                "to": pancake.address,
                "data": callData.encodeABI(),
                "nonce": web3.utils.toHex(count)
            };

            let transaction = new Tx(rawTransaction, {'common': bsc_fork});
            transaction.sign(privateKey);

            tx = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));
        }

        console.log('Venta exitosa');
        console.log(`Tx: ${tx.transactionHash}`);
        console.log(`Gas usado: ${tx.gasUsed}`);
    })();
};

init();