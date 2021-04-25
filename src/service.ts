import { get } from "svelte/store";
import { navigate } from "svelte-routing";

import { client, consensus } from "nimiq-svelte-stores";
import Nimiq from "@nimiq/core-web";

import {
	wallet,
	showModal,
	totalAmount,
	multiCashlink,
	latestCashlinks,
	cashlinkArray,
	CashlinkStore,
} from "./store";
import {
	fundCashlink,
	generateCashlink,
	receiveTxFromUser,
} from "./services/Nimiq";

import ConsensusModal from "./modals/ConsensusModal.svelte";
import WordsModal from "./modals/WordsModal.svelte";
import ModalContent from "./modals/ModalContent.svelte";

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
	await client.waitForConsensusEstablished();
	showModal.set(null);
};

/**
 * Show Modal with 24 words before requesting payment
 */
export const show24Words = async () => {
	await waitForConsensusEstablished();
	setTimeout(() => showModal.set(WordsModal), 300);
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
	const $totalAmount = get(totalAmount);
	if (!(await walletHasEnoughAmount($totalAmount))) {
		const txHash = await receiveTxFromUser($totalAmount);
		showModal.set(ModalContent);
		await waitForFunds(txHash);
		showModal.set(null); // TODO: Notify with native notifications if not focused?
		if (!(await walletHasEnoughAmount($totalAmount))) {
			// TODO: Button to claim back balance
			// TODO: Claim unclaimed Cashlinks
			console.error(
				"Oh boi, we have robbed your money because the money you sent is not enough MUAHAHAH",
				`TotalAmount: ${$totalAmount}`,
			);
		}
	}
	const $multiCashlink = get(multiCashlink);
	const amountInLunas = Nimiq.Policy.coinsToLunas($multiCashlink.amount);

	const cashlinks = Array.from(
		{ length: $multiCashlink.nTx },
		(): CashlinkStore => {
			const cashlink = generateCashlink(amountInLunas);

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
			};
		},
	);
	latestCashlinks.set(cashlinks);
	cashlinkArray.update(($cashlinkArray) => $cashlinkArray.concat(cashlinks));

	navigate("/success");
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
