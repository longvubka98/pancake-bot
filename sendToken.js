import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import { data, listWallet } from './data.js';

const app = express();
const tokenOut = data.TOKEN_OUT;

const bscMainnetUrl = 'https://bsc-dataseed.binance.org/'; //ankr or quiknode
const provider = new ethers.providers.JsonRpcProvider(bscMainnetUrl)

//====================Funtion handle buy token====================
const handleSend = async () => {
    console.log(chalk.green.inverse(`Sending Token`));

    const sendToken = async (item, index) => {
        console.log(chalk.yellow(`Sending Token[${index + 1}].....`), item.recipient);
        const wallet = new ethers.Wallet(item.privatekey);
        const account = wallet.connect(provider);

        // Send all token to TOTAL WALLET
        const pairERC20 = new ethers.Contract(tokenOut,
            [
                'function balanceOf(address owner) external view returns (uint)',
                'function transfer(address to, uint value) external returns (bool)'
            ],
            account);
        const balance = await pairERC20.balanceOf(item.recipient)
        const isSendToken = await pairERC20.transfer(data.TOTAL_WALLET, balance)
        if (isSendToken)
            console.log(chalk.green(`Send token success... `, item.recipient));
    }

    const promises = [];
    listWallet.map((item, index) => promises.push(sendToken(item, index)))
    Promise.all(promises)
}

const run = async () => {
    await handleSend()
}

run();

const PORT = 5000;

app.listen(PORT);