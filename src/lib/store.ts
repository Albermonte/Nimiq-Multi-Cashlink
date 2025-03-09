import { writable } from "svelte/store";
import {
	persist,
	createIndexedDBStorage,
} from "@macfja/svelte-persistent-store";
import type { PersistentStore } from "@macfja/svelte-persistent-store";
import type { KeyPair, PlainTransaction, ConsensusState } from "@nimiq/core";
import type { Writable } from "svelte/store";
import type { MultiCashlink } from "./model";

type Component =
  | typeof import("svelte").SvelteComponent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | typeof import("svelte").SvelteComponent<any>;

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

export const consensus: Writable<ConsensusState | 'loading'> = writable('loading');
export const balance: Writable<number> = writable(0);
export const totalAmount: Writable<number> = writable(0);
export const amountToPay: Writable<number> = writable(0);
export const wallet: Writable<KeyPair | null> = writable(null);
export const headHeight: Writable<number> = writable(0);
export const showModal: Writable<Component | null | undefined> = writable(null);
export const isStillUpdating: Writable<boolean> = writable(false);
export const latestCashlinks: PersistentStore<Array<CashlinkStore>> = persist(
	writable([]),
	createIndexedDBStorage(),
	"latestCashlinks",
);
export const cashlinkArray: PersistentStore<Array<CashlinkStore>> = persist(
	writable([]),
	createIndexedDBStorage(),
	"cashlinkArray",
);
