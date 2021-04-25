<script>
	import { onDestroy } from "svelte";
	import { Link } from "svelte-routing";
	import { height, client, ready } from "nimiq-svelte-stores";

	import { latestCashlinks, cashlinkArray } from "../store";

	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "Success";
	let copyButtonText = "Copy All";
	let fundedAmount = 0;
	let allFunded = false;
	let cashlinks = [];
	const latestUnsubscribe = latestCashlinks.subscribe(($) => {
		fundedAmount = 0;
		cashlinks = $;
		cashlinks.forEach((x) => {
			if (x.funded) fundedAmount++;
			const index = $cashlinkArray.findIndex(
				(cashlink) => cashlink.txhash === x.txhash,
			);
			$cashlinkArray[index] = x;
		});
		if (cashlinks.length === fundedAmount) allFunded = true;
		if (allFunded) document.title = "Ready to share";
		else document.title = `${fundedAmount}/${cashlinks.length} funded`;

		// Force Svelte to update store
		$cashlinkArray = $cashlinkArray;
	});

	const waitForReadyState = async () => {
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

		if (!cashlinks.length) return;

		for (const [i, cashlink] of cashlinks.entries()) {
			if (!cashlink.claimed) {
				try {
					const tx = await client.getTransaction(cashlink.txhash);
					if (tx.state === "mined" || tx.state === "confirmed") {
						cashlink.funded = true;
						const recipient = await client.getAccount(tx.recipient);
						if (recipient.balance === 0) cashlink.claimed = true; // TODO: native notification when claimed and from which address was claimed? Time and more info?
						// TODO: if not funded give option to resend to pending cashlinks, automatic and ask user before?
						// Check if not mined or node didn't share info with us
						cashlinks[i] = cashlink;
					}
				} catch (e) {
					if (e.toString().includes("Failed to retrieve transaction receipts"))
						console.log("Nodes don't want to share info :(");
					else console.log(`Tx: ${cashlink.txhash} not mined`, e);
				}
			}
			latestCashlinks.set(cashlinks);
		}
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

	// Unsubscribe when leaving page
	onDestroy(() => {
		heightUnsubscribe();
		latestUnsubscribe();
	});
</script>

<main>
	{#if cashlinks.length === 0}
		<p>
			You don't have any recent cashlink, to generate new ones go to
			<Link to="/">Home</Link>
			If you want to check the history go to TODO:
		</p>
	{:else}
		<h1 class="nq-h1">{pageName}!</h1>
		{#if allFunded}
			<p>Your Cashlinks are all ready, share them with the world 🙌🏼</p>
		{:else}
			<p>
				{`${fundedAmount}/${cashlinks.length}`} Cashlinks funded, but you can already
				share them 🙌🏼
			</p>
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
	}

	h1 {
		text-transform: uppercase;
		font-size: 3.5em;
		font-weight: 100;
	}
</style>
