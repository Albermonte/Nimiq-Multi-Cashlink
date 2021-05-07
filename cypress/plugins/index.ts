import * as clipboardy from "clipboardy";
import * as getCompareSnapshotsPlugin from "cypress-visual-regression/dist/plugin";

export default (on, config) => {
	on("task", {
		getClipboard() {
			return clipboardy.readSync();
		},
	});
	getCompareSnapshotsPlugin(on, config);
};
