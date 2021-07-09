<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { Link } from "svelte-routing";
	import { accounts, client, transactions } from "nimiq-svelte-stores";
	import Nimiq from "@nimiq/core-web";
	import type { ClientTransactionDetails } from "@nimiq/core-web/types";
	const { Client } = Nimiq;

	import { latestCashlinks, cashlinkArray } from "../store";
	import type { CashlinkStore } from "../store";
	import { isClientReady } from "../services/Nimiq";
	import { sleep } from "../services";

	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "Success";
	let copyButtonText = "Copy All";
	let fundedAmount = 0;
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
		$latestCashlinks = cashlinks;
	};

	const updateTitle = () => {
		if (allFunded) return;
		if (cashlinks.length === fundedAmount) {
			console.log("Updating Title");
			if (!allFunded) {
				console.log("allFunded", allFunded);
				updateStore();
			}
			allFunded = true;
			document.title = "Ready to share";
		} else {
			allFunded = false;
			document.title = `${fundedAmount}/${cashlinks.length} funded`;
		}
	};

	const latestUnsubscribe = latestCashlinks.subscribe(($) => {
		if (!$.length) return;
		fundedAmount = 0;
		cashlinks = $;
		cashlinks.forEach((x) => {
			if (x.funded) fundedAmount++;
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
						if (index === txArray.length - 1 && !allFunded) updateStore();
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
						if (index === txArray.length - 1 && !allFunded) updateStore();
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
					updateStore();
				}
			} else {
				if (index >= 0) {
					cashlinks[index].claimed = false;
				}
			}
		});
	});

	const copyToClipboard = () => {
		let str = "";
		for (const cashlink of $latestCashlinks) str += `${cashlink.url}\n`;
		const el = document.createElement("textarea");
		el.value = str;
		el.setAttribute("readonly", "");
		el.style.position = "absolute";
		el.style.left = "-9999px";
		document.body.appendChild(el);
		el.select();
		document.execCommand("copy");
		document.body.removeChild(el);
		copyButtonText = "Copied!";
		setTimeout(() => (copyButtonText = "Copy All"), 3000);
	};

	onMount(async () => {
		await isClientReady();
		await client.waitForConsensusEstablished();
		const accountsArray = $cashlinkArray.map(({ recipient, claimed }) => (!claimed ? recipient : undefined)).filter((x) => x !== undefined);
		if (!accountsArray.length) return;
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
			console.log(`${accs.length} of ${accountsArray.length} accounts added`);
			if (every || accs.length === 1) {
				console.log("Adding more accounts");
				accounts.add(accountsArray.slice(rangeStart, rangeEnd));
				rangeStart = rangeEnd;
				rangeEnd += rangeEnd;
			}
			// accountsArray.length + 1 account from temp wallet
			if (accs.length >= accountsArray.length + 1) accUnsubscribe();
		});
	});

	// Unsubscribe when leaving page
	onDestroy(() => {
		transactionsUnsubscribe();
		accountUnsubscribe();
		latestUnsubscribe();
	});
</script>

<main>
	{#if cashlinks.length === 0}
		<p>
			You don't have any recent cashlink, to generate new ones go to
			<Link to="/">Home</Link>
			If you want to check the history go to <a href="/history">History</a>
		</p>
	{:else}
		<h1 class="nq-h1">{pageName}!</h1>
		{#if allFunded}
			<p>Your Cashlinks are all ready, share them with the world 🙌🏼</p>
		{:else}
			<p>
				{`${fundedAmount}/${cashlinks.length}`} Cashlinks funded, but you can already share them 🙌🏼
			</p>
		{/if}
		<button class="nq-button-pill blue" on:click={copyToClipboard}>{copyButtonText}</button>
		{#each cashlinks as cashlink, i}
			<CashlinkItem index={i} {cashlink} />
		{/each}
	{/if}
</main>

<style>
	main {
		display: grid;
		place-items: center;
		height: 100%;
		padding-bottom: 5rem;
	}

	h1 {
		text-transform: uppercase;
		font-size: 3.5em;
		font-weight: 100;
	}
</style>
