# Minimal Discord RPC

A fork of the original `minimal-discord-rpc` package as it was taken down.

No support will be provided.

## Usage

```js
import { Client, ActivityType } from "minimal-discord-rpc";

const client = new Client({
 clientId: "1234567890123456789",
});

client.on("ready", () => {
 console.log("RPC connected");

 client.setActivity({
  type: ActivityType.Playing,
  details: "Activity details",
  state: "Acivity state",
  timestamps: {
   start: Date.now(),
  },
  assets: {
   large_image: "large_image",
   large_text: "Large image!",
   small_image: "small_image",
   small_text: "Small image!",
  },
 });
});
client.on("close", (reason) => {
 console.log("RPC disconnected", reason);
});

client.login();
```
