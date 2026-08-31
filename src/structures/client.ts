import crypto from "node:crypto";
import { EventEmitter } from "./eventEmitter";
import { IPC_OPERATION, IpcTransport } from "./ipcTransport";

interface ClientOptions {
	clientId: string;
}

export enum ActivityType {
	/**
	 * Playing {name}
	 */
	Playing = 0,

	/**
	 * Streaming {details}
	 * Not usable via SET_ACTIVITY, listed here for completeness
	 */
	Streaming = 1,

	/**
	 * Listening to {name}
	 */
	Listening = 2,

	/**
	 * Watching {name}
	 */
	Watching = 3,

	/**
	 * {emoji} {state}
	 * Not usable via SET_ACTIVITY, listed here for completeness
	 */
	Custom = 4,

	/**
	 * Competing in {name}
	 */
	Competing = 5,
}

/**
 * Activity flags as documented on the gateway Activity object.
 * Not used when calling setActivity - listed here for reference only.
 */
export enum ActivityFlags {
	Instance = 1 << 0,
	Join = 1 << 1,
	Spectate = 1 << 2,
	JoinRequest = 1 << 3,
	Sync = 1 << 4,
	Play = 1 << 5,
	PartyPrivacyFriends = 1 << 6,
	PartyPrivacyVoiceChannel = 1 << 7,
	Embedded = 1 << 8,
}

/**
 * Controls which field is displayed in the user's status text in the member list.
 * Applies to all activity types.
 */
export enum StatusDisplayType {
	/**
	 * e.g. "Listening to Spotify"
	 */
	Name = 0,

	/**
	 * e.g. "Listening to Rick Astley"
	 */
	State = 1,

	/**
	 * e.g. "Listening to Never Gonna Give You Up"
	 */
	Details = 2,
}

export interface ActivityEmoji {
	/**
	 * Name of the emoji
	 */
	name: string;

	/**
	 * ID of the emoji
	 */
	id?: string;

	/**
	 * Whether the emoji is animated
	 */
	animated?: boolean;
}

export interface ActivityTimestamps {
	/**
	 * Unix time (in milliseconds) of when the activity started
	 * Must be between 0 and 2147483647000
	 */
	start?: number | Date;
	/**
	 * Unix time (in milliseconds) of when the activity ends
	 * Must be between 0 and 2147483647000
	 */
	end?: number | Date;
}
export interface ActivityAssets {
	/**
	 * Main icon, can be an asset name or a URL (1-128 characters)
	 * If not specified, the client icon will be used
	 */
	large_image?: string;

	/**
	 * Hover text for the main icon (2-128 characters)
	 */
	large_text?: string;

	/**
	 * URL that is opened when clicking on the large image
	 */
	large_url?: string;

	/**
	 * Small icon, can be an asset name or a URL (1-128 characters)
	 */
	small_image?: string;

	/**
	 * Hover text for the small icon (2-128 characters)
	 */
	small_text?: string;

	/**
	 * URL that is opened when clicking on the small image
	 */
	small_url?: string;
}
export interface ActivityParty {
	/**
	 * ID of the party
	 */
	id?: string;

	/**
	 * Current and maximum size of the party, e.g. [3, 6]
	 */
	size?: [current_size: number, max_size: number];
}
export interface ActivitySecrets {
	/**
	 * Secret for joining a party
	 */
	join?: string;

	/**
	 * Secret for spectating a game
	 */
	spectate?: string;

	/**
	 * Secret for a specific instanced match
	 */
	match?: string;
}
export interface ActivityButton {
	/**
	 * The text shown on the button (1-32 characters)
	 */
	label: string;

	/**
	 * The url opened when clicking the button (1-512 characters)
	 */
	url: string;
}

const SETTABLE_ACTIVITY_TYPES = [
	ActivityType.Playing,
	ActivityType.Listening,
	ActivityType.Watching,
	ActivityType.Competing,
] as const;

export interface Activity {
	/**
	 * Activity's name
	 * Receive-only - for SET_ACTIVITY the name shown is derived from the
	 * application tied to the client ID and cannot be overridden
	 */
	name?: string;

	/**
	 * Default: ActivityType.Playing
	 * SET_ACTIVITY only supports Playing, Listening, Watching, or Competing
	 */
	type?: (typeof SETTABLE_ACTIVITY_TYPES)[number];

	/**
	 * Stream URL, only validated when type is Streaming (1)
	 * Receive-only - Streaming is not a usable type for SET_ACTIVITY
	 */
	url?: string;

	/**
	 * Unix timestamp (in milliseconds) of when the activity was added to the user's session
	 * Receive-only - set automatically by Discord, cannot be set via SET_ACTIVITY
	 */
	created_at?: number;

	/**
	 * Create elapsed/remaining timestamps on a player's profile
	 */
	timestamps?: ActivityTimestamps;

	/**
	 * Application ID for the game
	 * Receive-only - already established by the client ID used at handshake
	 */
	application_id?: string;

	/**
	 * Controls which field is displayed in the user's status text in the member list
	 */
	status_display_type?: StatusDisplayType;

	/**
	 * What the player is currently doing (2-128 characters)
	 */
	details?: string;

