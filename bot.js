import ethers from 'ethers';
import express from 'express';
import chalk from 'chalk';
import { data, listWallet } from './data.js';

const app = express();
const tokenIn = data.TOKEN_IN;
const tokenOut = data.TOKEN_OUT;
const amountIn = ethers.utils.parseUnits(`${data.TOKEN_IN_AMOUNT}`, 'ether');
const amountOutMin = ethers.utils.parseUnits(`${data.TOKEN_IN_AMOUNT * data.PRICE_BY_TOKEN_IN}`, 'ether');

const pancakeData = {
  factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',  //PancakeSwap V2 factory
  router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', //PancakeSwap V2 router
}

let initialLiquidityDetected = false;

const bscMainnetUrl = 'https://bsc-dataseed.binance.org/'; //ankr or quiknode
const provider = new ethers.providers.JsonRpcProvider(bscMainnetUrl)

//====================Funtion handle buy token====================
const handleBuy = async () => {
  console.log(chalk.green.inverse(`Buying Token`));

  const buyToken = async (item, index) => {
    console.log(chalk.yellow(`Processing Transaction[${index + 1}].....`), item.recipient);
    const wallet = new ethers.Wallet(item.privatekey);
    const account = wallet.connect(provider);

    const router = new ethers.Contract(
      pancakeData.router,
      [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      ],
      account
    );
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenIn, tokenOut],
      item.recipient,
      Date.now() + 1000 * 60 * 10, //10 minutes
      {
        'gasLimit': data.gasLimit,
        'gasPrice': ethers.utils.parseUnits(`${data.gasPrice}`, 'gwei')
      });

    const receipt = await tx.wait();
    console.log(chalk.green(`Success... Transaction hash[${index + 1}]: ${receipt.transactionHash}`));
  }

  const promises = [];
  listWallet.map((item, index) => promises.push(buyToken(item, index)))
  Promise.all(promises)
}

const checkPair = async (pairAddress, account) => {
  const pair = new ethers.Contract(pairAddress,
    [
      'event Sync(uint112 reserve0, uint112 reserve1)',
      'event Mint(address indexed sender, uint amount0, uint amount1)'
    ],
    account);

  pair.on('Sync', async () => {
    if (initialLiquidityDetected === true) {
      return;
    }
    initialLiquidityDetected = true;
    await handleBuy()
  });
}

const run = async () => {

  const wallet1 = new ethers.Wallet(listWallet[0].privatekey);
  const account1 = wallet1.connect(provider);

  //==============Lay thong tin pair va lq de xu ly mua=================
  const factory = new ethers.Contract(
    pancakeData.factory,
    [
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    account1
  );

  const pairAddress = await factory.getPair(tokenIn, tokenOut);

  if (pairAddress == '0x0000000000000000000000000000000000000000') {
    console.log('Dont have pair for this token, searching for pair')
    factory.on('PairCreated', async (token0, token1, pairAddress) => {
      if (token0 == ethers.utils.getAddress(tokenOut) || token1 == ethers.utils.getAddress(tokenOut))
        await checkPair(pairAddress, account1)
    })
  } else {
    console.log('pairAddress', pairAddress)
    await checkPair(pairAddress, account1)
  }

}

run();

const PORT = 5000;

app.listen(PORT, (console.log(chalk.yellow(`Listening for Liquidity Addition to token ${data.TOKEN_OUT}`))));