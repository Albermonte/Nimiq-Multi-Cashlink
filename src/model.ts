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

export const CashlinkExtraData = {
	FUNDING: new Uint8Array([0, 130, 128, 146, 135]), // 'CASH'.split('').map(c => c.charCodeAt(0) + 63)
	CLAIMING: new Uint8Array([0, 139, 136, 141, 138]), // 'LINK'.split('').map(c => c.charCodeAt(0) + 63)
};
