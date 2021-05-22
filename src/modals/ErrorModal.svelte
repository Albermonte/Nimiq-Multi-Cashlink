<script lang="ts">
	import { showModal } from "../store";

	export let errorMessage: string;
	export let handleRetry: Function;
	export let handleRetryText: string;
</script>

<div class="container">
	<h2 class="header nq-h2">Ups, an unexpected error happened</h2>
	<p class="message">{errorMessage || "¯\\_(ツ)_/¯"}</p>
	<div class="footer" style="justify-content: {handleRetry ? 'space-between' : 'center'}">
		<button class="nq-button-pill red" on:click={() => showModal.set(null)}>Close</button>
		{#if handleRetry}
			<button
				class="nq-button-pill light-blue"
				on:click={() => {
					showModal.set(null);
					handleRetry();
				}}>{handleRetryText}</button
			>
		{/if}
	</div>
</div>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin: auto;
		width: 95%;
		height: 35rem;

		.header {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 5rem;
		}

		.message {
			text-align: center;
		}

		.footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			height: 6rem;
		}
	}
</style>
