<script lang="ts">
	import { initNimiq } from "../services/Nimiq";

	let isConsensusSelected = false;
	const selectConsensus = (consensus: "light" | "nano") => {
		isConsensusSelected = true;
		initNimiq(consensus);
	};
</script>

<main class="w-200">
	{#if isConsensusSelected}
		<svg
			height="48"
			width="54"
			viewBox="0 0 54 48"
			color="#1F2348"
			class="loading-spinner"
		>
			<path
				id="big-hex"
				d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
				stroke="currentColor"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
				opacity="0.4"
				stroke-dasharray="92.5 60"
			/>
			<path
				id="small-hex"
				d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
				stroke="currentColor"
				stroke-width="3"
				fill="none"
				stroke-linecap="round"
				stroke-dasharray="47.5 105"
			/>
		</svg>
		<p>Waiting for consensus...</p>
	{:else}
		<div>
			<h1>Consensus Selection</h1>
			<span
				>You need to choose which type of consensus you want to use,
				each has its pros and cons</span
			>
			<div class="container">
				<div class="column">
					<h2>Nano Consensus</h2>
					<details>
						<summary>Pros & Cons</summary>
						<span>Pros:</span>
						<ul>
							<li>Fastest to reach consensus</li>
							<li>Lowest resource usage</li>
						</ul>
						<span>Cons:</span>
						<ul>
							<li>
								The check for claimed Cashlinks is slower when
								there are many Cashlinks
							</li>
							<li>
								The fund of the Cashlink is slower when there
								are many Cashlinks
							</li>
						</ul>
					</details>

					<i>Recommended for phones or less than 100 Cashlinks</i>
					<button
						class="nq-button-pill light-blue"
						id="nano-consensus"
						on:click={() => selectConsensus("nano")}
						>Use Nano</button
					>
				</div>
				<div class="column">
					<h2>Light Consensus</h2>
					<details>
						<summary>Pros & Cons</summary>
						<span>Pros:</span>
						<ul>
							<li>
								The check for claimed Cashlinks is almost
								instant
							</li>
							<li>
								The time it takes to get all of Cashlink funded
								is much shorter
							</li>
						</ul>
						<span>Cons:</span>
						<ul>
							<li>
								Slower to reach consensus, can take some minutes
								and even more time on phones
							</li>
							<li>More resource usage</li>
						</ul>
					</details>
					<i>Recommended for PC and any amount of Cashlinks</i>
					<button
						class="nq-button-pill green"
						id="light-consensus"
						on:click={() => selectConsensus("light")}
						>Use Light</button
					>
				</div>
			</div>
		</div>
	{/if}
</main>

<style lang="scss">
	main {
		height: auto;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 5rem;
		margin-top: 1.5rem;
	}

	.w-200 {
		width: 150rem;
		max-width: 90vw;
	}

	#big-hex {
		stroke-dashoffset: -40.5;
		animation: big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
	}
	#small-hex {
		stroke-dashoffset: 13;
		animation: small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
	}
	@keyframes small-hex {
		0% {
			stroke-dashoffset: 13;
		}
		17% {
			stroke-dashoffset: 38.42;
		}
		33% {
			stroke-dashoffset: 63.84;
		}
		50% {
			stroke-dashoffset: 89.25;
		}
		67% {
			stroke-dashoffset: 114.66;
		}
		83% {
			stroke-dashoffset: 140.08;
		}
		100% {
			stroke-dashoffset: 165.5;
		}
	}
	@keyframes big-hex {
		0% {
			stroke-dashoffset: -40.5;
		}
		17% {
			stroke-dashoffset: -15.08;
		}
		33% {
			stroke-dashoffset: 10.33;
		}
		50% {
			stroke-dashoffset: 35.75;
		}
		67% {
			stroke-dashoffset: 61.17;
		}
		83% {
			stroke-dashoffset: 86.58;
		}
		100% {
			stroke-dashoffset: 112;
		}
	}

	.container {
		display: grid;
		grid-template-rows: 1fr;
		grid-template-columns: repeat(2, 1fr);
		gap: 4rem;
	}

	@media (max-width: 800px) {
		.container {
			grid-template-columns: 1fr;
		}
	}

	.column {
		display: flex;
		flex-direction: column;
	}

	.column i {
		margin-top: auto;
		font-size: 0.9em;
		color: #7e7e7e;
	}

	button {
		width: 16rem;
		text-transform: uppercase;
		margin-top: 2rem;
		margin-left: auto;
		margin-right: auto;
	}

	details {
		border: 1px solid #aaa;
		border-radius: 4px;
		padding: 0.5em 0.5em 0;
	}

	summary {
		font-weight: bold;
		margin: -0.5em -0.5em 0;
		padding: 0.5em;
		cursor: pointer;
	}

	details[open] {
		padding: 0.5em;
	}

	details[open] summary {
		border-bottom: 1px solid #aaa;
		margin-bottom: 0.5em;
	}
</style>
