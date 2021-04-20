<script lang="typescript">
	import Modal from "svelte-simple-modal";
	import { Router, Route, Link } from "svelte-routing";
	import Home from "./pages/Home.svelte";
	import Success from "./pages/Success.svelte";
	import About from "./pages/About.svelte";
	export let url = ""; //This property is necessary declare to avoid ignore the Router
	import Footer from "./Footer.svelte";

	import { showModal } from "./store";

	import { initNimiq } from "./service";
	initNimiq();
</script>

<Router {url}>
	<main>
		<nav>
			<Link to="/">Home</Link>
			<Link to="about">About</Link>
		</nav>
		<div>
			<Route path="/"><Home /></Route>
			<Route path="about"><About /></Route>
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

<style scoped lang="scss">
	main {
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}
</style>
