<script lang="ts">
	import * as Nimiq from "@nimiq/core";
	import { wallet, showModal } from "$lib/store";
	import { createMultiCashlinks } from "$lib/services";
	import { get } from "svelte/store";
	/**
	 * Retrieves 24 words from the generated wallet
	 */
	let privateKeyMnemonic: string[] = [];
	const nimiqWallet = $wallet;
	privateKeyMnemonic = Nimiq.MnemonicUtils.entropyToMnemonic(
		nimiqWallet!.privateKey.serialize(),
	);
	export const mnemonic = privateKeyMnemonic.join(" ");

	const saveMnemonic = () => {
		const text = privateKeyMnemonic.join("\n");
		const element = document.createElement("a");
		element.setAttribute(
			"href",
			"data:text/plain;charset=utf-8," + encodeURIComponent(text),
		);
		element.setAttribute("download", "MultiCashlink_24Words.txt");

		element.style.display = "none";
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	};
</script>

<main>
	<h2 class="header nq-h2">Don't forget to save your 24 words</h2>
	<div class="download">
		<button class="nq-button-pill orange save-button" on:click={saveMnemonic}
			>Save Words <svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>
	</div>
	<p class="words">{mnemonic}</p>
	<div class="footer">
		<button class="nq-button-pill red" on:click={() => showModal.set(null)}
			>Cancel</button
		>
		<button
			class="nq-button-pill light-blue"
			on:click={() => {
				showModal.set(null);
				createMultiCashlinks();
			}}>Continue</button
		>
	</div>
</main>

<style lang="scss">
	main {
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

		.download {
			display: flex;
			justify-content: center;
			align-items: center;
			height: 3rem;
		}

		.save-button {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding-left: 2.1rem;

			svg {
				width: 18px;
				height: 18px;
				margin-left: 0.7rem;
			}
		}

		.words {
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
