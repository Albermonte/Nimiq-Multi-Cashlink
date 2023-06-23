import Nimiq from "@nimiq/core-web";
import HubApi from "@nimiq/hub-api";
import { Utf8Tools } from "@nimiq/utils";
// import type { ExtendedTransaction } from "@nimiq/core-web/types";

import {
	start,
	client,
	accounts,
	consensus,
	height,
	ready,
} from "nimiq-svelte-stores";
import { get } from "svelte/store";
import { bind } from "svelte-simple-modal";

import { wallet, balance, showModal } from "../store";
import type { PlainTransaction } from "../store";

import ConsensusModal from "../modals/ConsensusModal.svelte";
import ErrorModal from "../modals/ErrorModal.svelte";
import { CashlinkExtraData } from "../model";
import type { Cashlink } from "../model";

import { createMultiCashlinks } from ".";

//@ts-ignore
export const isDev: boolean = process.env.dev;

const hubDomain = isDev
	? "https://hub.nimiq-testnet.com"
	: "https://hub.nimiq.com";
const hubApi = new HubApi(hubDomain);
const workerURL = location.origin + "/nimiq/";

/**
 * Load Nimiq Worker
 * Start Nimiq Client
 * Subscribe to consensus
 * Create/Load Temp Wallet
 * Subscribe for tx from that Wallet
 */
export const initNimiq = async (consensusType: "light" | "nano") => {
	// Only show error logs
	Nimiq.Log.instance.level = Nimiq.Log.ERROR;
	await Nimiq.load(workerURL);
	await start(
		(config: Nimiq.ClientConfigurationBuilder) => {
			// Create a volatile consensus (not storing peer information across page reloads)
			// Seems faster and don't takes space on the user device
			config.volatile(true);
			if (consensusType === "light") config.feature(Nimiq.Client.Feature.MEMPOOL);
		},
		{
			network: isDev ? "test" : "main",
		},
	);
	const consensusSubscription = consensus.subscribe((cons) => {
		if (cons === "established") {
			const currentModal = get(showModal);
			if (currentModal === ConsensusModal) showModal.set(null);
			consensusSubscription(); // Unsubscribe
		}
	});

	await summonWallet();
	accounts.subscribe(async (accounts) => {
		const $consensus = get(consensus);
		if ($consensus !== "established") return;
		const $wallet = get(wallet);
		const account = accounts.find(acc => acc.address.toUserFriendlyAddress() === $wallet.address.toUserFriendlyAddress());
		if (!account) {
			const res = await fetch(
				`https://api.nimiq.watch/account/${$wallet.address.toUserFriendlyAddress()}`,
			);
			const { balance: nimiqWatchBalance } = await res.json();
			balance.set(Nimiq.Policy.lunasToCoins(nimiqWatchBalance));
		} else {
			if (account.balance === undefined) return;
			const accountBalance = Nimiq.Policy.lunasToCoins(account.balance);
			balance.set(accountBalance);
		}
	});
};

export const isClientReady = async (): Promise<void> => {
	return new Promise(async (resolve) => {
		if (get(ready)) {
			resolve();
		} else {
			const readyUnsubscribe = ready.subscribe((readyState) => {
				if (readyState) {
					readyUnsubscribe();
					resolve();
				}
			});
		}
	});
};

/**
 * Retrieves the local wallet in the localStorage or creates a new wallet if does not exists.
 * Then, updates the store with the wallet information
 */
const summonWallet = async () => {
	if (localStorage.wallet && !isDev) showModal.set(ConsensusModal);
	const nimiqWallet = localStorage.wallet
		? Nimiq.Wallet.loadPlain(JSON.parse(localStorage.wallet))
		: Nimiq.Wallet.generate();

	localStorage.wallet = JSON.stringify(Array.from(nimiqWallet.exportPlain()));
	accounts.add(nimiqWallet.address);
	wallet.set(nimiqWallet);
};

/**
 * Receives the transaction from the user to the temporal
 * wallet
 */
