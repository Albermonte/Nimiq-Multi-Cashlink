<!-- https://github.com/nimiq/vue-components/blob/master/src/components/SelectBar.vue -->
<script lang="ts">
	import { multiCashlink } from "../store";

	const options = [
		{
			color: "nq-light-blue-bg",
			value: 0,
			text: "free",
			index: 0,
		},
		{
			color: "nq-green-bg",
			value: 1,
			text: "standard",
			index: 1,
		},
		{
			color: "nq-gold-bg",
			value: 2,
			text: "express",
			index: 2,
		},
	];

	interface SelectBarOption {
		color: string;
		value: number;
		text: string;
		index: number;
	}

	class SelectBar {
		public name!: string;
		public options!: SelectBarOption[];
		public selectedValue?: number;
		private selectedOption: SelectBarOption | null = null;

		public get value() {
			return this.selectedOption!.value;
		}

		public getColor(option: string, index: number) {
			this.selectedOption = options.find((x) => x.text === option);
			if (index <= this.selectedOption!.index) {
				return this.selectedOption!.color;
			} else return "nq-highlight-bg";
		}
	}

	const selectBar = new SelectBar();
</script>

<div class="select-bar">
	{#each options as option, index}
		<input
			type="radio"
			name={selectBar.name}
			id={option.value.toString()}
			value={option.text}
			bind:group={$multiCashlink.fee}
		/>
		<label
			for={option.value.toString()}
			class={`nq-label ${selectBar.getColor($multiCashlink.fee, index)}`}
			>{option.text}</label
		>
	{/each}
</div>

<style>
	.select-bar {
		display: flex;
		justify-content: space-between;
		flex-grow: 1;
		flex-basis: 0;
		border-radius: 3.75rem;
		overflow: hidden;
		width: 100%;
		margin: 2rem 0;
	}

	input {
		display: none;
	}
	label {
		padding: 1.65rem 2rem;
		margin: 0;
		width: 33%;
		text-align: center;
		cursor: pointer;
		border-radius: 0.5rem;
	}
	.nq-highlight-bg {
		background: var(--nimiq-highlight-bg);
	}
</style>
