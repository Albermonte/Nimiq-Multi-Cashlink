import { get } from "svelte/store";
import { navigate } from "svelte-routing";

import { client, consensus, height } from "nimiq-svelte-stores";
import Nimiq from "@nimiq/core-web";

import { CashlinkExtraData } from "../model";
import {
	wallet,
	showModal,
	totalAmount,
	multiCashlink,
	latestCashlinks,
	cashlinkArray,
	CashlinkStore,
} from "../store";
import {
	isClientReady,
	fundCashlink,
	generateCashlink,
	receiveTxFromUser,
	getAddressToWithdraw,
} from "./Nimiq";

import ConsensusModal from "../modals/ConsensusModal.svelte";
import WordsModal from "../modals/WordsModal.svelte";
import WaitForFundsModal from "../modals/WaitForFundsModal.svelte";

//@ts-ignore
export const isDev: boolean = process.env.dev;

/**
 * Wait until tx is known
 */
const waitForFunds = async (txhash: string): Promise<void> => {
	return new Promise(async (resolve) => {
		try {
			const tx = await client.getTransaction(txhash);
			if (tx.state === "mined" || tx.state === "confirmed") resolve();
		} catch (e) {
			if (isDev) console.error(e);
		}
		client.addTransactionListener(
			(tx) => {
				if (
					tx.transactionHash.toHex() === txhash &&
					(tx.state === "mined" || tx.state === "confirmed")
				)
					resolve();
			},
			[get(wallet).address],
		);
	});
};

/**
 * Check that the temporal wallet had received the expected amount
 */
const walletHasEnoughAmount = async (
	expectedAmount: number,
): Promise<boolean> => {
	const $wallet = get(wallet);
	const { balance } = await client.getAccount($wallet.address);
	return Nimiq.Policy.lunasToCoins(balance) >= expectedAmount;
};

/**
 * Check for consensus
 */
const waitForConsensusEstablished = async () => {
	const $consensus = get(consensus);
	if ($consensus !== "established") {
		showModal.set(ConsensusModal);
	}
	await isClientReady();
	await client.waitForConsensusEstablished();
	showModal.set(null);
};

/**
 * Show Modal with 24 words before requesting payment
 */
export const show24Words = async () => {
	await waitForConsensusEstablished();
	setTimeout(() => showModal.set(WordsModal), 350);
};

/**
 * Fee in Lunas for different options
 */
export const feeAmounts = {
	free: 0,
	standard: 138,
	express: 276,
};

/**
 * Request payout from user
 * Create cashlinks
 */
export const createMultiCashlinks = async () => {
	window.addEventListener("beforeunload", preventReload);
	const $totalAmount = get(totalAmount);
	if (!(await walletHasEnoughAmount($totalAmount))) {
		const txHash = await receiveTxFromUser($totalAmount);
		showModal.set(WaitForFundsModal);
		await waitForFunds(txHash);
		showModal.set(null); // TODO: Notify with native notifications if not focused?
		if (!(await walletHasEnoughAmount($totalAmount))) {
			// TODO: Button to claim back balance
			// TODO: Claim unclaimed Cashlinks
			console.error(
				"Oh boi, we have robbed your money because the money you sent is not enough MUAHAHAH. Just kidding, dunno what happened yet, report this pls...",
				`TotalAmount: ${$totalAmount}`,
			);
		}
	}
	console.log("Tx received... Creating cashlinks");

	const $multiCashlink = get(multiCashlink);
	const amountInLunas = Nimiq.Policy.coinsToLunas($multiCashlink.amount);

	const cashlinks = Array.from(
		{ length: $multiCashlink.nTx },
		(): CashlinkStore => {
			const cashlink = generateCashlink(amountInLunas, $multiCashlink.message);

			const tx = fundCashlink(
				cashlink,
				amountInLunas,
				feeAmounts[$multiCashlink.fee],
			);

			return {
				url: cashlink.url,
				amount: $multiCashlink.amount,
				...tx,
				funded: false,
				claimed: false,
				message: $multiCashlink.message,
			};
		},
	);
	latestCashlinks.set(cashlinks);
	cashlinkArray.update(($cashlinkArray) => $cashlinkArray.concat(cashlinks));

	console.log("Cashlinks created... Redirecting");
	window.removeEventListener("beforeunload", preventReload);
	navigate("/success");
};

