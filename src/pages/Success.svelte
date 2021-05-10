<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Link } from "svelte-routing";
  import { height, client } from "nimiq-svelte-stores";
  import Nimiq from "@nimiq/core-web";
  import type { ClientTransactionDetails } from "@nimiq/core-web/types";
  const { Client } = Nimiq;

  import { latestCashlinks, cashlinkArray, wallet } from "../store";
  import type { CashlinkStore } from "../store";
  import { isClientReady } from "../services/Nimiq";

  import CashlinkItem from "../components/CashlinkItem.svelte";

  let pageName = "Success";
  let copyButtonText = "Copy All";
  let fundedAmount = 0;
  let allFunded = false;
  let cashlinks: Array<CashlinkStore> = [];
  const latestUnsubscribe = latestCashlinks.subscribe(($) => {
    fundedAmount = 0;
    cashlinks = $;
    cashlinks.forEach((x) => {
      if (x.funded) fundedAmount++;
    });
  });

  const onTransaction = (txDetails: ClientTransactionDetails) => {
    if (txDetails.sender.equals($wallet.address)) {
      switch (txDetails.state) {
        case Nimiq.Client.TransactionState.MINED:
          // Transaction has been confirmed once
          cashlinks.forEach((cashlink, index) => {
            if (cashlink.txhash === txDetails.transactionHash.toHex()) {
              fundedAmount++;
              cashlink.funded = true;
              cashlinks[index] = cashlink;
            }
          });
          updateTitle();
          break;
        case Nimiq.Client.TransactionState.EXPIRED:
          console.log(`${txDetails.transactionHash.toHex()} Expired`);
          break;
        case Nimiq.Client.TransactionState.INVALIDATED:
          console.log(`${txDetails.transactionHash.toHex()} Invaldiated`);
          break;
      }
    }
  };

  // Check every cashlink state on head change
  const heightUnsubscribe = height.subscribe(async () => {
    // Wait 1 second before checking so the page can be loaded
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await isClientReady();
    await client.waitForConsensusEstablished();

    if (!cashlinks.length) return;

    fundedAmount = 0;
    cashlinks.forEach((x) => {
      if (x.funded) fundedAmount++;
    });

    for (const [i, cashlink] of cashlinks.entries()) {
      // Skip this one if has been created less than 2 blocks ago
      if (cashlink.validityStartHeight + 2 > $height) continue;
      if (!cashlink.claimed) {
        try {
          if (cashlink.funded) {
            const recipient = await client.getAccount(cashlink.recipient);
            if (recipient.balance === 0) cashlink.claimed = true; // TODO: native notification when claimed and from which address was claimed? Time and more info?
            // TODO: if not funded give option to resend to pending cashlinks, automatic and ask user before?
            // TODO: Check if not mined or node didn't share info with us
            cashlinks[i] = cashlink;
          } else {
            const tx = await client.getTransaction(cashlink.txhash);
            if (
              tx.state === Client.TransactionState.MINED ||
              tx.state === Client.TransactionState.CONFIRMED
            ) {
              cashlink.funded = true;
              cashlinks[i] = cashlink;
            }
          }
        } catch (e) {
          if (
            e.toString().includes("Failed to retrieve transaction receipts") ||
            e.toString().includes("Failed to retrieve accounts")
          )
            console.log("Nodes don't want to share info :(");
          else console.log(`Tx: ${cashlink.txhash} not mined`, e);
        }
      }
      updateTitle();
    }
    updateStore();
  });

  const copyToClipboard = () => {
    let str = "";
    for (const cashlink of $latestCashlinks) str += `${cashlink.url}\n`;
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
    setTimeout(() => (copyButtonText = "Copy All"), 3000);
  };

  const updateStore = () => {
    cashlinks.forEach((x) => {
      const index = $cashlinkArray.findIndex(
        (cashlink) => cashlink.txhash === x.txhash
      );
      $cashlinkArray[index] = x;
    });

    // Force Svelte to update store
    $cashlinkArray = $cashlinkArray;
    $latestCashlinks = cashlinks;
  };

  const updateTitle = () => {
    if (cashlinks.length === fundedAmount) {
      allFunded = true;
      document.title = "Ready to share";
      updateStore();
    } else {
      allFunded = false;
      document.title = `${fundedAmount}/${cashlinks.length} funded`;
    }
  };

  let txlistener = null;
  onMount(async () => {
    await isClientReady();
    txlistener = await client.addTransactionListener(onTransaction, [
      $wallet.address,
    ]);
    updateTitle();
  });

  // Unsubscribe when leaving page
  onDestroy(() => {
    client.removeListener(txlistener);
    heightUnsubscribe();
    latestUnsubscribe();
  });
</script>

<main>
  {#if cashlinks.length === 0}
    <p>
      You don't have any recent cashlink, to generate new ones go to
      <Link to="/">Home</Link>
      If you want to check the history go to <a href="/history">History</a>
    </p>
  {:else}
    <h1 class="nq-h1">{pageName}!</h1>
    {#if allFunded}
      <p>Your Cashlinks are all ready, share them with the world 🙌🏼</p>
    {:else}
      <p>
        {`${fundedAmount}/${cashlinks.length}`} Cashlinks funded, but you can already
        share them 🙌🏼
      </p>
    {/if}
    <button class="nq-button-pill blue" on:click={copyToClipboard}
      >{copyButtonText}</button
    >
    {#each cashlinks as cashlink, i}
      <CashlinkItem index={i} {cashlink} />
    {/each}
  {/if}
</main>

<style>
  main {
    display: grid;
    place-items: center;
    height: 100%;
    padding-bottom: 5rem;
  }

  h1 {
    text-transform: uppercase;
    font-size: 3.5em;
    font-weight: 100;
  }
</style>
