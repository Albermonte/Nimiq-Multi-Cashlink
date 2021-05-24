<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { accounts, client, height, transactions } from "nimiq-svelte-stores";
	import Nimiq from "@nimiq/core-web";
	import type { ClientTransactionDetails } from "@nimiq/core-web/types";
	const { Client } = Nimiq;

	import { cashlinkArray } from "../store";
	import type { CashlinkStore } from "../store";
	import { isClientReady } from "../services/Nimiq";
	import { claimUnclaimedCashlinks, deletePendingCashlinks, deleteClaimedCashlinks } from "../services";

	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "History";
	document.title = pageName;

	let stillUpdating = false;
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
		if (cashlinks.length === fundedAmount) allFunded = true;
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
			if (txDetails) {
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
			}
		});
	});

	const accountUnsubscribe = accounts.subscribe((accountsArray) => {
		// All Cashlinks account + stored wallet account
		if (accountsArray.length <= 1) return;
		accountsArray.forEach((account) => {
			if (account.balance === 0) {
				const index = cashlinks.findIndex((cashlink) => cashlink.recipient === account.address.toUserFriendlyAddress());
				if (index >= 0 && cashlinks[index].funded) {
					cashlinks[index].claimed = true;
					accounts.remove(account.address.toUserFriendlyAddress());
					updateStore();
				}
			} else {
				const index = cashlinks.findIndex((cashlink) => cashlink.recipient === account.address.toUserFriendlyAddress());
				if (index >= 0) {
					cashlinks[index].claimed = false;
				}
			}
		});
	});

	const heightUnsubscribe = height.subscribe(async () => {
		// Wait 10 second before saving to store
		await new Promise((resolve) => setTimeout(resolve, 10 * 1e3));
		updateStore();
	});

	onMount(async () => {
		await isClientReady();
		await client.waitForConsensusEstablished();
		const accountsArray = $cashlinkArray.map(({ recipient, claimed }) => {
			if (!claimed) return recipient;
		});
		accounts.add(accountsArray.filter((x) => x !== undefined));
	});

	// Unsubscribe when leaving page
	onDestroy(() => {
		transactionsUnsubscribe();
		accountUnsubscribe();
		heightUnsubscribe();
		cashlinkArrayUnsubscribe();
	});
</script>

<main>
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
		{#if stillUpdating}
			<span class="small-message"><i>Still updating, might be slow</i></span>
		{/if}
		<div class="buttons">
			<button class="nq-button-pill green" on:click={claimUnclaimedCashlinks}>Claim Unclaimed</button>
			<button class="nq-button-pill orange" on:click={deletePendingCashlinks}>Delete Pending</button>
			<button class="nq-button-pill red" on:click={deleteClaimedCashlinks}>Delete Claimed</button>
		</div>
		{#each $cashlinkArray as cashlink, index}
			{#if cashlink}
				<CashlinkItem {index} {cashlink} />
			{/if}
		{/each}
	{/if}
</main>

<style lang="scss">
	main {
		display: grid;
		place-items: center;
		height: 100%;
		padding-bottom: 5rem;
	}

	.small-message {
		opacity: 0.7;
		font-size: 1.5rem;
		margin-top: -12px;
	}

	.buttons {
		display: flex;
		padding: 1rem 0;

		button {
			margin: 0 1rem;
		}
	}
</style>
