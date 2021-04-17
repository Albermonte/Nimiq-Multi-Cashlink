<script lang="typescript">
	import { multiCashlink } from "./store.js";
	import { initNimiq, createMultiCashlinks } from "./service";
	initNimiq();

	export const randomNTx = `${Math.floor(Math.random() * 8) + 2}`;
	export const randomAmountTx = `${Math.floor(Math.random() * 1000)}`;

	const handleSubmit = () => {
		// TODO Check pre conditions on inputs
		createMultiCashlinks($multiCashlink);
	};
</script>

<main>
	<div class="container">
		<h1>Multi Cashlink</h1>
		<form on:submit|preventDefault={handleSubmit}>
			<div class="field-amount">
				<h4>Amount for each</h4>
				<input
					type="number"
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
					class="nq-input"
					placeholder={randomNTx}
					bind:value={$multiCashlink.nTx}
					required
				/>
			</div>

			<div class="field-amount">
				<div>
					<h4>Fee</h4>
					<div class="radio-inputs">
						<div class="radio">
							<input
								id="free-tx"
								name="radio"
								type="radio"
								bind:group={$multiCashlink.fee}
								value={"free"}
								checked
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

			<button class="nq-button" type="submit"> Create </button>
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

		.field-amount {
			position: relative;

			h4 {
				margin-bottom: 0;
			}

			input {
				width: 100%;
			}

			.nim-label {
				position: absolute;
				background: var(--nimiq-gold-bg);
				right: 7px;
				bottom: 18px;
				border-radius: 5px;
				padding: 3px 5px;
				font-size: 0.75em;
				font-weight: bold;
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
								text-align: center;
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
		button {
			margin-top: 2em;
		}
	}
</style>
