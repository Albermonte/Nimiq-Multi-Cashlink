<script>
	import { Link } from "svelte-routing";

	import { latestCashlinks } from "../store";
	import { deleteClaimedCashlinks, deletePendingCashlinks } from "../service";

	let pageName = "Success";
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
		<button class="nq-button-pill red" on:click={deleteClaimedCashlinks}
			>Delete Claimed</button
		>
		<button class="nq-button-pill orange" on:click={deletePendingCashlinks}
			>Delete Pending</button
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
