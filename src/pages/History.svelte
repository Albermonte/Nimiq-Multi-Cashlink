<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { accounts, client, height, transactions } from "nimiq-svelte-stores";
	import Nimiq from "@nimiq/core-web";
	import type { ClientTransactionDetails } from "@nimiq/core-web/types";
	const { Client } = Nimiq;

	import { cashlinkArray, isStillUpdating } from "../store";
	import type { CashlinkStore } from "../store";
	import { isClientReady } from "../services/Nimiq";
	import { claimUnclaimedCashlinks, deletePendingCashlinks, deleteClaimedCashlinks, sleep, analyticsInstance, isDev } from "../services";

	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "History";
	document.title = pageName;

	let fundedAmount = 0;
	let claimedAmount = 0;
	let allFunded = false;
	let cashlinks: Array<CashlinkStore> = [];

	const updateStore = () => {
		console.log("Updating Store");
		cashlinks.forEach((x) => {
			const index = $cashlinkArray.findIndex((cashlink) => cashlink.tx.transactionHash === x.tx.transactionHash);
			$cashlinkArray[index] = x;
		});

		// Force Svelte to update store
		$cashlinkArray = $cashlinkArray;
	};

	const updateTitle = () => {
		if (cashlinks.length === fundedAmount) {
			allFunded = true;
			try {
				// Cashlinks in History
				if ($cashlinkArray.length && !isDev)
					analyticsInstance.action("a883e4a7-3c86-4595-9d6d-31c5bccc48eb", { key: "Cashlinks", value: cashlinks.length });
			} catch (e) {
				// TODO: Add Sentry logs
			}
		}
		document.title = `History - ${claimedAmount}/${fundedAmount} claimed/funded`;
	};

	const cashlinkArrayUnsubscribe = cashlinkArray.subscribe(($) => {
		fundedAmount = 0;
		claimedAmount = 0;
		cashlinks = $;
		cashlinks.forEach((x) => {
			if (x && x.funded) fundedAmount++;
			if (x && x.claimed) claimedAmount++;
		});
		updateTitle();
	});

	const transactionsUnsubscribe = transactions.subscribe((txArray) => {
		if (allFunded) return;
		fundedAmount = 0;
		txArray.forEach(async (txDetails: ClientTransactionDetails) => {
			if (!txDetails) return;
			switch (txDetails.state) {
				case Nimiq.Client.TransactionState.MINED: {
					// Transaction has been confirmed once
					const index = cashlinks.findIndex((cashlink) => cashlink.tx.transactionHash === txDetails.transactionHash.toHex());
					if (index >= 0) {
						fundedAmount++;
						cashlinks[index].funded = true;
						updateTitle();
					}
					break;
				}
				case Nimiq.Client.TransactionState.CONFIRMED: {
					// Transaction has been confirmed ten times
					const index = cashlinks.findIndex((cashlink) => cashlink.tx.transactionHash === txDetails.transactionHash.toHex());
					if (index >= 0) {
						fundedAmount++;
						cashlinks[index].funded = true;
						updateTitle();
					}
					break;
				}
				case Nimiq.Client.TransactionState.EXPIRED:
					console.log(`${txDetails.transactionHash.toHex()} Expired`);
					break;
				case Nimiq.Client.TransactionState.INVALIDATED:
					console.log(`${txDetails.transactionHash.toHex()} Invalidated`);
					const tx = await client.getTransaction(txDetails.transactionHash.toHex());
					if (tx.state === Client.TransactionState.MINED || tx.state === Client.TransactionState.CONFIRMED) {
						const index = cashlinks.findIndex((cashlink) => cashlink.tx.transactionHash === txDetails.transactionHash.toHex());
						if (index >= 0) {
							fundedAmount++;
							cashlinks[index].funded = true;
							updateTitle();
						}
					}
					break;
			}
		});
	});

	const accountUnsubscribe = accounts.subscribe((accountsArray) => {
		// All Cashlinks account + stored wallet account
		if (accountsArray.length <= 1) return;
		accountsArray.forEach((account) => {
			const index = cashlinks.findIndex((cashlink) => cashlink.recipient === account.address.toUserFriendlyAddress());
			if (account.balance === 0) {
				if (index >= 0 && cashlinks[index].funded) {
					cashlinks[index].claimed = true;
					accounts.remove(account.address.toUserFriendlyAddress());
					// updateStore();
				}
			} else {
				if (index >= 0) {
					cashlinks[index].claimed = false;
					cashlinks[index].funded = true;
				}
			}
		});
	});

	const heightUnsubscribe = height.subscribe(async () => {
		// Wait 10 second before saving to store
		await sleep(10);
		updateStore();
	});

	onMount(async () => {
		$isStillUpdating = true;
		await isClientReady();
		await client.waitForConsensusEstablished();
		const accountsArray = $cashlinkArray.map(({ recipient, claimed }) => (!claimed ? recipient : undefined)).filter((x) => x !== undefined);
		if (!accountsArray.length) {
			$isStillUpdating = false;
			return;
		}
		let rangeStart = 0;
		let rangeEnd = 50;
		let waiting = false;
		const accUnsubscribe = accounts.subscribe(async (accs) => {
			if (waiting) return;
			const every = accs.every((x) => x.balance !== undefined);
			if (!every && accs.length !== 1) {
				waiting = true;
				console.log("Sleeping");
				await sleep(10); // Give some time if not all accounts ready
				waiting = false;
			}
			console.log(`${Math.max(rangeEnd, accs.length)} of ${accountsArray.length} accounts added`);
			if (every || accs.length === 1) {
				console.log("Adding more accounts");
				accounts.add(accountsArray.slice(rangeStart, rangeEnd));
				rangeStart = rangeEnd;
				rangeEnd += rangeEnd;
			}
			// accountsArray.length + 1 account from temp wallet
			if (Math.max(rangeEnd, accs.length) >= accountsArray.length + 1 && accs.length > 1) {
				console.log("Stop updating");
				$isStillUpdating = false;
				accUnsubscribe();
			}
		});
	});

	// Unsubscribe when leaving page
	onDestroy(() => {
		transactionsUnsubscribe();
		accountUnsubscribe();
		heightUnsubscribe();
		cashlinkArrayUnsubscribe();
	});
