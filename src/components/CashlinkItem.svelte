<script lang="ts">
  import { bind } from "svelte-simple-modal";
  import ShareCashlinkModal from "../modals/ShareCashlinkModal.svelte";
  import { showModal } from "../store";
  import type { CashlinkStore } from "../store";

  export let cashlink: CashlinkStore;
  export let index: number;

  let copyButtonText = "Copy";

  const copyToClipboard = () => {
    let str = cashlink.url;
    const el = document.createElement("textarea");
    el.value = str;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    copyButtonText = "Copied!";
    setTimeout(() => (copyButtonText = "Copy"), 3000);
  };

  const openShareCashlinkModal = (index: number) => {
    showModal.set(
      bind(ShareCashlinkModal, {
        url: cashlink.url,
        message: cashlink.message,
        index,
      })
    );
  };
</script>

<div class="nq-card">
  <div class="container px-12 py-10">
    <div class="index">
      {index + 1}.
    </div>
    <div class="amount">
      {cashlink.amount} NIM
    </div>
    <div class="status">
      {#if cashlink.claimed}
        <p class="nq-button-s light-blue">Claimed</p>
      {:else if cashlink.funded}
        <p class="nq-button-s green">Funded</p>
      {:else}
        <p class="nq-button-s orange">Pending</p>
        <!-- TODO: if error, show error pill and show a button to refund cashlink -->
      {/if}
    </div>
    <div class="copy" data-tooltip={copyButtonText} on:click={copyToClipboard}>
      <svg class="nq-icon">
        <use
          xlink:href={`${location.origin}/nimiq/nimiq-style.icons.svg#nq-copy`}
        />
      </svg>
    </div>
    <div
      class="share"
      data-tooltip={"Social Media Share"}
      on:click={() => openShareCashlinkModal(index)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22px"
        height="22px"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
        />
      </svg>
    </div>
  </div>
</div>

<style>
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  .nq-card {
    max-width: max-content;
    min-width: min-content;
  }

  .container {
    display: flex;
    align-items: center;
    min-width: 75rem;
  }

  .index {
    width: 5%;
    color: var(--nimiq-blue);
    font-weight: 600;
    font-size: 2.25rem;
  }

  .amount {
    width: 64%;
    color: var(--nimiq-blue);
    opacity: 0.6;
    font-weight: 700;
    font-size: 2.3rem;
    text-align: left;
    margin-left: 2rem;
  }

  .status {
    width: 16%;
    display: flex;
    justify-content: center;
  }

  .copy {
    width: 10%;
    display: flex;
    justify-content: center;
    color: var(--nimiq-blue-darkened);
  }

  .share {
    width: 5%;
    display: flex;
    justify-content: center;
    color: var(--nimiq-blue-darkened);
  }

  .copy svg,
  .share svg {
    cursor: pointer;
  }
  .nq-button-s {
    cursor: auto;
  }
</style>
