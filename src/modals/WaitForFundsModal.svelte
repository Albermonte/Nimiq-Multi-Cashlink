<script lang="ts">
	import { fade } from "svelte/transition";

	const infoBites = [
		"Nimiq is a simple, secure and censorship resistant cryptocurrency",
		"Blake2b is used for hashing and ed25519 for the signatures.",
		"The Nimiq Mainnet was launched April 14, 2018.",
		// "The Nimiq Blockchain uses Non-Interactive Proofs of Proof-of-Work.",
		"Nimiq's Light clients require little data and sync fast.",
		// "Argon2d is Nimiq’s memory-bound PoW algorithm.",
		"Nimiq uses ed25519 Schnorr signatures.",
		"State is stored in an accounts tree.",
		"Nimiq is written Rust and optimized using WebAssembly.",
		"Nimiq is an Inuit word for an object or force that binds things together.",
	];

	let biteIndex = 0;
	const changeBite = () => {
		biteIndex = Math.floor(Math.random() * infoBites.length);
	};

	changeBite();
	setInterval(() => changeBite(), 10000);
</script>

<main>
	<div class="nq-card-header">
		<h2 class="nq-h2">Did you know?</h2>
	</div>
	<div class="nq-card-body">
		{#key biteIndex}
			<p in:fade={{ duration: 700 }} class="infoBite">
				{infoBites[biteIndex]}
			</p>
		{/key}
	</div>
	<div class="nq-card-footer">
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
		<p class="nq-notice info">Waiting for payment confirmation...</p>
	</div>
</main>

<style lang="scss">
	main {
		height: 32rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
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

	.infoBite {
		text-align: center;
	}

	.nq-card-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		p {
			opacity: 0.9;
			font-style: italic;
			margin: 2rem auto 1rem;
			font-size: 0.8em;
			justify-self: end;
		}
	}
</style>
