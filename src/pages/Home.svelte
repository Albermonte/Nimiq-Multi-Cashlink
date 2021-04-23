<script>
	import { balance, totalAmount, multiCashlink } from "../store";

	import {
		show24Words,
		feeAmounts,
		maxCashlinks,
		maxFreeCashlinks,
	} from "../service";

	export const randomNTx = `${Math.floor(Math.random() * 8) + 2}`;
	export const randomAmountTx = (Math.random() * 1000).toFixed(2);

	multiCashlink.subscribe((multiCashlink) => {
		const { nTx, amount, fee } = multiCashlink;

		// If user has selected "free" fee and wants to generate more that ${maxFreeCashlinks}
		// then normal fee will be applied
		if (nTx > maxFreeCashlinks && fee === "free") {
			// TODO: show msg to user
			// TODO: add disabled style to free fee
			multiCashlink.fee = "normal";
		} else {
			// TODO: remove disable style to free fee
		}

		// Set totalAmount based on user input and temp wallet balance
		const userAmount =
			nTx * (amount + feeAmounts[multiCashlink.fee] / 1e5) || 0;
		const userBalance = $balance || 0;
		totalAmount.set(
			Math.max(Math.round((userAmount - userBalance) * 1e5) / 1e5, 0),
		);
	});

	const handleSubmit = async () => {
		// TODO: Check pre conditions on inputs
		await show24Words();
	};
</script>

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
				<div>
					<!-- https://github.com/nimiq/vue-components/blob/master/src/components/SelectBar.vue -->
					<h4>Network Fee</h4>
					<div class="radio-inputs">
						<div class="radio">
							<input
								id="free-tx"
								name="radio"
								type="radio"
								bind:group={$multiCashlink.fee}
								value={"free"}
							/>
							<label for="free-tx" class="radio-label">Free</label>
						</div>

						<div class="radio">
							<input
								id="normal-tx"
								name="radio"
								type="radio"
								bind:group={$multiCashlink.fee}
								value={"normal"}
								max={maxCashlinks}
							/>
							<label for="normal-tx" class="radio-label">Normal</label>
						</div>

						<div class="radio">
							<input
								id="fast-tx"
								name="radio"
								type="radio"
								bind:group={$multiCashlink.fee}
								value={"fast"}
							/>
							<label for="fast-tx" class="radio-label">Fast</label>
						</div>
					</div>
				</div>
			</div>
			<div class="bottom">
				<h3>
					<span class="total">Total:</span> <span>{$totalAmount} NIM</span>
				</h3>
				<button class="nq-button-pill light-blue" type="submit">
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
		min-height: 60vh;
		form {
			.field-amount {
				// https://github.com/lunanimous/nim-widgets/blob/7bfd9c70d0f089ab28bf7ac3f69307f829fa4f3f/src/components/donate/donate.css#L365
				position: relative;

				h4 {
					margin-bottom: 0;
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
					transition: color 0.2s ease, border 0.2s ease;
					background-clip: padding-box;
				}

				input:focus {
					border-color: var(--nimiq-highlight-bg);
				}

				.nim-label {
					display: block;
					position: absolute;
					right: 12px;
					top: 50%;
					bottom: 50%;
					margin: 0;
					padding: 0;
					font-size: 16px;
					font-weight: 600;
					letter-spacing: 0.08em;
					opacity: 0.55;
					transition: opacity 0.2s ease-out;
					color: var(--nimiq-light-blue);
				}

				.radio-inputs {
					display: flex;
					justify-content: space-around;
					align-items: center;

					.radio {
						margin: 0.5rem;
						input[type="radio"] {
							position: absolute;
							opacity: 0;
							+ .radio-label {
								&:before {
									content: "";
									background: var(--nimiq-gold);
									border-radius: 100%;
									border: 1px solid var(--nimiq-gold);
									display: inline-block;
									width: 1em;
									height: 1em;
									position: relative;
									margin-right: 0.4em;
									margin-bottom: 0.4em;

									vertical-align: top;
									cursor: pointer;
									@apply text-center;
									transition: all 250ms ease;
								}
							}
							&:checked {
								+ .radio-label {
									&:before {
										background-color: var(--nimiq-purple);
										box-shadow: inset 0 0 0 4px var(--nimiq-gold);
									}
								}
							}
							&:focus {
								+ .radio-label {
									&:before {
										outline: none;
										border-color: var(--nimiq-purple);
									}
								}
							}
							+ .radio-label {
								&:empty {
									&:before {
										margin-right: 0;
									}
								}
							}
						}
					}
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
				margin-right: 6px;

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
	}
</style>
