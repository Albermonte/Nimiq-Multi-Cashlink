import { get } from "svelte/store";
import { navigate } from "svelte-routing";

import { client, consensus, height, newTransaction } from "nimiq-svelte-stores";
import Nimiq from "@nimiq/core-web";
import type { ClientTransactionDetails } from "@nimiq/core-web/types";

import { CashlinkExtraData } from "../model";
import {
	wallet,
	showModal,
	totalAmount,
	amountToPay,
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
import WaitForFundsModal from "../modals/WaitForFundsModal.svelte";

//@ts-ignore
export const isDev: boolean = process.env.dev;

import * as ackeeTracker from "ackee-tracker";
export const analyticsInstance = ackeeTracker.create("https://an.shortnim.me", {
	// https://github.com/electerious/ackee-tracker#-options
	detailed: true,
	ignoreLocalhost: true,
	ignoreOwnVisits: false,
});

/**
 * Wait until tx is known
 */
const waitForFunds = async (txhash: string): Promise<void> => {
	return new Promise(async (resolve) => {
		const newTransactionUnsubscribe = newTransaction.subscribe(
			(txDetails: ClientTransactionDetails) => {
				if (txDetails && txDetails.transactionHash.toHex() === txhash) {
					switch (txDetails.state) {
						case Nimiq.Client.TransactionState.MINED:
							// Transaction has been confirmed once
							newTransactionUnsubscribe();
							resolve();
							break;
						case Nimiq.Client.TransactionState.EXPIRED:
							console.log(`${txDetails.transactionHash.toHex()} Expired`);
							// TODO: catch error
							throw new Error(`${txDetails.transactionHash.toHex()} Expired`);
						case Nimiq.Client.TransactionState.INVALIDATED:
							console.log(`${txDetails.transactionHash.toHex()} Invaldiated`);
							// TODO: catch error
							throw new Error(
								`${txDetails.transactionHash.toHex()} Invaldiated`,
							);
					}
				}
			},
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
	try {
		const { balance } = await client.getAccount($wallet.address);
		return Nimiq.Policy.lunasToCoins(balance) >= expectedAmount;
	} catch (e) {
		const res = await fetch(
			`https://api.nimiq.watch/account/${$wallet.address.toUserFriendlyAddress()}`,
		);
		const { balance } = await res.json();
		return Nimiq.Policy.lunasToCoins(balance) >= expectedAmount;
	}
};

/**
 * Check for consensus
 */
export const waitForConsensusEstablished = async () => {
	const $consensus = get(consensus);
	if ($consensus !== "established") {
		showModal.set(ConsensusModal);
	}
	await isClientReady();
	await client.waitForConsensusEstablished();
	showModal.set(null);
};

/**
 * Fee in Lunas for different options
 */
export const feeAmounts = {
	free: 0,
	standard: 166 + 5, // Standard fee for Extended TX + Message length
	express: 2 * (166 + 5), // Double than the Standard fee
};

/**
 * Request payout from user
 * Create cashlinks
 */
export const createMultiCashlinks = async () => {
	window.addEventListener("beforeunload", preventReload);
	const $totalAmount = get(totalAmount);
	const $amountToPay = get(amountToPay);
	if (!(await walletHasEnoughAmount($totalAmount))) {
		const txHash = await receiveTxFromUser($amountToPay);
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
	try {
		// Number of Cashlinks
		analyticsInstance.action('59f61a90-efe9-4423-b64b-ac1424ca2030', { key: 'Cashlinks', value: $multiCashlink.nTx });
		// Lunas per Cashlink
		analyticsInstance.action('7d96d5ca-7ab5-4dc8-beb3-5dd3df3a5878', { key: 'Lunas', value: amountInLunas });
		// Contains Message (must be a positive integer)
		analyticsInstance.action('b164f80e-db7a-43b1-b0b1-70540bb77902', { key: 'Message', value: $multiCashlink.message ? 2 : 1 });
	} catch (e) {
		// TODO: Add Sentry logs
	}

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

	let array = [];
	for (const cashlink of $cashlinkArray) {
		if (cashlink && cashlink.claimed) continue;
		array.push(cashlink);
	}

	array = [...new Set(array.filter((x) => x != null))];
	cashlinkArray.set(array);
};

export const deletePendingCashlinks = async () => {
	await client.waitForConsensusEstablished();
	const $cashlinkArray = get(cashlinkArray);
	if (!$cashlinkArray.length) return;

	let array = [];
	for (const cashlink of $cashlinkArray) {
		if (cashlink && !cashlink.claimed && !cashlink.funded) continue;
		array.push(cashlink);
	}

	array = [...new Set(array.filter((x) => x != null))];
	cashlinkArray.set([...new Set(array)]);
};

export const claimUnclaimedCashlinks = async () => {
	await client.waitForConsensusEstablished();
	const recipientAddress = await getAddressToWithdraw();
	const $cashlinkArray = get(cashlinkArray);
	if (!$cashlinkArray.length) return;
	const $height = get(height);

	for (const cashlink of $cashlinkArray) {
		if (cashlink && cashlink.funded && !cashlink.claimed) {
			const str = cashlink.url
				.split("cashlink/#")[1]
				.replace(/~/g, "")
				.replace(/=*$/, (match) => new Array(match.length).fill(".").join(""));
			const buf = Nimiq.BufferUtils.fromBase64Url(str);
			const keyPair = Nimiq.KeyPair.derive(Nimiq.PrivateKey.unserialize(buf));
			const value = buf.readUint64();
			const recipient = Nimiq.Address.fromString(recipientAddress);
			const transaction = new Nimiq.ExtendedTransaction(
				Nimiq.Address.fromString(cashlink.recipient), // sender address
				Nimiq.Account.Type.BASIC, // and account type
				recipient, // recipient address
				Nimiq.Account.Type.BASIC, // and type
				value,
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
