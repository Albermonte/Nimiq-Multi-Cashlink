describe("Test Cashlink Creation", () => {
	const walletString =
		"[109,61,221,91,63,138,201,125,88,21,118,170,11,220,72,61,153,192,96,152,224,209,61,166,85,94,46,26,203,156,143,105,70,5,140,126,218,146,220,121,192,29,86,223,130,97,202,210,222,29,237,66,172,51,17,139,113,255,7,15,217,241,7,246,0]";
	const consensusTimeout = 2 * 60 * 1e3;

	const chooseConsensus = () => {
		// Choose light consensus
		cy.get('#light-consensus').click();

		cy.get(".consensus-established", { timeout: consensusTimeout }).should(
			"be.visible",
		);
	};

	beforeEach(() => {
		cy.visit("/");
		window.localStorage.wallet = walletString;
	});

	it("creates 3 cashlinks", () => {
		chooseConsensus();

		cy.get(".field-amount:nth-child(1) > .nq-input").type("0.00001");
		cy.get(".field-amount:nth-child(2) > .nq-input").type("3");
		cy.get(".field-amount:nth-child(3) > .nq-input").type("Testing Multi Cash");


		cy.compareSnapshot("ConsensusEstablished", 0.11);

		cy.get(".nq-button").click();
		// Wait for modal animation
		cy.wait(500);

		cy.compareSnapshot("WordsModal", 0.11);
		cy.get(".nq-button-pill:nth-child(2)").click();

		cy.url().should("contain", "success");
		// Wait for modal animation
		cy.wait(500);

		cy.compareSnapshot("CashlinksSuccess", 0.11);
		// Wait so cashlinks txs are sent
		cy.wait(5 * 1e3);
	});

	it("check created cashlinks", () => {
		cy.visit("/success");

		chooseConsensus();

		cy.compareSnapshot("CheckingCashlinks", 0.11);

		cy.contains("all ready", { timeout: 10 * 60 * 1e3 });

		cy.compareSnapshot("CashlinksFunded", 0.15);

		cy.get(':nth-child(4) > .container > :nth-child(2) > .copy > .nq-icon > use').click();

		cy.window().its('navigator.clipboard')
			.then((clip) => clip.readText())
			.should("contain", "https://hub.nimiq-testnet.com/")
			.then((text) => {
				Cypress.env("url", text);
			});
	});

	it("check clipboard cashlink", () => {
		const url = Cypress.env("url");
		cy.log("this is what was in clipboard", url);
		cy.visit(url);
		cy.origin('https://hub.nimiq-testnet.com', () => {
			cy.contains("0.00001");
			cy.contains("Testing Multi Cash");
		});
	});

	it("check history ", () => {
		cy.visit("/history");

		chooseConsensus();

		cy.screenshot("History", { capture: "fullPage" });

		cy.contains(/(\d+) Cashlinks, (\d+) funded and (\d+) claimed/gm, {
			timeout: 10 * 1e3,
		});
	});
});