</script>

<div class="main">
	<h1 class="nq-h1 nq-blue">{pageName}</h1>
	{#if $cashlinkArray.length === 0}
		<p>
			You don't have any cashlink created yet, to generate new ones go to
			<a href="/">Home</a>
		</p>
	{:else}
		<p>
			{$cashlinkArray.length} Cashlinks, {fundedAmount} funded and {claimedAmount}
			claimed
		</p>
		<div class="buttons-container">
			<div class="buttons">
				<button class="nq-button-pill green" on:click={claimUnclaimedCashlinks}>Claim Unclaimed</button>
				<button class="nq-button-pill orange" on:click={deletePendingCashlinks}>Delete Pending</button>
				<button class="nq-button-pill red" on:click={deleteClaimedCashlinks}>Delete Claimed</button>
			</div>
			{#if $isStillUpdating}
				<div class="spinner-container">
					<svg
						class="circle-spinner"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 18 18"
						width="18"
						height="18"
						fill="none"
						stroke-width="2"
						stroke-linecap="round"
						><path stroke="#0582CA" d="M9,1c4.42,0,8,3.58,8,8" /><path
							stroke="#1F2348"
							opacity=".3"
							d="M4.27,2.56C2.29,4.01,1,6.35,1,9c0,4.42,3.58,8,8,8c2.65,0,4.99-1.29,6.44-3.27"
						/></svg
					>
				</div>
			{/if}
		</div>
		{#each $cashlinkArray as cashlink, index}
			{#if cashlink}
				<CashlinkItem {index} {cashlink} />
			{/if}
		{/each}
	{/if}
</div>

<style lang="scss">
	.main {
		display: grid;
		place-items: center;
		height: 100%;
		padding-bottom: 5rem;
	}

	.buttons-container {
		display: flex;
		align-items: center;
		width: 92%;
	}

	.buttons {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 1rem 0;

		button {
			margin: 0 1rem;
		}
	}

	.spinner-container {
		display: flex;
	}

	.circle-spinner {
		animation: circle-spinner-spin 1s linear infinite;
	}
	@keyframes circle-spinner-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
