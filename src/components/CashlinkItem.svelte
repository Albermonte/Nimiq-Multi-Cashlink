<script lang="ts">
	import { bind } from "svelte-simple-modal";
	import ShareCashlinkModal from "../modals/ShareCashlinkModal.svelte";
	import { showModal } from "../store";
	import type { CashlinkStore } from "../store";

	export let cashlink: CashlinkStore;
	export let index: number;

	let copyButtonText = "Copy";

	const copyToClipboard = () => {
		let str = cashlink.url;
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
		setTimeout(() => (copyButtonText = "Copy"), 3000);
	};

	const openShareCashlinkModal = (index: number) => {
		showModal.set(
			bind(ShareCashlinkModal, {
				url: cashlink.url,
				message: cashlink.message,
				index,
			})
		);
	};
</script>

<div class="nq-card">
	<div class="container">
		<div class="row">
			<div class="index">
				{index + 1}.
			</div>
			<div class="amount">
				{cashlink.amount} NIM
			</div>
		</div>
		<div class="row">
			<div class="status">
				{#if cashlink.claimed}
					<p class="nq-button-s light-blue">Claimed</p>
				{:else if cashlink.funded}
					<p class="nq-button-s green">Funded</p>
				{:else}
					<p class="nq-button-s orange">Pending</p>
					<!-- TODO: if error, show error pill and show a button to refund cashlink -->
				{/if}
			</div>
			<button
				class="copy"
				id="copyCashlink"
				data-tooltip={copyButtonText}
				on:click={copyToClipboard}
				on:keypress={copyToClipboard}
			>
				<svg class="nq-icon">
					<use
						xlink:href={`${location.origin}/nimiq/nimiq-style.icons.svg#nq-copy`}
					/>
				</svg>
			</button>
			<button
				class="share"
				data-tooltip={"Social Media Share"}
				on:click={() => openShareCashlinkModal(index)}
				on:keypress={() => openShareCashlinkModal(index)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="22px"
					height="22px"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	.nq-card {
		max-width: max-content;
		min-width: min-content;
	}

	.container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 3rem;
		max-width: 94vw;
		width: 75rem;
	}

	.index {
		color: var(--nimiq-blue);
		font-weight: 600;
		font-size: 2.25rem;
	}

	.amount {
		color: var(--nimiq-blue);
		opacity: 0.6;
		font-weight: 700;
		font-size: 2.3rem;
		text-align: left;
	}

	.status {
		display: flex;
		justify-content: center;
	}

	.copy {
		display: flex;
		justify-content: center;
		color: var(--nimiq-blue-darkened);
		border-width: 0;
		background-color: transparent;
		svg {
			cursor: pointer;
		}
	}

	.share {
		display: flex;
		justify-content: center;
		color: var(--nimiq-blue-darkened);
		border-width: 0;
		background-color: transparent;
		svg {
			cursor: pointer;
		}
	}

	.nq-button-s {
		cursor: auto;
	}

	.row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
</style>
