export interface MultiCashlink {
	amount: number;
	nTx: number;
	fee: "free" | "normal" | "fast";
}

export interface Cashlink {
	address: string;
	url: string;
}
