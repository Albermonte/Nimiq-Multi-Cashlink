import { get } from "svelte/store";

import Nimiq from "@nimiq/core-web";
import HubApi from "@nimiq/hub-api";
import {
	start,
	client,
	accounts,
	consensus,
	height,
} from "nimiq-svelte-stores";
import { Utf8Tools } from "@nimiq/utils";

// TODO Revisar
// import Cashlink from "./Cashlink";
// import type { CashlinkState } from "./Cashlink";
import type { Cashlink } from "./model";

import {
	wallet,
	balance,
	showModal,
	totalAmount,
	multiCashlink,
	cashlinkArray,
	CashlinkStore,
} from "./store";
import ConsensusModal from "./modals/ConsensusModal.svelte";
import WordsModal from "./modals/WordsModal.svelte";
import ModalContent from "./modals/ModalContent.svelte";

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
	await Nimiq.load(workerURL);
	await start(
		(config: Nimiq.ClientConfigurationBuilder) => {
			config.feature(Nimiq.Client.Feature.MEMPOOL);
		},
		{
			network: isDev ? "test" : "main",
		},
	);
	consensus.subscribe((cons) => {
		if (cons === "established") {
			const currentModal = get(showModal);
			if (currentModal === ConsensusModal) showModal.set(null);
		}
	});

	await summonWallet();
	accounts.subscribe(([account]) => {
		const accountBalance = Nimiq.Policy.lunasToCoins(account.balance);
		balance.set(accountBalance);
		const amount = get(totalAmount);
		// Que es esto?
		// TODO: if (accountBalance >= amount) showModal.set(null);
	});

	// Check every cashlink state on head change
	height.subscribe(async () => {
		await client.waitForConsensusEstablished();
		const $cashlinkArray = get(cashlinkArray);
		if (!$cashlinkArray.length) return;

		const array = [];
		for (const cashlink of $cashlinkArray) {
			if (!cashlink.claimed) {
				try {
					const tx = await client.getTransaction(cashlink.txhash);
					if (tx.state === "mined" || tx.state === "confirmed") {
						cashlink.funded = true;
						const recipient = await client.getAccount(tx.recipient);
						if (recipient.balance === 0) cashlink.claimed = true;
					}
				} catch (e) {
					console.log(`Tx: ${cashlink.txhash} not mined`, e);
				}
			}

			array.push(cashlink);
		}
		cashlinkArray.set(array);
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
const receiveTxFromUser = async (totalAmount: number) => {
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

/**
 * Wait until tx is known
 */
const waitForFunds = async (txhash: string): Promise<void> => {
	return new Promise((resolve) => {
		client.addTransactionListener(
			(tx) => {
				if (tx.transactionHash.toHex() === txhash) resolve();
			},
			[get(wallet).address],
		);
	});
};

/**
 * Check that the temporal wallet had received the expected amount
 */
const walletHasEnoughAmount = (expectedAmount: number): boolean => {
	return get(balance) >= expectedAmount;
};

/**
 * Show Modal with 24 words before requesting payment
 */
export const show24Words = () => {
	showModal.set(WordsModal);
};

/**
 * Fee in Lunas for different options
 */
export const feeAmounts = {
	free: 0,
	normal: 138,
	fast: 276,
};

/**
 * Request payout from user
 * Create cashlinks
 */
export const createMultiCashlinks = async () => {
	if (get(consensus) !== "established") {
		showModal.set(ConsensusModal);
		await client.waitForConsensusEstablished();
	}
	if (!walletHasEnoughAmount(get(totalAmount))) {
		const txHash = await receiveTxFromUser(get(totalAmount));
		showModal.set(ModalContent);
		await waitForFunds(txHash);
		showModal.set(null);
		if (!walletHasEnoughAmount(get(totalAmount))) {
			// TODO Button to claim back balance
			console.error(
				"Oh boi, we have robbed your money because the money you sent is not enough MUAHAHAH",
			);
		}
	}
	const $multiCashlink = get(multiCashlink);
	const amountInLunas = Nimiq.Policy.coinsToLunas($multiCashlink.amount);
	const $wallet = get(wallet);

	const array = Array.from(
		{ length: $multiCashlink.nTx },
		(): CashlinkStore => {
			const $height = get(height);
			const cashlink = generateCashlink(amountInLunas);

			const tx = $wallet.createTransaction(
				Nimiq.Address.fromUserFriendlyAddress(cashlink.address),
				amountInLunas,
				feeAmounts[$multiCashlink.fee], // Fee, which is not required in the testnet
				$height, // Blockchain height from when the transaction should be valid (we set the current height)
			);
			client.sendTransaction(tx);
			return {
				url: cashlink.url,
				amount: $multiCashlink.amount,
				txhash: tx.hash().toHex(),
				funded: false,
				claimed: false,
			};
		},
	);
	// TODO: test
	cashlinkArray.update(($cashlinkArray) => $cashlinkArray.concat(array));
	// console.log(get(cashlinkArray));

	// TODO: ?? Send cashlinks on next block to prevent more than 500 on same block? Alberto piensa en inglés, pero redacta en español lo siguiente: Creo que ya se va a hacer asi sin problema pero bueno
	// console.log(await client.mempool.getTransactions());
};

const generateCashlink = (amount: number): Cashlink => {
	// TODO: Add theme and message from user
	let message_bytes = Utf8Tools.stringToUtf8ByteArray(
		"Cashlink by Multi Cashlink",
	);

	// TODO: Handle error
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
