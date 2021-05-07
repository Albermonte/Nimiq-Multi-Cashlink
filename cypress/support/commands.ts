import * as compareSnapshotCommand from "cypress-visual-regression/dist/command";

compareSnapshotCommand({
	capture: "fullPage",
	errorThreshold: 0.1,
});
