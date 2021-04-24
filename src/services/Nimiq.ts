import Nimiq from "@nimiq/core-web";
import HubApi from "@nimiq/hub-api";
import { Utf8Tools } from "@nimiq/utils";

import {
	start,
	client,
	accounts,
	consensus,
	height,
} from "nimiq-svelte-stores";
import { get } from "svelte/store";

import { wallet, balance, showModal } from "../store";

import ConsensusModal from "../modals/ConsensusModal.svelte";
import type { Cashlink } from "../model";

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
export const initNimiq = async () => {
	// Only show error logs
	Nimiq.Log.instance.level = Nimiq.Log.ERROR;
	await Nimiq.load(workerURL);
	await start(
		(config: Nimiq.ClientConfigurationBuilder) => {
			// config.feature(Nimiq.Client.Feature.MEMPOOL);
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
	accounts.subscribe(([account]) => {
		const accountBalance = Nimiq.Policy.lunasToCoins(account.balance);
		balance.set(accountBalance);
	});

	// Check every cashlink state on head change
	height.subscribe(async () => {
		await client.waitForConsensusEstablished();
		// TODO: Move to history page and only fetch on that page
		/* const $cashlinkArray = get(cashlinkArray);
		if (!$cashlinkArray.length) return;

		const cashlinks = [];
		for (const cashlink of $cashlinkArray) {
			if (!cashlink.claimed) {
				try {
					const tx = await client.getTransaction(cashlink.txhash);
					if (tx.state === "mined" || tx.state === "confirmed") {
						cashlink.funded = true;
						const recipient = await client.getAccount(tx.recipient);
						if (recipient.balance === 0) cashlink.claimed = true; // TODO: native notification when claimed and from which address was claimed? Time and more info?
					}
				} catch (e) {
					console.log(`Tx: ${cashlink.txhash} not mined`, e);
				}
			}

			cashlinks.push(cashlink);
		}
		cashlinkArray.set(cashlinks); */
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
		appName: "Multi Cashlink",
		recipient: get(wallet).address.toUserFriendlyAddress(),
		value: Nimiq.Policy.coinsToLunas(totalAmount),
		shopLogoUrl: location.origin + "/favicon.png",
	};
	try {
		const signedTx = await hubApi.checkout(options);
		return signedTx.hash;
	} catch (e) {
		if (e.toString() === "Error: CANCELED") showModal.set(null);
		// TODO: Handle error
		throw new Error("Canceled");
	}
};

export const generateCashlink = (amount: number): Cashlink => {
	// TODO: Add theme and message from user
	let message_bytes = Utf8Tools.stringToUtf8ByteArray(
		"Cashlink by Multi Cashlink",
	);

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
) => {
	const $height = get(height);
	const $wallet = get(wallet);

	const tx = $wallet.createTransaction(
		Nimiq.Address.fromUserFriendlyAddress(cashlink.address),
		amount,
		fee,
		$height, // Blockchain height from when the transaction should be valid (we set the current height)
	);
	client.sendTransaction(tx);

	return {
		txhash: tx.hash().toHex(),
		validityStartHeight: $height, // If current height > start height + 10 -> Resend Tx TODO:
	};
};