	/**
	 * URL that is linked when clicking on the details text
	 */
	details_url?: string;

	/**
	 * The player's current party status, or text used for a custom status (2-128 characters)
	 */
	state?: string;

	/**
	 * URL that is linked when clicking on the state text
	 */
	state_url?: string;

	/**
	 * Emoji used for a custom status
	 * Only applies to the Custom (4) activity type, which SET_ACTIVITY does not support
	 */
	emoji?: ActivityEmoji;

	/**
	 * Information for the current party of the player
	 */
	party?: ActivityParty;

	/**
	 * Assets to display on the player's profile
	 */
	assets?: ActivityAssets;

	/**
	 * Secrets for Rich Presence joining and spectating
	 */
	secrets?: ActivitySecrets;

	/**
	 * Whether or not the activity is an instanced game session
	 */
	instance?: boolean;

	/**
 	 * Internal - Undocumented
   	 */
	flags?: number;

	/**
	 * List of interactive buttons (max 2)
	 */
	buttons?: ActivityButton[];
}

export class Client extends EventEmitter {
	clientId: string;
	#transport: IpcTransport;

	constructor(options: ClientOptions) {
		super();

		this.clientId = options.clientId;

		this.#transport = new IpcTransport(this);
		this.#transport.on("message", (message) => {
			if (message.cmd === "DISPATCH" && message.evt === "READY") {
				this.emit("ready");
			} else {
				this.emit((message as any).evt, message.data);
			}
		});
	}

	// LOGIN

	async login(): Promise<void> {
		await this.#transport.connect();
	}

	// RICH PRESENCE

	async #request(cmd: string, args?: any): Promise<any> {
		this.#transport.send(IPC_OPERATION.FRAME, {
			cmd,
			args,
			nonce: crypto.randomUUID(),
		});
	}

	async setActivity(activity: Activity, pid?: number): Promise<void> {
		// name, url, created_at, application_id, and emoji are receive-only
		// (see the Activity interface) and are intentionally never forwarded here.
		const cleaned: Partial<Activity> = {};
		if (activity.status_display_type !== undefined)
			cleaned.status_display_type = activity.status_display_type;
		if (activity.state) cleaned.state = activity.state;
		if (activity.state_url) cleaned.state_url = activity.state_url;
		if (activity.details) cleaned.details = activity.details;
		if (activity.details_url) cleaned.details_url = activity.details_url;

		if (activity.timestamps && Object.entries(activity.timestamps).length > 0) {
			cleaned.timestamps = {};
			if (activity.timestamps?.start)
				cleaned.timestamps.start = activity.timestamps.start;
			if (activity.timestamps?.end)
				cleaned.timestamps.end = activity.timestamps.end;
		}

		if (activity.flags)
			cleaned.flags = activity.flags;

		if (activity.assets && Object.entries(activity.assets).length > 0) {
			cleaned.assets = {};
			if (activity.assets?.large_image)
				cleaned.assets.large_image = activity.assets.large_image;
			if (activity.assets?.large_text)
				cleaned.assets.large_text = activity.assets.large_text;
			if (activity.assets?.large_url)
				cleaned.assets.large_url = activity.assets.large_url;
			if (activity.assets?.small_image)
				cleaned.assets.small_image = activity.assets.small_image;
			if (activity.assets?.small_text)
				cleaned.assets.small_text = activity.assets.small_text;
			if (activity.assets?.small_url)
				cleaned.assets.small_url = activity.assets.small_url;
		}

		if (activity.party && Object.entries(activity.party).length > 0) {
			cleaned.party = {};
			if (activity.party?.id) cleaned.party.id = activity.party.id;
			if (activity.party?.size) cleaned.party.size = activity.party.size;
		}

		if (activity.secrets && Object.entries(activity.secrets).length > 0) {
			cleaned.secrets = {};
			if (activity.secrets?.join) cleaned.secrets.join = activity.secrets.join;
			if (activity.secrets?.spectate)
				cleaned.secrets.spectate = activity.secrets.spectate;
			if (activity.secrets?.match) cleaned.secrets.match = activity.secrets.match;
		}

		if (activity.instance !== undefined) cleaned.instance = activity.instance;

		if (activity.buttons && activity.buttons.length > 0) {
			cleaned.buttons = [];
			for (const button of activity.buttons) {
				cleaned.buttons.push({
					label: button.label,
					url: button.url,
				});
			}
		}

		if (activity.type !== undefined) {
			if (!SETTABLE_ACTIVITY_TYPES.includes(activity.type))
				throw new Error(
					`Invalid activity type: ${activity.type}. SET_ACTIVITY only supports Playing, Listening, Watching, or Competing.`,
				);
			cleaned.type = activity.type;
		}

		await this.#request("SET_ACTIVITY", {
			pid: pid ?? process.pid ?? 0,
			activity: cleaned,
		});
	}

	async clearActivity(pid?: number): Promise<void> {
		await this.#request("CLEAR_ACTIVITY", {
			pid: pid ?? process.pid ?? 0,
		});
	}

	async destroy(): Promise<void> {
		await this.#transport.close();
	}
}
