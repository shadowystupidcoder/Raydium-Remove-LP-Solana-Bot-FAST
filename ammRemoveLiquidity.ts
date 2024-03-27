//@ts-nocheck
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ENDPOINT, jsonInfo2PoolKeys, Liquidity, LiquidityPoolKeys, TokenAmount, Token } from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';
import { connection, DEFAULT_TOKEN, makeTxVersion, RAYDIUM_MAINNET_API, wallet } from './config';
import { buildAndSendTx, getWalletTokenAccount, fee } from './util';
import { deriveKeys } from "./poolKeys"


// Set your wallet and RPC in config.ts, fill out the 5 lines below this. run npx ts-node ammRemoveLiquidity to remove all the liquidity that you are currently have tokens for.

// user config
const MARKET_ID = "23ffaf3f..."
const LP_MINT = "3f2323f..."
const BASE_DECIMALS = 9
const QUOTE_DECIMALS = 9
const LP_DECIMALS = 9
// user config


async function rem(mId, lpMin, bDec, qDec, lpDec, wall, pay) {
const wallet = wall
const baseMintDecimals = bDec
const quoteMintDecimals = qDec
const lpDecimals = lpDec
const lpMint = new PublicKey(lpMin)
const MARKET_ID = new PublicKey(mId)
const lpToken = new Token(TOKEN_PROGRAM_ID, lpMint, lpDecimals, 'ABC', 'ABC')
async function getPoolKeys() {
let keys = await deriveKeys(MARKET_ID, baseMintDecimals, quoteMintDecimals)
return(keys)
}
const poolKeys = await getPoolKeys()


async function getLpTokenBalance(wallet): Promise<bigint> {
    const lpTokenMintAddress = poolKeys.lpMint
    const walletPublicKey = wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, { mint: lpTokenMintAddress });
    let totalBalance = 0;
    for (const account of tokenAccounts.value) {
        totalBalance += account.account.data.parsed.info.tokenAmount.uiAmount;
    }
	console.log("TOTALBAL:", totalBalance)
    return BigInt(Math.floor(totalBalance * Math.pow(10, lpDecimals)));
}

async function ammRemoveLiquidity(wallet, removeLpTokenAmount, targetPool, walletTokenAccounts) {
	console.log(poolKeys, wallet, walletTokenAccounts, removeLpTokenAmount, targetPool)
    const removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
            owner: wallet,
            payer: wallet,
            tokenAccounts: walletTokenAccounts,
        },
	computeBudgetConfig: { units: 300000, microLamports: 100000 },
        amountIn: removeLpTokenAmount,
        makeTxVersion,
    });
	console.log(removeLiquidityInstructionResponse)

    return(await buildAndSendTx(removeLiquidityInstructionResponse.innerTransactions, wallet));
}

async function howToUse(lpTokenBalance: bigint) {
    const removeLpTokenAmount = new TokenAmount(lpToken, lpTokenBalance.toString());
    const targetPool = poolKeys.id;
    const walletTokenAccounts = await getWalletTokenAccount(connection, wallet);
    return ammRemoveLiquidity(wallet, removeLpTokenAmount, targetPool, walletTokenAccounts)
}
getLpTokenBalance(wallet).then(balance => {
    howToUse(balance).then(({ tx }) => {
	console.log("REMTX:", tx)
        return(tx);
    });
});
}


async function remove() {
const marketId = new PublicKey(MARKET_ID)
const baseDecimals = Number(BASE_DECIMALS)
const quoteDecimals = Number(QUOTE_DECIMALS)
const lpMint = new PublicKey(LP_MINT)
const lpDecimals = Number(LP_DECIMALS)
const tx = await rem(marketId, lpMint, baseDecimals, quoteDecimals, lpDecimals, wallet, wallet)
const batch = await fee(tx)
const sent = await connection.sendTranasction(batch, [wallet])
}

remove()
