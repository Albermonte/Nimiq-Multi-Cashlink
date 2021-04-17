import { writable, derived } from "svelte/store";
import type { Wallet } from "@nimiq/core-web/types";
import type { Writable } from "svelte/store";
import type { MultiCashlink } from "./model";

export const multiCashlink: Writable<MultiCashlink> = writable({
	amount: undefined,
	nTx: undefined,
	fee: "free",
});

export const wallet: Writable<Wallet> = writable(null);
