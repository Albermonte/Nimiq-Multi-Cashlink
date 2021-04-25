export interface MultiCashlink {
	amount: number;
	nTx: number;
	fee: "free" | "standard" | "express";
}

export interface Cashlink {
	address: string;
	url: string;
}
