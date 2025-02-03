<script lang="ts">
	import Footer from 'components/Footer.svelte';
	import { onMount } from "svelte";
	import Modal from "svelte-simple-modal";
	import ConsensusModal from "src/modals/ConsensusModal.svelte";
	import { showModal } from "$lib/store";
	import '../app.css';
	import { initNimiq } from "src/lib/services/Nimiq";
	let { children } = $props();

	onMount(() => {
		showModal.set(ConsensusModal);
		initNimiq();
	});
</script>

<main>
	<nav>
		<a href="/">Home</a>
		<a href="about">About</a>
		<a href="history">History</a>
	</nav>
	{@render children()}
	<Footer />
</main>

<Modal
	show={$showModal}
	closeButton={false}
	closeOnEsc={false}
	closeOnOuterClick={false}
	styleWindow={{
		width: "100%",
		height: "min-content",
		minWidth: "min-content",
		maxWidth: "120rem",
	}}
/>

<style lang="scss">
	main {
		height: calc(100vh - 21px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
</style>