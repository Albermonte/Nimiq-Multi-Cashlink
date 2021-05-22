import { writable } from "svelte/store";
import {
	persist,
	indexedDBStorage,
	PersistentStore,
} from "@macfja/svelte-persistent-store";
import type { Wallet } from "@nimiq/core-web/types";
import type { Writable } from "svelte/store";
import type { MultiCashlink } from "./model";

export interface CashlinkStore {
	url: string;
	amount: number;
	txhash: string;
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
