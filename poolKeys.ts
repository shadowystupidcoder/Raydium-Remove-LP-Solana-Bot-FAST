//@ts-nocheck
import * as spl from "@solana/spl-token"
import { connection, wallet } from './config';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from '@solana/web3.js'
import { u16, blob, u8, u32, seq, struct, NearUInt64 } from "@solana/buffer-layout"
import { bool, u64, publicKey, u128 } from "@solana/buffer-layout-utils"
import { createAssociatedTokenAccountIdempotent, getAssociatedTokenAddress, createSyncNativeInstruction, createAssociatedTokenAccountIdempotentInstruction} from "@solana/spl-token"
const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
const openbookProgram = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')
const seeds = [
  Buffer.from('amm_associated_seed', 'utf-8'),
  Buffer.from('coin_vault_associated_seed', 'utf-8'),
  Buffer.from('pc_vault_associated_seed', 'utf-8'),
  Buffer.from('lp_mint_associated_seed', 'utf-8'),
  Buffer.from('temp_lp_token_associated_seed', 'utf-8'),
  Buffer.from('target_associated_seed', 'utf-8'),
  Buffer.from('withdraw_associated_seed', 'utf-8'),
  Buffer.from('open_order_associated_seed', 'utf-8'),
  Buffer.from('pc_vault_associated_seed', 'utf-8')
]

export async function deriveKeys(marketId, baseDecimals, quoteDecimals) {
  const marketInfo = await getMarketInfo(marketId)
  const baseMintPromise = getOwnerAta(marketInfo.baseMint, wallet.publicKey)
  const quoteMintPromise = getOwnerAta(marketInfo.quoteMint, wallet.publicKey)
  const authorityPromise = PublicKey.findProgramAddressSync([Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])], rayV4)[0]
  const marketAuthorityPromise = getVaultSigner(marketId, marketInfo)
  const seedsPromises = seeds.map(seed => PublicKey.findProgramAddress([rayV4.toBuffer(), marketId.toBuffer(), seed], rayV4))
  const allPromises = [baseMintPromise, quoteMintPromise, authorityPromise, marketAuthorityPromise, ...seedsPromises]
  const [ownerBaseAta, ownerQuoteAta, authority, marketAuthority, id, baseVault, coinVault, lpMint, lpVault, targetOrders, withdrawQueue, openOrders, quoteVault] = await Promise.all(allPromises)
  const ownerLpTokenAta = await getOwnerAta(lpMint[0], wallet.publicKey)
  const poolKeys = {
  keg: spl.TOKEN_PROGRAM_ID,
  version: 4,
  marketVersion: 3,
  programId: rayV4,
  baseMint: marketInfo.baseMint,
  quoteMint: marketInfo.quoteMint,
  ownerBaseAta: ownerBaseAta,
  ownerQuoteAta: ownerQuoteAta,
  baseDecimals: baseDecimals,
  lpTokenAccount: ownerLpTokenAta,
  quoteDecimals: quoteDecimals,
  tokenProgram: spl.TOKEN_PROGRAM_ID,
  lpDecimals: baseDecimals,
  authority: authority,
  marketAuthority: marketAuthority,
  marketProgramId: openbookProgram,
  marketId: marketId,
  marketBids: marketInfo.bids,
  marketAsks: marketInfo.asks,
  marketQuoteVault: marketInfo.quoteVault,
  marketBaseVault: marketInfo.baseVault,
  marketEventQueue: marketInfo.eventQueue,
  id: id[0],
  baseVault: baseVault[0],
  coinVault: coinVault[0],
  lpMint: lpMint[0],
  lpVault: lpVault[0],
  targetOrders: targetOrders[0],
  withdrawQueue: withdrawQueue[0],
  openOrders: openOrders[0],
  quoteVault: quoteVault[0],
  lookupTableAccount: PublicKey.default}
  return poolKeys
}
async function getMarketInfo(marketId) {
const info = await connection.getAccountInfo(marketId)
const ownAddress = new PublicKey(info.data.slice(13, 45))
const vaultSignerNonce = new NearUInt64().decode(new Uint8Array((info).data.subarray(45, 53)))
const baseMint = new PublicKey(info.data.slice(53, 85))
const quoteMint = new PublicKey(info.data.slice(85, 117))
const bids = new PublicKey(info.data.slice(285, 317))
const asks = new PublicKey(info.data.slice(317, 349))
const event = new PublicKey(info.data.slice(253, 285))
const baseVault = new PublicKey(info.data.slice(117, 149))
const quoteVault = new PublicKey(info.data.slice(165, 197))
const marketInfo = {
ownAddress,
vaultSignerNonce,
baseMint,
quoteMint,
bids,
asks,
event,
baseVault,
quoteVault}
return(marketInfo)
}
async function getOwnerAta(mint, publicKey) { return(PublicKey.findProgramAddressSync([publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl.ASSOCIATED_TOKEN_PROGRAM_ID)[0])}
async function getVaultSigner(marketId, marketInfo) {
  const seeds = [marketId.toBuffer()]
  const seedsWithNonce = seeds.concat(Buffer.from([Number(marketInfo.vaultSignerNonce.toString())]), Buffer.alloc(7))
  return PublicKey.createProgramAddress(seedsWithNonce, openbookProgram)
}