const preventReload = (e) => {
	e.preventDefault();
	e.returnValue = "";
};

/**
 * Delete claimed Cashlinks from store
 */
export const deleteClaimedCashlinks = async () => {
	await client.waitForConsensusEstablished();
	const $cashlinkArray = get(cashlinkArray);
	if (!$cashlinkArray.length) return;

	const array = [];
	for (const cashlink of $cashlinkArray) {
		if (cashlink.claimed) continue;
		array.push(cashlink);
	}
	cashlinkArray.set(array);
};

export const deletePendingCashlinks = async () => {
	await client.waitForConsensusEstablished();
	const $cashlinkArray = get(cashlinkArray);
	if (!$cashlinkArray.length) return;

	const array = [];
	for (const cashlink of $cashlinkArray) {
		if (!cashlink.claimed && !cashlink.funded) continue;
		array.push(cashlink);
	}
	cashlinkArray.set(array);
};

export const claimUnclaimedCashlinks = async () => {
	await client.waitForConsensusEstablished();
	const recipientAddress = await getAddressToWithdraw();
	const $cashlinkArray = get(cashlinkArray);
	if (!$cashlinkArray.length) return;
	const $height = get(height);

	for (const cashlink of $cashlinkArray) {
		if (cashlink.funded && !cashlink.claimed) {
			const str = cashlink.url
				.split("cashlink/#")[1]
				.replace(/~/g, "")
				.replace(/=*$/, (match) => new Array(match.length).fill(".").join(""));
			const buf = Nimiq.BufferUtils.fromBase64Url(str);
			const keyPair = Nimiq.KeyPair.derive(Nimiq.PrivateKey.unserialize(buf));
			const value = buf.readUint64();
			console.log(value);
			const balance = Nimiq.Policy.coinsToLunas(cashlink.amount);
			const recipient = Nimiq.Address.fromString(recipientAddress);
			const transaction = new Nimiq.ExtendedTransaction(
				Nimiq.Address.fromString(cashlink.recipient), // sender address
				Nimiq.Account.Type.BASIC, // and account type
				recipient, // recipient address
				Nimiq.Account.Type.BASIC, // and type
				balance,
				0, // fee
				$height,
				Nimiq.Transaction.Flag.NONE,
				CashlinkExtraData.CLAIMING, // the message
			);
			const signature = Nimiq.Signature.create(
				keyPair.privateKey,
				keyPair.publicKey,
				transaction.serializeContent(),
			);
			const proof = Nimiq.SignatureProof.singleSig(
				keyPair.publicKey,
				signature,
			).serialize();
			transaction.proof = proof;

			client.sendTransaction(transaction);
		}
	}
};

/**
 * Max number of Cashlinks per block per Sender
 */
export const maxCashlinks = Nimiq.Mempool.TRANSACTIONS_PER_SENDER_MAX;

/**
 * Max number of Free Cashlinks per block per Sender
 */
export const maxFreeCashlinks = Nimiq.Mempool.FREE_TRANSACTIONS_PER_SENDER_MAX;

/***
FLOW:

1. Previo:
	1.1 Consenso 
	1.2 crear/cargar wallet
2. wallet temporal:
	2.1 eneseña palabras
	2.2 recibir el dinero -> tarda +-1 min (mostrar cosas guays sobre Nimiq de mientras? Publicidad?)
	2.3 comprobar que hay que enough money
3. cashlink:
	3.1 crear los cashlink
	3.2 mostrar a usuario cashlinks
	3.3 guardar en localStorage
	
**/
