<script lang="ts">
	import {
		balance,
		totalAmount,
		amountToPay,
		multiCashlink,
		showModal,
	} from "$lib/store";
	import { client } from "$lib/services/Nimiq";
	import { feeAmounts, maxCashlinks } from "$lib/services";

	import FeeSelector from "components/FeeSelector.svelte";
	import WordsModal from "../modals/WordsModal.svelte";

	const UINT8_MAX = 255; // NumberUtils.UINT8_MAX
	const randomNTx = `${Math.floor(Math.random() * 8) + 2}`;
	const randomAmountTx = (Math.random() * 1000).toFixed(2);
	let validInput = false;

	multiCashlink.subscribe((multiCashlink) => {
		const { nTx, amount, fee } = multiCashlink;
		if (!nTx || !amount) return;

		// Set totalAmount based on user input and temp wallet balance
		const userAmount =
			nTx * (amount + feeAmounts[multiCashlink.fee] / 1e5) || 0;
		const userBalance = $balance / 1e5 || 0;
		console.log("userAmount", { userAmount, userBalance });
		totalAmount.set(Math.max(Math.round(userAmount * 1e5) / 1e5, 0));
		amountToPay.set(
			Math.max(Math.round((userAmount - userBalance) * 1e5) / 1e5, 0),
		);

		if (nTx > 0 && amount >= 0.00001) validInput = true;
		else validInput = false;
	});

	const handleSubmit = async () => {
		// TODO: Check pre conditions on inputs
		await client!.waitForConsensusEstablished();
		setTimeout(() => showModal.set(WordsModal), 350);
	};
</script>

<svelte:head>
	<title>Multi Cashlink</title>
</svelte:head>

<main>
	<div class="container">
		<h1>Multi Cashlink</h1>
		<form on:submit|preventDefault={handleSubmit}>
			<div class="field-amount">
				<h4>Amount for each</h4>
				<!-- https://github.com/nimiq/vue-components/blob/master/src/components/AmountInput.vue -->
				<input
					type="number"
					step="any"
					min="0.00001"
					name="amount"
					class="nq-input"
					placeholder={randomAmountTx}
					bind:value={$multiCashlink.amount}
					required
				/>
				<div class="nim-label">NIM</div>
			</div>

			<div class="field-amount">
				<h4>How many Cashlinks are you generating?</h4>
				<input
					type="number"
					name="nTx"
					min="1"
					max={maxCashlinks}
					class="nq-input"
					placeholder={randomNTx}
					bind:value={$multiCashlink.nTx}
					required
				/>
			</div>

			<div class="field-amount">
				<h4>Message (Optional)</h4>
				<input
					type="text"
					name="message"
					class="nq-input"
					placeholder="Here's a Cashlink for you"
					maxlength={UINT8_MAX}
					bind:value={$multiCashlink.message}
				/>
			</div>

			<div class="field-amount">
				<div>
					<h4>Network Fee</h4>
					<FeeSelector />
				</div>
			</div>
			<div class="bottom">
				<h3>
					<span class="total">Total:</span> <span>{$amountToPay} NIM</span>
				</h3>
				<button
					class="nq-button light-blue"
					disabled={!validInput}
					type="submit"
				>
					Create Cashlinks
				</button>
			</div>
		</form>
	</div>
</main>

<style lang="scss">
	main {
		display: grid;
		place-items: center;
		height: 100%;
	}

	.container {
		min-height: 70vh;
		min-width: 56rem;
		@media only screen and (hover: none) and (pointer: coarse) {
			min-width: 90%;
			max-width: 95%;
		}
		form {
			.field-amount {
				// https://github.com/lunanimous/nim-widgets/blob/7bfd9c70d0f089ab28bf7ac3f69307f829fa4f3f/src/components/donate/donate.css#L365
				position: relative;

				h4 {
					margin-bottom: 0.5rem;
				}

				input {
					width: 100%;
					box-sizing: border-box;
					padding: 12px;
					border: solid 1px var(--nimiq-gray);
					// color: var(--nimiq-light-blue-darkened);
					background: 0 0;
					border-radius: 8px;
					outline: 0;
					transition:
						color 0.2s ease,
						border 0.2s ease;
					background-clip: padding-box;
				}

				input:focus {
					border-color: var(--nimiq-highlight-bg);
				}

				.nim-label {
					display: block;
					position: absolute;
					right: 12px;
					top: 54%;
					margin: 0;
					padding: 0;
					font-size: 16px;
					font-weight: 800;
					letter-spacing: 0.08em;
					opacity: 0.55;
					transition: opacity 0.2s ease-out;
					color: var(--nimiq-light-blue);
				}
			}
		}

		.bottom {
			display: flex;
			justify-content: space-between;
			align-items: center;
			h3 {
				font-size: 1.25em;
				font-weight: bold;
				margin-right: 2rem;

				@media only screen and (hover: none) and (pointer: coarse) {
					display: flex;
					flex-direction: column;
					justify-content: center;
					align-items: center;
					margin-left: 2rem;
					span {
						font-size: 1em;
						text-align: center;
					}
				}

				.total {
					color: #ccc;
					font-size: 0.9em;
				}
			}

			button {
				margin: 2em 0;
			}
		}
	}

	.nq-button {
		height: 5.5rem;
		padding: 0 1rem;
		font-size: 1.75rem;
	}

	// Hide arrows from input: https://www.w3schools.com/howto/howto_css_hide_arrow_number.asp
	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type="number"] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
