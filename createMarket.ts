import {
  MarketV2,
  Token,
} from '@raydium-io/raydium-sdk';
import { Keypair } from '@solana/web3.js';

import {
  connection,
  DEFAULT_TOKEN,
  makeTxVersion,
  PROGRAMIDS,
  wallet,
} from './config';
import { buildAndSendTx } from './util';

type TestTxInputInfo = {
  baseToken: Token
  quoteToken: Token
  wallet: Keypair
}


///SET THESE
const baseTokenMint = ""
const baseTokenDecimals = 9
const quoteTokenMint = ""
const quoteTokenDecimals = 9



export async function createMarket(input: TestTxInputInfo) {
  // -------- step 1: make instructions --------
  const createMarketInstruments = await MarketV2.makeCreateMarketInstructionSimple({
    connection,
    wallet: input.wallet.publicKey,
    baseInfo: input.baseToken,
    quoteInfo: input.quoteToken,
    lotSize: 0.001, // default 1
    tickSize: 0.01, // default 0.01
    dexProgramId: PROGRAMIDS.OPENBOOK_MARKET,
    makeTxVersion,
  })

  return { txids: await buildAndSendTx(createMarketInstruments.innerTransactions) }
}

async function howToUse() {
const baseToken = new Token(TOKEN_PROGRAM_ID, baseTokenMint, baseTokenDecimals, 'ABC', 'ABC')
const baseToken = new Token(TOKEN_PROGRAM_ID, quoteTokenMint, quoteTokenDecimals, 'ABC', 'ABC')
  createMarket({
    baseToken,
    quoteToken,
    wallet: wallet,
  }).then(({ txids }) => {
    /** continue with txids */
    console.log('txids', txids)
  })
}
howToUse()