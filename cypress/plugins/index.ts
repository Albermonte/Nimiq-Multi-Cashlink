import * as clipboardy from "clipboardy";

export default (on, config) => {
	on("task", {
		getClipboard() {
			return clipboardy.readSync();
		},
	});
};
