<script lang="typescript">
	import Modal from "svelte-simple-modal";
	import { Router, Route, Link } from "svelte-routing";
	import Home from "./pages/Home.svelte";
	import Success from "./pages/Success.svelte";
	import About from "./pages/About.svelte";
	import History from "./pages/History.svelte";
	import Footer from "./Footer.svelte";
	export let url = ""; //This property is necessary declare to avoid ignore the Router

	import { showModal } from "./store";

	import { initNimiq } from "./services/Nimiq";
	initNimiq();

	import { analyticsInstance, isDev } from "./services";
	if (!isDev) analyticsInstance.record("eafc96b8-bfd1-4ab7-8911-1015e4997fbe");
</script>

<Router {url}>
	<main>
		<nav>
			<Link to="/">Home</Link>
			<Link to="about">About</Link>
			<Link to="history">History</Link>
		</nav>
		<div style="margin: auto;">
			<Route path="/"><Home /></Route>
			<Route path="about"><About /></Route>
			<Route path="history"><History /></Route>
			<Route path="success"><Success /></Route>
		</div>
		<Footer />
	</main>
</Router>

<Modal
	show={$showModal}
	closeButton={false}
	closeOnEsc={false}
	closeOnOuterClick={false}
	styleWindow={{
		width: "65rem",
		height: "min-content",
	}}
/>

<style lang="scss">
	main {
		height: calc(100vh - 21px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
</style>
