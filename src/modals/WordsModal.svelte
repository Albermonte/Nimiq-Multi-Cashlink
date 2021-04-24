<script lang="ts">
	import { wallet, showModal } from "../store";
	import { createMultiCashlinks } from "../service";
	/**
	 * Retrieves 24 words from the generated wallet
	 */
	let privateKeyMnemonic: string[] = [];
	const nimiqWallet = $wallet;
	privateKeyMnemonic = Nimiq.MnemonicUtils.entropyToMnemonic(
		nimiqWallet.keyPair.privateKey.serialize(),
	);
	export const mnemonic = privateKeyMnemonic.join(" ");
</script>

<main>
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
		height: 20rem;

		.words {
			text-align: center;
		}

		.footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			height: 100%;
		}
	}
</style>
