import { get } from "svelte/store";

import Nimiq from "@nimiq/core-web";
import HubApi from "@nimiq/hub-api";
import { start, client } from "nimiq-svelte-stores";

import type { MultiCashlink } from "./model";
import { wallet } from "./store";

// @ts-ignore
const isDev: boolean = process.env.dev;

const hubApi = new HubApi(
	isDev ? "https://hub.nimiq-testnet.com" : "https://hub.nimiq.com",
);
const workerURL = location.origin + "/nimiq/";

export const initNimiq = async () => {
	await Nimiq.load(workerURL);
	await start(() => {}, {
		network: isDev ? "test" : "main",
	});
	summonWallet();

	console.log(getPrivateKeyMnemonic(get(wallet)));
};

/**
 * Retrieves the local wallet in the localStorage or creates a new wallet if does not exists.
 * Then, updates the store with the wallet information
 */
const summonWallet = () => {
	const nimiqWallet = localStorage.wallet
		? Nimiq.Wallet.loadPlain(JSON.parse(localStorage.wallet))
		: Nimiq.Wallet.generate();

	localStorage.wallet = JSON.stringify(Array.from(nimiqWallet.exportPlain()));
	wallet.set(nimiqWallet);
};

/**
 * Retrieves 24 words from the generated wallet
 */
const getPrivateKeyMnemonic = (nimiqWallet: Nimiq.Wallet): string => {
	const privateKeyMnemonic = Nimiq.MnemonicUtils.entropyToMnemonic(
		nimiqWallet.keyPair.privateKey.serialize(),
	);
	return privateKeyMnemonic.join(" ");
};

const receiveTxFromUser = async (totalAmount: number) => {
	const options = {
		appName: "Multi Cashlink",
		recipient: get(wallet).address.toUserFriendlyAddress(),
		value: totalAmount,
	};
	const signedTx = await hubApi.checkout(options);
};

const feeAmounts = {
	free: 0,
	normal: 138,
	fast: 276,
};

export const createMultiCashlinks = async ({
	amount,
	fee,
	nTx,
}: MultiCashlink) => {
	const totalFee = feeAmounts[fee] * nTx;
	const totalAmount = nTx * Nimiq.Policy.coinsToLunas(amount) + totalFee;
	await receiveTxFromUser(totalAmount);

	console.log("wallet");
	console.log(multiCashlink);
	console.log(get(wallet));
};
