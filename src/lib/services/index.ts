import { get } from "svelte/store";

import * as Nimiq from "@nimiq/core";

import { CashlinkExtraData } from "$lib/model";
import {
	wallet,
	headHeight,
	consensus,
	showModal,
	totalAmount,
	amountToPay,
	multiCashlink,
	latestCashlinks,
	cashlinkArray,
	type CashlinkStore,
	isStillUpdating
} from "$lib/store";
import {
	client,
	fundCashlink,
	generateCashlink,
	receiveTxFromUser,
	getAddressToWithdraw,
} from "./Nimiq";

import WaitForFundsModal from "src/modals/WaitForFundsModal.svelte";
import { goto } from "$app/navigation";
import { dev } from '$app/environment';

export const isDev: boolean = dev

/**
 * Wait until tx is known
 */
const waitForFunds = async (txhash: string): Promise<void> => {
	while (true) {
		if (client) {
			try {
				const tx = await client.getTransaction(txhash);
				if (tx.state === 'included' || tx.state === 'confirmed') break;
			} catch {
				// Do nothing, tx is not known yet
			}
		}
		await sleep(1);
	}
};

/**
 * Check that the temporal wallet had received the expected amount
 */
const walletHasEnoughAmount = async (
	expectedAmount: number,
): Promise<boolean> => {
	if (!client) return false;
	const $wallet = get(wallet);
	if (!$wallet) return false;
	try {
		const { balance } = await client.getAccount($wallet.toAddress());
		return balance >= expectedAmount * 1e5;
	} catch {
		const res = await fetch(
			`https://api.nimiq.watch/account/${$wallet.toAddress()}`,
		);
		const { balance } = await res.json();
		return balance >= expectedAmount * 1e5;
	}
};

/**
 * Check for consensus
 */
export const waitForConsensusEstablished = async () => {
	const $consensus = get(consensus);
	if ($consensus !== "established") {
		// showModal.set(ConsensusModal);
	}
	await client!.waitForConsensusEstablished();
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
	console.log("Creating cashlinks", { $totalAmount, $amountToPay });
	if (!(await walletHasEnoughAmount($totalAmount))) {
		const txHash = await receiveTxFromUser($amountToPay);
		showModal.set(WaitForFundsModal);
		await waitForFunds(txHash);
		if (!(await walletHasEnoughAmount($totalAmount))) {
			// TODO: Button to claim back balance
			// TODO: Claim unclaimed Cashlinks
			console.error(
				"Oh boi, we have robbed your money because the money you sent is not enough MUAHAHAH. Just kidding, dunno what happened yet, report this pls...",
				`TotalAmount: ${$totalAmount}`,
			);
		}
	} else {
		showModal.set(WaitForFundsModal);
	}

	console.log("Tx received... Creating cashlinks");

	const $multiCashlink = get(multiCashlink);
	const amountInLunas = ($multiCashlink.amount || 0) * 1e5;
	console.log("Amount in Lunas", { amountInLunas, multiCashlink: $multiCashlink });
	const cashlinks = Array.from(
		{ length: $multiCashlink.nTx || 1 },
		(): CashlinkStore => {
			const cashlink = generateCashlink(amountInLunas, $multiCashlink.message);

			const fundedCashlink = fundCashlink(
				cashlink,
				amountInLunas,
				feeAmounts[$multiCashlink.fee],
			)
			console.log("Funded cashlink", { fundedCashlink, cashlink });

			return {
				url: cashlink.url,
				amount: $multiCashlink.amount || 0,
				...fundedCashlink,
				funded: false,
				claimed: false,
				message: $multiCashlink.message,
			};
		},
	);
	console.log("Cashlinks created...", cashlinks.length);
	// Send tx to the network
	sendFundCashlinks(cashlinks);

	showModal.set(null); // TODO: Notify with native notifications if not focused?

	latestCashlinks.set(cashlinks);
	cashlinkArray.update(($cashlinkArray) => $cashlinkArray.concat(cashlinks));

	console.log("Cashlinks created... Redirecting");
	window.removeEventListener("beforeunload", preventReload);
	await goto("/success");
};

