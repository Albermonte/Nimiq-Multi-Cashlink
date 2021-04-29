export interface MultiCashlink {
	amount: number;
	nTx: number;
	fee: "free" | "standard" | "express";
	message: string;
}

export interface Cashlink {
	address: string;
	url: string;
}

export enum CashlinkState {
	UNKNOWN = -1,
	UNCHARGED = 0,
	CHARGING = 1,
	UNCLAIMED = 2,
	CLAIMING = 3,
	CLAIMED = 4,
}
