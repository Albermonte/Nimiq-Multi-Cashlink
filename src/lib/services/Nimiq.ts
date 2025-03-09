import * as Nimiq from "@nimiq/core";
import HubApi from "@nimiq/hub-api";
import { Utf8Tools } from "@nimiq/utils";
import { dev } from '$app/environment';
import { get } from "svelte/store";
import { bind } from "svelte-simple-modal";

import { wallet, balance, showModal, headHeight, consensus } from "$lib/store";

import ConsensusModal from "src/modals/ConsensusModal.svelte";
import ErrorModal from "src/modals/ErrorModal.svelte";
import { CashlinkExtraData } from "../model";
import type { Cashlink } from "../model";

import { createMultiCashlinks } from ".";

export const isDev = dev

const hubDomain = isDev
	? "https://hub.nimiq-testnet.com"
	: "https://hub.nimiq.com";
let hubApi: HubApi<typeof HubApi.BehaviorType.POPUP, typeof HubApi.BehaviorType.IFRAME> | null = null;
export let client: Nimiq.Client | null = null;
export let networkId: number | null = null;

let isNimiqInitialized = false;
/**
 * Load Nimiq Worker
 * Start Nimiq Client
 * Subscribe to consensus
 * Create/Load Temp Wallet
 * Subscribe for tx from that Wallet
 */
export const initNimiq = async () => {
	if (isNimiqInitialized || client !== null) return;

	const config = new Nimiq.ClientConfiguration()
	if (isDev) {
		config.network('TestAlbatross')
		config.seedNodes([
			'/dns4/seed1.pos.nimiq-testnet.com/tcp/8443/wss',
			'/dns4/seed2.pos.nimiq-testnet.com/tcp/8443/wss',
			'/dns4/seed3.pos.nimiq-testnet.com/tcp/8443/wss',
			'/dns4/seed4.pos.nimiq-testnet.com/tcp/8443/wss',
		])
	} else {
		config.network('MainAlbatross')
	}
	client = await Nimiq.Client.create(config.build())
	networkId = await client.getNetworkId();
	isNimiqInitialized = true;

	client.addConsensusChangedListener((state) => {
		consensus.set(state)
		const currentModal = get(showModal);
		if (state === 'established') {
			if (currentModal === ConsensusModal) showModal.set(null);
		} else {
			if(currentModal !== ConsensusModal)
				showModal.set(ConsensusModal);
		}
	})
	client.addHeadChangedListener(async (head) => headHeight.set((await client!.getBlock(head)).height))

	await summonWallet();
	await updateBalance();
	hubApi = new HubApi(hubDomain);
};

const updateBalance = async () => {
	if (!client) return;
	await client.waitForConsensusEstablished();
	const address = get(wallet)?.toAddress();
	if (!address) return;
	const account = await client.getAccount(address);
	balance.set(account.balance);
}

/**
 * Retrieves the local wallet in the localStorage or creates a new wallet if does not exists.
 * Then, updates the store with the wallet information
 */
const summonWallet = async () => {
	const nimiqWallet = localStorage.wallet
		? Nimiq.KeyPair.deserialize(new Nimiq.SerialBuffer(JSON.parse(localStorage.wallet)))
		: Nimiq.KeyPair.generate();

	localStorage.wallet = JSON.stringify(Array.from(nimiqWallet.serialize()));
	wallet.set(nimiqWallet);
	console.log("Wallet ready", nimiqWallet.toAddress().toUserFriendlyAddress());
};

/**
 * Receives the transaction from the user to the temporal
 * wallet
 */
export const receiveTxFromUser = async (totalAmount: number) => {
	const $wallet = get(wallet);
	if (!$wallet) throw new Error("Wallet not found");
	const options = {
		appName: "Multi-Cashlink",
		recipient: $wallet.toAddress().toUserFriendlyAddress(),
		value: totalAmount * 1e5,
		shopLogoUrl: location.origin + "/favicon.png",
	};
	try {
		if (!hubApi) throw new Error("Hub API not initialized");
		const signedTx = await hubApi.checkout(options);
		console.log("Transaction received", signedTx);
		return signedTx.hash;
	} catch (e) {
		if ((e as Error).message === "Error: CANCELED") showModal.set(null);
		if ((e as Error).message === "Error: Failed to open popup") {
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
		console.error(e);
		// TODO: Handle error
		throw e;
	}
};

export const generateCashlink = (amount: number, message: string): Cashlink => {
	// TODO: Add theme and message from user
	let messageBytes = Utf8Tools.stringToUtf8ByteArray(message);

	// TODO: Handle error?
	if (!Nimiq.NumberUtils.isUint8(messageBytes.byteLength))
		messageBytes = Utf8Tools.stringToUtf8ByteArray("");

	const new_wallet = Nimiq.KeyPair.generate();

	const buf = new Nimiq.SerialBuffer(
		/*key*/ new_wallet.privateKey.serializedSize +
			/*value*/ 8 +
			/*message length*/ (messageBytes.byteLength ? 1 : 0) +
			/*message*/ messageBytes.byteLength,
		// TODO: add byte for theme
	);

	buf.write(new_wallet.privateKey.serialize());
	buf.writeUint64(amount);

	if (messageBytes.byteLength) {
		buf.writeUint8(messageBytes.byteLength);
		buf.write(messageBytes);
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
		address: new_wallet.toAddress().toUserFriendlyAddress(),
		url: `${hubDomain}/cashlink/#${url}`,
	};
};

export const fundCashlink = (
	cashlink: Cashlink,
	amount: number,
	fee: number,
) => {
	if(!client) throw new Error("Nimiq client not found while funding cashlink");
	const $headHeight = get(headHeight);
	const $wallet = get(wallet);
	if (!$wallet) throw new Error("Wallet not found while funding cashlink");
	if(!networkId) throw new Error("Network ID not found while funding cashlink");

	const tx = new Nimiq.Transaction(
		$wallet.toAddress(), // sender address
		Nimiq.AccountType.Basic, // and account type
		new Uint8Array(0), // sender data
		Nimiq.Address.fromUserFriendlyAddress(cashlink.address), // recipient address
		Nimiq.AccountType.Basic, // and type
		CashlinkExtraData.FUNDING, // the message
		BigInt(amount),
		BigInt(fee), // fee
		0 /* Nimiq.Transaction.Flag.NONE */,
		$headHeight,
		networkId,
	);

	const keyPair = $wallet;
	const signature = Nimiq.Signature.create(
		keyPair.privateKey,
		keyPair.publicKey,
		tx.serializeContent(),
	);
	const proof = Nimiq.SignatureProof.singleSig(keyPair.publicKey, signature);
	tx.proof = proof.serialize();

	return {
		tx: tx.toPlain(),
		validityStartHeight: $headHeight,
		recipient: cashlink.address,
	};
};

export const getAddressToWithdraw = async () => {
	const options = {
		appName: "Multi-Cashlink",
	};
	if (!hubApi) throw new Error("Hub API not initialized");
	const addressInfo = await hubApi.chooseAddress(options);
	return addressInfo.address;
};
