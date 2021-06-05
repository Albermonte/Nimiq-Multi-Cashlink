import { writable } from "svelte/store";
import {
	persist,
	indexedDBStorage,
	PersistentStore,
} from "@macfja/svelte-persistent-store";
import type { Wallet } from "@nimiq/core-web/types";
import type { Writable } from "svelte/store";
import type { MultiCashlink } from "./model";

export interface PlainTransaction {
	transactionHash: string,
	format: string;
	sender: string;
	senderType: string;
	recipient: string;
	recipientType: string;
	value: number;
	fee: number;
	feePerByte: number;
	validityStartHeight: number;
	network: string;
	flags: number;
	data: { raw: string; };
	proof: {
		raw: string,
		signature?: string,
		publicKey?: string,
		signer?: string,
		pathLength?: number,
	};
	size: number;
	valid: boolean;
}

export interface CashlinkStore {
	url: string;
	amount: number;
	tx: PlainTransaction;
	recipient: string;
	validityStartHeight: number;
	funded: boolean;
	claimed: boolean;
	message: string;
}


export const multiCashlink: Writable<MultiCashlink> = writable({
	amount: undefined,
	nTx: undefined,
	fee: "free",
	message: "",
});

export const balance: Writable<number> = writable(0);
export const totalAmount: Writable<number> = writable(0);
export const amountToPay: Writable<number> = writable(0);
export const wallet: Writable<Wallet> = writable(null);
export const showModal: Writable<any> = writable(null);
export const isStillUpdating: Writable<boolean> = writable(false);
export const latestCashlinks: PersistentStore<Array<CashlinkStore>> = persist(
	writable([]),
	indexedDBStorage(),
	"latestCashlinks",
);
export const cashlinkArray: PersistentStore<Array<CashlinkStore>> = persist(
	writable([]),
	indexedDBStorage(),
	"cashlinkArray",
);
