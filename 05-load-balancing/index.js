const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);
const instanceName = process.env.INSTANCE_NAME || "local-app";

app.get("/content/counts", (req, res) => {
	res.json({
		counts: {
			"video-123": {
				views: 125000,
				likes: 4200,
			},
		},
		servedBy: instanceName,
	});
});

app.listen(port, () => {
	console.log(`${instanceName} running on port ${port}`);
});