export const receiveTxFromUser = async (totalAmount: number) => {
	const options = {
		appName: "Multi-Cashlink",
		recipient: get(wallet).address.toUserFriendlyAddress(),
		value: Nimiq.Policy.coinsToLunas(totalAmount),
		shopLogoUrl: location.origin + "/favicon.png",
	};
	try {
		const signedTx = await hubApi.checkout(options);
		return signedTx.hash;
	} catch (e) {
		if (e.toString() === "Error: CANCELED") showModal.set(null);
		if (e.toString() === "Error: Failed to open popup") {
			showModal.set(null);
			const errorMessage =
				"Failed to open popup window, make sure your browser allows them";
			const handleRetryText = "Try again";
			setTimeout(() => {
				showModal.set(
					bind(ErrorModal, {
						errorMessage,
						handleRetryText,
						handleRetry: createMultiCashlinks,
					}),
				);
			}, 500);
		}
		console.log(e.toString());
		// TODO: Handle error
		throw e;
	}
};

export const generateCashlink = (amount: number, message: string): Cashlink => {
	// TODO: Add theme and message from user
	let message_bytes = Utf8Tools.stringToUtf8ByteArray(message);

	// TODO: Handle error?
	if (!Nimiq.NumberUtils.isUint8(message_bytes.byteLength))
		message_bytes = Utf8Tools.stringToUtf8ByteArray("");

	const new_wallet = Nimiq.Wallet.generate();

	const buf = new Nimiq.SerialBuffer(
		/*key*/ new_wallet.keyPair.privateKey.serializedSize +
			/*value*/ 8 +
			/*message length*/ (message_bytes.byteLength ? 1 : 0) +
			/*message*/ message_bytes.byteLength,
		// TODO: add byte for theme
	);

	new_wallet.keyPair.privateKey.serialize(buf);

	buf.writeUint64(amount);

	if (message_bytes.byteLength) {
		buf.writeUint8(message_bytes.byteLength);
		buf.write(message_bytes);
	}

	let url = Nimiq.BufferUtils.toBase64Url(buf);
	// replace trailing . by = because of URL parsing issues on iPhone.
	url = url.replace(/\./g, "=");
	// iPhone also has a problem to parse long words with more then 300 chars in a URL in WhatsApp
	// (and possibly others). Therefore we break the words by adding a ~ every 256 characters in long words.
	url = url.replace(/[A-Za-z0-9_]{257,}/g, (match) =>
		match.replace(/.{256}/g, "$&~"),
	);

	return {
		address: new_wallet.address.toUserFriendlyAddress(),
		url: `${hubDomain}/cashlink/#${url}`,
	};
};

export const fundCashlink = (
	cashlink: Cashlink,
	amount: number,
	fee: number,
): {
	tx: PlainTransaction;
	validityStartHeight: number;
	recipient: string;
} => {
	const $height = get(height);
	const $wallet = get(wallet);

	const tx = new Nimiq.ExtendedTransaction(
		$wallet.address, // sender address
		Nimiq.Account.Type.BASIC, // and account type
		Nimiq.Address.fromUserFriendlyAddress(cashlink.address), // recipient address
		Nimiq.Account.Type.BASIC, // and type
		amount,
		fee, // fee
		$height,
		Nimiq.Transaction.Flag.NONE,
		CashlinkExtraData.FUNDING, // the message
	);

	const keyPair = $wallet.keyPair;
	const signature = Nimiq.Signature.create(
		keyPair.privateKey,
		keyPair.publicKey,
		tx.serializeContent(),
	);
	const proof = Nimiq.SignatureProof.singleSig(keyPair.publicKey, signature);
	tx.proof = proof.serialize();

	client.sendTransaction(tx);
	return {
		tx: tx.toPlain(),
		validityStartHeight: $height, // If current height > start height + 10 -> Resend Tx TODO:
		recipient: cashlink.address,
	};
};

export const getAddressToWithdraw = async () => {
	const options = {
		appName: "Multi-Cashlink",
	};
	const addressInfo = await hubApi.chooseAddress(options);
	return addressInfo.address;
};
