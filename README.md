# Multi Cashlink

[![Donate NIM](https://www.nimiq.com/accept-donations/img/donationBtnImg/orange-small.svg)](https://wallet.nimiq.com/nimiq:NQ65GS91H8CSQFAN1EVSUK3GX7PLL9N1X4KC)
[![wakatime](https://wakatime.com/badge/github/Albermonte/Nimiq-Multi-Cashlink.svg)](https://wakatime.com/badge/github/Albermonte/Nimiq-Multi-Cashlink)
![Website](https://img.shields.io/website?down_message=Offline&up_message=Online&url=https%3A%2F%2Fcashlinks.shortnim.me%2F)
[![Nimiq-Multi-Cashlink](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/simple/8wbmgj/main&style=flat)](https://dashboard.cypress.io/projects/8wbmgj/runs)

## Usage

1. Go to [Multi Cashlink website](https://cashlinks.shortnim.me/)
2. Enter the amount of NIM per cashlink
3. Enter the amount of cashlinks you want to create
4. `(Optional)` Include a message that will will be stored in the Cashlink
5. Choose a Network Fee, this fee will be paid on every cashlink funding process.
   If you create more than 10 Cashlinks the minimum fee is `Standard`.
6. All done, click on Create Cashlinks and proceed with the payout.

## How does it work?

Thanks to the incredible technology provided by [Nimiq](https://www.nimiq.com/) we can have a cryptocurrency node and wallet in your own browser. This allows us to make a wallet for you on your first visit to the [Multi Cashlink website](https://cashlinks.shortnim.me/) and store it for your next visit.

### Now, how can we create a cashlink with only one transaction?

Easy, we request a transaction to fill the wallet inside the [Multi Cashlink website](https://cashlinks.shortnim.me/) and then [create](https://github.com/Albermonte/Nimiq-Multi-Cashlink/blob/740887e6250edfce7a5d55fb03086b65ecab6068/src/services/Nimiq.ts#L115) as many cashlinks as you want (up to 500).
Once we have the NIM on the website wallet it's just a [Nimiq Extended Transaction](https://github.com/Albermonte/Nimiq-Multi-Cashlink/blob/740887e6250edfce7a5d55fb03086b65ecab6068/src/services/Nimiq.ts#L157) and all done, all your Cashlinks are ready to share.

We also store all of your Cashlinks using [IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) to have an history and keep track of Funded and Claimed Cashlinks. This also allows you to claim unclaimed Cashlinks with just one click.

And that's all, have fun 😄

## Development

If you want to try it locally, just run:

```bash
npm install
npm run dev
```

## Authors

[Albermonte](https://github.com/Albermonte) & [Max](https://github.com/onmax)
