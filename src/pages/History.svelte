<script lang="ts">
	import { onDestroy } from "svelte";
	import { height, client } from "nimiq-svelte-stores";
	import Nimiq from "@nimiq/core-web";
	const { Client } = Nimiq;

	import { cashlinkArray } from "../store";
	import type { CashlinkStore } from "../store";
	import { isClientReady } from "../services/Nimiq";
	import { claimUnclaimedCashlinks, deletePendingCashlinks, deleteClaimedCashlinks, analyticsInstance, isDev } from "../services";

	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "History";
	document.title = pageName;

	let stillUpdating = false;
	let fundedAmount = 0;
	let claimedAmount = 0;
	let cashlinks: Array<CashlinkStore> = [];
	const cashlinkArrayUnsubscribe = cashlinkArray.subscribe(($) => {
		fundedAmount = 0;
		claimedAmount = 0;
		cashlinks = $;
		cashlinks.forEach((x) => {
			if (x && x.funded) fundedAmount++;
			if (x && x.claimed) claimedAmount++;
		});

		document.title = `History - ${claimedAmount}/${fundedAmount} claimed/funded`;
		if (cashlinks.length === fundedAmount && cashlinks.length === claimedAmount) {
			stillUpdating = false;
			try {
				// Cashlinks in History
				if (cashlinks.length && !isDev)
					analyticsInstance.action("a883e4a7-3c86-4595-9d6d-31c5bccc48eb", { key: "Cashlinks", value: cashlinks.length });
			} catch (e) {
				// TODO: Add Sentry logs
			}
		}
	});

	// Check every cashlink state on head change
	const heightUnsubscribe = height.subscribe(async () => {
		// Wait 1 second before checking so the page can be loaded
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await isClientReady();
		await client.waitForConsensusEstablished();

		if (!cashlinks.length) return;

		for (const [i, cashlink] of cashlinks.entries()) {
			if (cashlink && !cashlink.claimed) {
				try {
					if (cashlink.funded) {
						const recipient = await client.getAccount(cashlink.recipient);
						if (recipient.balance === 0) cashlink.claimed = true; // TODO: native notification when claimed and from which address was claimed? Time and more info?
						// TODO: if not funded give option to resend to pending cashlinks, automatic and ask user before?
						// Check if not mined or node didn't share info with us
						cashlinks[i] = cashlink;
					} else {
						const tx = await client.getTransaction(cashlink.txhash);
						if (tx.state === Client.TransactionState.MINED || tx.state === Client.TransactionState.CONFIRMED) {
							cashlink.funded = true;
							cashlinks[i] = cashlink;
						}
					}
				} catch (e) {
					if (e.toString().includes("Failed to retrieve transaction receipts") || e.toString().includes("Failed to retrieve accounts")) {
						console.log("Nodes don't want to share info :(");
						stillUpdating = true;
					} else console.log(`Tx: ${cashlink.txhash} not mined`, e);
				}
			}
			cashlinkArray.set(cashlinks);
		}
	});

	onDestroy(() => {
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
