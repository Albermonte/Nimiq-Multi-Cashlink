<script>
	import CashlinkItem from "../components/CashlinkItem.svelte";

	let pageName = "History";
</script>

<main>
	<h1 class="nq-h1 nq-blue">{pageName}!</h1>
	<p>TODO: <b>{pageName}</b></p>

	<CashlinkItem
		index={0}
		cashlink={{
			amount: 0.0001,
			claimed: false,
			funded: true,
			txhash:
				"fad05d5f00eec5c296968536e2c6faeab32058ef0b8b900d2bd47be1f14762a7",
			url:
				"https://hub.nimiq-testnet.com/cashlink/#WqYXHGG0GozMsic_8xtUaVFDyV5uvoxhBTRC8gYumrEAAAAAAAAAChpDYXNobGluayBieSBNdWx0aSBDYXNobGluaw==",
			validityStartHeight: 1467027,
		}}
	/>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		height: 100%;
	}
</style>
