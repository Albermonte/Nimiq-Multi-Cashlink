<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { client } from "src/lib/services/Nimiq";

	import {
		latestCashlinks,
		cashlinkArray,
		wallet,
		headHeight,
	} from "$lib/store";
	import type { CashlinkStore } from "$lib/store";

	import CashlinkItem from "components/CashlinkItem.svelte";

	let pageName = "Success";
	let copyButtonText = "Copy All";
	let fundedAmount = 0;
	let claimedAmount = 0;
	let allFunded = false;
	let allClaimed = false;
	let cashlinks: Array<CashlinkStore> = [];

	const updateStore = () => {
		console.log("Updating Store");
		cashlinks.forEach((x) => {
			const index = $cashlinkArray.findIndex(
				(cashlink) => cashlink.tx.transactionHash === x.tx.transactionHash,
			);
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
			pageName = "Ready to share";
		} else if (cashlinks.length === claimedAmount) {
			allClaimed = true;
			pageName = "All claimed";
		} else {
			allFunded = false;
			pageName = `${fundedAmount}/${cashlinks.length} funded`;
		}
	};

	const latestUnsubscribe = latestCashlinks.subscribe((cashlinksStore) => {
		if (cashlinksStore.length === 0) return;
		fundedAmount = 0;
		cashlinks = cashlinksStore;
		console.log("Cashlinks", cashlinks);
		cashlinksStore.forEach((x) => {
			if (x.funded) fundedAmount++;
		});
		updateTitle();
	});

	let isUpdatingTransactions = false;
	const updateTransactions = async () => {
		if (!client || !$wallet || isUpdatingTransactions || allFunded) return;
		console.log("Updating Transactions");
		isUpdatingTransactions = true;
		try {
			const txArray = await client.getTransactionsByAddress(
				$wallet.toAddress(),
			);
			for (const tx of txArray) {
				const index = cashlinks.findIndex(
					(cashlink) => cashlink.tx.transactionHash === tx.transactionHash,
				);
				if (
					index >= 0 &&
					(tx.state === "included" || tx.state === "confirmed")
				) {
					cashlinks[index].funded = true;
					updateTitle();
					if (index === txArray.length - 1) updateStore();
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			isUpdatingTransactions = false;
		}
	};

	let isUpdatingAccounts = false;
	const updateAccounts = async () => {
		if(!allFunded) {
			console.log('Not all cashlinks are funded, delaying check account')
			return
		}
		if (!client || !$wallet || isUpdatingAccounts) return;
		console.log("Updating Accounts");
		isUpdatingAccounts = true;
		try {
			const allAccounts = $cashlinkArray
				.map(({ recipient, claimed }) => (!claimed ? recipient : undefined))
				.filter((x) => x !== undefined);

			// getAccounts has a limit of 500 account
			for (let i = 0; i < allAccounts.length; i += 500) {
				const accountsArray = allAccounts.slice(i, i + 500);
				const accounts = await client.getAccounts(accountsArray);

				for (const acc of accounts) {
					const index = cashlinks.findIndex(
						(cashlink) =>
							cashlink.recipient === accountsArray[accounts.indexOf(acc)],
					);
					if (index >= 0 && acc.balance === 0 && cashlinks[index].funded) {
						cashlinks[index].claimed = true;
					}
				}
			}

			// Update store after processing all batches
			updateStore();
		} catch (e) {
			console.error(e);
		} finally {
			isUpdatingAccounts = false;
		}
	};

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

	const heightUnsubscribe = headHeight.subscribe(async (height) => {
		if (height > 0 && height % 30 === 0) {
			await Promise.all([updateTransactions(), updateAccounts()]);
			updateStore();
		}
	});

	onMount(async () => {
		await client?.waitForConsensusEstablished();
		cashlinks = $latestCashlinks;
	});

	// Unsubscribe when leaving page
	onDestroy(() => {
		latestUnsubscribe();
		heightUnsubscribe();
	});
</script>

<svelte:head>
	<title>{pageName}</title>
</svelte:head>

<main>
	{#if cashlinks.length === 0}
		<p>
			You don't have any recent cashlink, to generate new ones go to
			<a href="/">Home</a>
			If you want to check the history go to <a href="/history">History</a>
		</p>
	{:else}
		<h1 class="nq-h1">Success!</h1>
		{#if allFunded}
			<p>Your Cashlinks are all ready, share them with the world 🙌🏼</p>
		{:else}
			<p>
				{`${fundedAmount}/${cashlinks.length}`} Cashlinks funded, but you can already
				share them 🙌🏼
			</p>
			<p>
				Don't close this window until all of them are funded
			</p>
		{/if}
		<button class="nq-button-pill blue" on:click={copyToClipboard}
			>{copyButtonText}</button
		>
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
