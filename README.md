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
  details_url: "https://example.com/details",
  state: "Acivity state",
  state_url: "https://example.com/state",
  timestamps: {
   start: Date.now(),
  },
  assets: {
   large_image: "large_image",
   large_text: "Large image!",
   large_url: "https://example.com/large",
   small_image: "small_image",
   small_text: "Small image!",
   small_url: "https://example.com/small",
  },
  party: {
   id: "party-id",
   size: [1, 4],
  },
  secrets: {
   join: "join-secret",
  },
  instance: true,
  buttons: [{ label: "Website", url: "https://example.com" }],
 });
});
client.on("close", (reason) => {
 console.log("RPC disconnected", reason);
});

client.login();
```
