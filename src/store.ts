import { writable, derived } from "svelte/store";
import type { Wallet } from "@nimiq/core-web/types";
import type { Writable } from "svelte/store";
import type { MultiCashlink } from "./model";

export const multiCashlink: Writable<MultiCashlink> = writable({
	amount: undefined,
	nTx: undefined,
	fee: "free",
});

export const balance: Writable<number> = writable(0);
export const totalAmount: Writable<number> = writable(0);
export const wallet: Writable<Wallet> = writable(null);
export const showModal: Writable<any> = writable(null);
