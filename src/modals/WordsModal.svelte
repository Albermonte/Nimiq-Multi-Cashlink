<script lang="ts">
	import { wallet, showModal } from "../store"
	import { createMultiCashlinks } from "../services"
	/**
	 * Retrieves 24 words from the generated wallet
	 */
	let privateKeyMnemonic: string[] = []
	const nimiqWallet = $wallet
	privateKeyMnemonic = Nimiq.MnemonicUtils.entropyToMnemonic(
		nimiqWallet.keyPair.privateKey.serialize()
	)
	export const mnemonic = privateKeyMnemonic.join(" ")

	const saveMnemonic = () => {
		let text = ""
		privateKeyMnemonic.forEach((word, index) => {
			text += `${index + 1}. ${word}\n`
		})
		var element = document.createElement("a")
		element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text))
		element.setAttribute("download", "MultiCashlink_24Words.txt")

		element.style.display = "none"
		document.body.appendChild(element)

		element.click()

		document.body.removeChild(element)
	}
</script>

<div class="grid grid-cols-2 grid-rows-4" style="place-items: center">
	<header class="nq-h2 col-span-2 my-2">Don't forget to save your 24 words</header>
	<button
		class="nq-button-pill orange col-span-2 flex text-2xl items-center text-white px-6"
		on:click={saveMnemonic}
		>Save Words <svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-9 w-9 ml-2"
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
	<p class="col-span-2 text-center mx-4 text-3xl text-gray-700 max-w-3xl">{mnemonic}</p>
	<button class="nq-button-pill red text-white px-6" on:click={() => showModal.set(null)}
		>Cancel</button
	>
	<button
		class="nq-button-pill light-blue text-white px-6"
		on:click={() => {
			showModal.set(null)
			createMultiCashlinks()
		}}>Continue</button
	>
</div>

<style>
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
</style>
