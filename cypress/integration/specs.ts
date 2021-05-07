const walletString =
	"[109,61,221,91,63,138,201,125,88,21,118,170,11,220,72,61,153,192,96,152,224,209,61,166,85,94,46,26,203,156,143,105,70,5,140,126,218,146,220,121,192,29,86,223,130,97,202,210,222,29,237,66,172,51,17,139,113,255,7,15,217,241,7,246,0]";

describe("Test Cashlink Creation", () => {
	it("creates 3 cashlinks", () => {
		cy.visit("/");
		window.localStorage.wallet = walletString;
		cy.get(".consensus-established", { timeout: 60000 }).should("be.visible");
		cy.screenshot("ConsensusEstablished", { capture: "fullPage" });

		cy.get(".field-amount:nth-child(1) > .nq-input").type("0.00001");
		cy.get(".field-amount:nth-child(2) > .nq-input").type("3");
		cy.get(".field-amount:nth-child(3) > .nq-input").type("Testing Multi Cash");

		cy.get(".nq-button").click();
		cy.wait(500);
		cy.screenshot("WordsModal", { capture: "fullPage" });
		cy.get(".nq-button-pill:nth-child(2)").click();

		cy.url().should("contain", "success");
		cy.screenshot("CashlinksSuccess", { capture: "fullPage" });
		// Wait so cashlinks txs are sent
		cy.wait(5 * 1e3);
	});

	it("check created cashlinks", () => {
		cy.visit("/success");
		window.localStorage.wallet = walletString;
		cy.get(".consensus-established", { timeout: 60000 }).should("be.visible");
		cy.screenshot("CheckingCashlinks", { capture: "fullPage" });

		cy.contains("all ready", { timeout: 10 * 60 * 1e3 });

		cy.get(".nq-card:nth-child(4) .nq-icon").click();
		cy.task("getClipboard").should("contain", "https://hub.nimiq-testnet.com/");

		cy.screenshot("CashlinksFunded", { capture: "fullPage" });
	});

	it("check clipboard cashlink", () => {
		cy.task("getClipboard").then(($clip: string) => {
			const url = $clip;
			cy.log("this is what was in clipboard", url);
			cy.visit(url);
			cy.contains("0.00001 NIM");
			cy.contains("Testing Multi Cash");
		});
	});

	it("check history ", () => {
		cy.visit("/history");
		window.localStorage.wallet = walletString;
		cy.get(".consensus-established", { timeout: 60000 }).should("be.visible");
		cy.screenshot("History", { capture: "fullPage" });

		cy.contains(/(\d+) Cashlinks, (\d+) funded and (\d+) claimed/gm, {
			timeout: 1 * 60 * 1e3,
		});
	});
});
