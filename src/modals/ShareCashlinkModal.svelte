<script>
	import { showModal } from "../store";
	import {
		Email,
		HackerNews,
		Reddit,
		LinkedIn,
		Pinterest,
		Telegram,
		Tumblr,
		Vk,
		WhatsApp,
		Xing,
		Facebook,
		Twitter,
	} from "svelte-share-buttons-component";

	const title = "A wild Nimiq Cashlink appeared"; // TODO: if message set by user replace this with message
	const desc =
		"Cashlinks are an amazing and unique feature of the Nimiq Blockchain that allows you to send $NIM to users, with or without a NIM account.";

	export let url;
	export let index;
</script>

<main>
	<p>
		Choose Social Network where to share <span class="cashlink-name nq-blue"
			>Cashlink {index + 1}</span
		>
	</p>
	<div class="share-group">
		<Email class="share-button" subject={title} body={"${desc}\n\n${url}"} />
		<HackerNews class="share-button" {title} {url} />
		<Reddit class="share-button" {title} {url} />
		<Pinterest
			class="share-button"
			{url}
			media="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Svelte_Logo.svg/200px-Svelte_Logo.svg.png"
			description={title}
		/>
		<Telegram class="share-button" text={title} {url} />
		<Vk class="share-button" {title} {url} />
		<WhatsApp class="share-button" text={`*${title}*\n\n${desc}\n\n${url}`} />
		<Xing class="share-button" {title} {url} />
		<Facebook class="share-button" {url} />
		<Twitter
			class="share-button"
			text={title}
			{url}
			hashtags="Nimiq,Blockchain,Cashlinks"
			via="username"
			related="other,users"
		/>
	</div>
	<button class="nq-button-pill red" on:click={() => showModal.set(null)}
		>Close</button
	>
</main>

<style class="scss">
	main {
		height: 52rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 2rem;
	}

	.share-group {
		display: flex;
		justify-content: space-evenly;
		align-items: center;
		padding: 3rem;
		flex-wrap: wrap;
		margin-bottom: auto;
	}

	.cashlink-name {
		font-weight: 700;
	}
</style>
