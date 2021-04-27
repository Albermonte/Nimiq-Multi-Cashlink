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