/**
 * Send Cashlinks to the network
 */
const sendFundCashlinks = async (cashlinks: CashlinkStore[]) => {
	await client!.waitForConsensusEstablished();
	// Send in parallel in batches of 15, if any fails, retry
	const batch = 100;
	const batches = Math.ceil(cashlinks.length / batch);
	const failedCashlinks: CashlinkStore[] = [];
	for (let i = 0; i < batches; i++) {
		const promises = cashlinks
			.slice(i * batch, i * batch + batch)
			.map(async (cashlink) => {
				const tx = await client!.sendTransaction(cashlink.tx);
				console.log("Cashlink sent", { tx, cashlink });
				return tx;
			});
		const result = await Promise.allSettled(promises);

		const failed = result
			.filter((x) =>{
				if (x.status === "rejected") {
					console.error("Cashlink failed to send", x.reason);
				}
				return x.status === "rejected"
				})
			.map((x) => cashlinks[result.indexOf(x)]);
		failedCashlinks.push(...failed);

		if (failed.length) await sleep(5);
	}
	if (failedCashlinks.length) {
		console.error("Some cashlinks failed to send", failedCashlinks);
		sendFundCashlinks(failedCashlinks);
	}
};

const preventReload = (e: BeforeUnloadEvent) => {
	e.preventDefault();
	e.returnValue = "";
};

/**
 * Delete claimed Cashlinks from store
 */
export const deleteClaimedCashlinks = async () => {
	await client!.waitForConsensusEstablished();
	const $cashlinkArray = get(cashlinkArray) as CashlinkStore[];
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
	await client!.waitForConsensusEstablished();
	const $cashlinkArray = get(cashlinkArray) as CashlinkStore[];
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
	isStillUpdating.set(true);
	await client!.waitForConsensusEstablished();
	const recipientAddress = await getAddressToWithdraw();
	const $cashlinkArray = get(cashlinkArray) as CashlinkStore[];
	if (!$cashlinkArray.length) return;
	const $height = get(headHeight);

	for (const [index, cashlink] of $cashlinkArray.entries()) {
		if (cashlink && cashlink.funded && !cashlink.claimed) {
			const str = cashlink.url
				.split("cashlink/#")[1]
				.replace(/~/g, "")
				.replace(/=*$/, (match) => new Array(match.length).fill(".").join(""));
			const buf = Nimiq.BufferUtils.fromBase64Url(str);
			const privateKeyBytes = buf.read(Nimiq.PrivateKey.SIZE);
			const keyPair = Nimiq.KeyPair.derive(Nimiq.PrivateKey.deserialize(privateKeyBytes));
			const value = buf.readUint64();
			const recipient = Nimiq.Address.fromString(recipientAddress);
			const transaction = new Nimiq.Transaction(
				Nimiq.Address.fromString(cashlink.recipient), // sender address
				Nimiq.AccountType.Basic, // and account type
				new Uint8Array(0), // data
				recipient, // recipient address
				Nimiq.AccountType.Basic, // and type
				CashlinkExtraData.CLAIMING, // extra data
				BigInt(value),
				BigInt(0), // fee
				0 /* Nimiq.Transaction.Flag.NONE */,
				$height,
				await client!.getNetworkId(),
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

			await client!.sendTransaction(transaction);
			// Wait 5 second between every 20 transfers
			if (index % 20 === 0)
				await sleep(5);
		}
	}

	isStillUpdating.set(false);
};

/**
 * Wait for x seconds
 * @param seconds - Time in seconds
 */
export const sleep = async (seconds: number) => {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
};

/**
 * Max number of Cashlinks per Sender
 */
export const maxCashlinks = 100
