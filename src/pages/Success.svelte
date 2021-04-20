<script>
	import { onDestroy } from "svelte";
	import { get } from "svelte/store";
	import { Link } from "svelte-routing";
	import { height, client, ready } from "nimiq-svelte-stores";

	import { latestCashlinks } from "../store";
	import { deleteClaimedCashlinks, deletePendingCashlinks } from "../service";

	let pageName = "Success";
	let copyButtonText = "Copy All";
	let allFunded = false;

	const waitForReadyState = async () => {
		const $ready = get(ready);
		return new Promise((resolve) => {
			if ($ready) {
				resolve();
			} else {
				const readyUnsubscribe = ready.subscribe(($ready) => {
					if ($ready) {
						readyUnsubscribe();
						resolve();
					}
				});
			}
		});
	};

	// Check every cashlink state on head change
	const heightUnsubscribe = height.subscribe(async () => {
		await waitForReadyState();
		await client.waitForConsensusEstablished();

		const $latestCashlinks = get(latestCashlinks);
		if (!$latestCashlinks.length) return;

		const cashlinks = [];
		for (const cashlink of $latestCashlinks) {
			if (!cashlink.claimed) {
				try {
					const tx = await client.getTransaction(cashlink.txhash);
					if (tx.state === "mined" || tx.state === "confirmed") {
						cashlink.funded = true;
						const recipient = await client.getAccount(tx.recipient);
						if (recipient.balance === 0) cashlink.claimed = true; // TODO: native notification when claimed and from which address was claimed? Time and more info?
					}
				} catch (e) {
					console.log(`Tx: ${cashlink.txhash} not mined`, e);
				}
			}

			cashlinks.push(cashlink);
		}
		allFunded = cashlinks.every((e) => e.funded === true);
		latestCashlinks.set(cashlinks);
	});

	const copyToClipboard = () => {
		const $latestCashlinks = get(latestCashlinks);
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

	// Unsubscribe when leaving page
	onDestroy(() => {
		console.log("Height Unsubscribe");
		heightUnsubscribe();
	});
</script>

<main>
	{#if $latestCashlinks.length === 0}
		<p>
			You don't have any recent cashlink, to generate new ones go to
			<Link to="/">Home</Link>
			If you want to check the history go to TODO:
		</p>
	{:else}
		<h1>{pageName}!</h1>
		{#if allFunded}
			<p>Your Cashlinks are all ready, share them with the world 🙌🏼</p>
		{:else}
			<p>Your Cashlinks are being funded, but can be already shared 🙌🏼</p>
		{/if}
		<!-- <button class="nq-button-pill red" on:click={deleteClaimedCashlinks}
			>Delete Claimed</button
		>
		<button class="nq-button-pill orange" on:click={deletePendingCashlinks}
			>Delete Pending</button
		> -->
		<button class="nq-button-pill blue" on:click={copyToClipboard}
			>{copyButtonText}</button
		>
		{#each $latestCashlinks as cashlink, i}
			<p
				style="width: 400px; white-space: nowrap;  overflow: hidden;  text-overflow: ellipsis; margin: auto"
			>
				<a class="text-blue-600 underline" href={cashlink.url} target="_blank"
					>Cashlink {i + 1}</a
				>
				Status:
				{#if cashlink.claimed}
					<p class="nq-button-s light-blue">Claimed</p>
				{:else if cashlink.funded}
					<p class="nq-button-s green">Funded</p>
				{:else}
					<p class="nq-button-s orange">Pending</p>
				{/if}
				Amount: {cashlink.amount} NIM
			</p>
		{/each}
	{/if}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
