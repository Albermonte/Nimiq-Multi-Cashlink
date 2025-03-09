<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { client } from "src/lib/services/Nimiq";

	import {
		cashlinkArray,
		isStillUpdating,
		headHeight,
		wallet,
	} from "$lib/store";
	import type { CashlinkStore } from "$lib/store";
	import {
		claimUnclaimedCashlinks,
		deletePendingCashlinks,
		deleteClaimedCashlinks,
		sleep,
	} from "$lib/services";

	import CashlinkItem from "components/CashlinkItem.svelte";

	let pageName = "History";

	let fundedAmount = 0;
	let claimedAmount = 0;
	let allFunded = false;
	let allClaimed = false;
	// let cashlinks: Array<CashlinkStore> = [];

	let isUpdatingStore = false;
	const updateStore = () => {
		if (isUpdatingStore) return;
		isUpdatingStore = true;
		console.log("Updating Store");
		try {
			// cashlinks.forEach((x) => {
			// 	const index = $cashlinkArray.findIndex(
			// 		(cashlink) => cashlink.tx.transactionHash === x.tx.transactionHash,
			// 	);
			// 	$cashlinkArray[index] = x;
			// });

			// Force Svelte to update store
			// $cashlinkArray = $cashlinkArray;
		} catch (e) {
			console.error(e);
		} finally {
			isUpdatingStore = false;
		}
	};

	const updateTitle = () => {
		if ($cashlinkArray.length === fundedAmount) allFunded = true;
		if ($cashlinkArray.length === claimedAmount) allClaimed = true;
		pageName = `History - ${claimedAmount}/${fundedAmount} claimed/funded`;
	};

	let isUpdatingTransactions = false;
	const updateTransactions = async () => {
		if (!client || !$wallet || isUpdatingTransactions || allFunded) return;
		isUpdatingTransactions = true;
		try {
			const txArray = await client.getTransactionsByAddress(
				$wallet.toAddress(),
			);
			for (const tx of txArray) {
				const index = $cashlinkArray.findIndex(
					(cashlink) => cashlink.tx.transactionHash === tx.transactionHash,
				);
				if (
					index >= 0 &&
					(tx.state === "included" || tx.state === "confirmed")
				) {
					$cashlinkArray[index].funded = true;
					updateTitle();
					// if (index === txArray.length - 1) updateStore();
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
		console.log("Updating Accounts", {
			client,
			wallet,
			isUpdatingAccounts,
			allClaimed,
		});
		if (!client || !$wallet || isUpdatingAccounts || allClaimed) return;
		isUpdatingAccounts = true;
		console.log("Updating Accounts");
		try {
			const allAccounts = $cashlinkArray
				.map(({ recipient, claimed }) => (!claimed ? recipient : undefined))
				.filter((x) => x !== undefined);

			// getAccounts has a limit of 500 account
			for (let i = 0; i < allAccounts.length; i += 500) {
				const accountsArray = allAccounts.slice(i, i + 500);
				const accounts = await client.getAccounts(accountsArray);

				for (const acc of accounts) {
					const index = $cashlinkArray.findIndex(
						(cashlink) =>
							cashlink.recipient === accountsArray[accounts.indexOf(acc)],
					);
					if (index >= 0 && acc.balance === 0 && $cashlinkArray[index].funded) {
						$cashlinkArray[index].claimed = true;
					}
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			isUpdatingAccounts = false;
		}
	};

	const heightUnsubscribe = headHeight.subscribe(async (height) => {
		if (height === 0 || height % 30 !== 0 || $isStillUpdating) return;
		$isStillUpdating = true;
		await Promise.all([updateTransactions(), updateAccounts()]);
		// Wait 10 second before saving to store
		await sleep(10);
		// updateStore();
		$isStillUpdating = false;
	});

	const cashlinkArrayUnsubscribe = cashlinkArray.subscribe((cashlinksStore) => {
		if (cashlinksStore.length === 0) return;
		// cashlinks = $cashlinkArray;
		fundedAmount = 0;
		claimedAmount = 0;
		cashlinksStore.forEach((x) => {
			if (x.funded) fundedAmount++;
			if (x.claimed) claimedAmount++;
		});
	});

	onMount(async () => {
		$isStillUpdating = true;
		await client?.waitForConsensusEstablished();
		// cashlinks = $cashlinkArray;
		await Promise.all([updateTransactions(), updateAccounts()]);
		// updateStore()
		$isStillUpdating = false;
	});

	// Unsubscribe when leaving page
	onDestroy(() => {
		heightUnsubscribe();
		cashlinkArrayUnsubscribe();
	});
</script>

<svelte:head>
	<title>{pageName}</title>
</svelte:head>

<div class="main">
	<h1 class="nq-h1 nq-blue">History</h1>
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
				<button class="nq-button-pill green" on:click={claimUnclaimedCashlinks}
					>Claim Unclaimed</button
				>
				<button class="nq-button-pill orange" on:click={deletePendingCashlinks}
					>Delete Pending</button
				>
				<button class="nq-button-pill red" on:click={deleteClaimedCashlinks}
					>Delete Claimed</button
				>
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
			height: fit-content;
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
