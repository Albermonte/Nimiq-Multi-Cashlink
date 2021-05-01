<script lang="ts">
	import { consensus, height } from "nimiq-svelte-stores";
	import { balance } from "./store";
	import { isDev } from "./services";
</script>

<footer>
	<div class="network">
		<div class="consensus">
			{#if $consensus === "loading"}
				<div class="consensus-loading loading">{$consensus}</div>
			{:else if $consensus === "connecting"}
				<div class="consensus-connecting loading">{$consensus}</div>
			{:else if $consensus === "syncing"}
				<div class="consensus-syncing loading">{$consensus}</div>
			{:else if $consensus === "established"}
				<div class="consensus-established">{$consensus}</div>
			{/if}
		</div>

		<!-- TODO: do smthg with this -->
		<div class="question-mark">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
					clip-rule="evenodd"
				/>
			</svg>
		</div>
	</div>
	{#if $consensus === "established"}
		<div class="wallet">
			{#if isDev}
				<span>
					Head: {$height}
				</span>
			{/if}
			<span>
				Local Balance: {$balance} NIM
			</span>
		</div>
	{/if}
</footer>

<style lang="scss">
	footer {
		position: fixed;
		bottom: 0;
		width: 100%;
		background: var(--nimiq-blue-bg-darkened);
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--nimiq-white);
		font-size: 0.75em;
		z-index: 3;

		.network {
			display: flex;
			align-items: baseline;
			height: 100%;

			.consensus {
				min-width: 100px;
				text-align: center;
				text-transform: capitalize;

				> div {
					padding: 0.25rem 0;
				}

				.consensus-established {
					background: var(--nimiq-green-bg);
					color: var(--nimiq-light-gray);
				}

				.consensus-syncing,
				.consensus-connecting,
				.consensus-loading {
					background: var(--nimiq-gold-darkened);
					color: var(--nimiq-light-gray);
				}

				.loading:after {
					content: ".";
					animation: dots 1.05s steps(5, end) infinite;
				}

				@keyframes dots {
					0%,
					20% {
						color: rgba(0, 0, 0, 0);
						text-shadow: 0.25em 0 0 rgba(0, 0, 0, 0), 0.5em 0 0 rgba(0, 0, 0, 0);
					}
					40% {
						color: white;
						text-shadow: 0.25em 0 0 rgba(0, 0, 0, 0), 0.5em 0 0 rgba(0, 0, 0, 0);
					}
					60% {
						text-shadow: 0.25em 0 0 white, 0.5em 0 0 rgba(0, 0, 0, 0);
					}
					80%,
					100% {
						text-shadow: 0.25em 0 0 white, 0.5em 0 0 white;
					}
				}
			}

			.question-mark {
				color: var(--nimiq-white);
				margin-left: 1rem;
				cursor: pointer;

				> svg {
					height: 100%;
					width: 1.5rem;
				}
			}
		}

		.wallet {
			font-size: 0.85em;
			span {
				margin-right: 1.25rem;
			}
		}
	}
</style>
