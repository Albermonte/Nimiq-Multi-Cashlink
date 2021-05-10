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

  export let url;
  export let index;
  export let message;

  const title = `${message || "A wild Nimiq Cashlink appeared"}`;
  const desc =
    "Cashlinks are an amazing and unique feature of the Nimiq Blockchain that allows you to send $NIM to users, with or without a NIM account.";
</script>

<main>
  <p>
    Choose Social Network to share <span class="cashlink-name nq-blue"
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
      media={`${window.origin}/favicon.png`}
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
