/** Client-safe status only. Credentials and OAuth transaction data never enter this contract. */
export interface ChatGPTStatus {
	available: boolean;
	pending: boolean;
	hasPendingRegistration?: boolean;
	needsPlanConfirmation?: boolean;
	/** App-wide ChatGPT background permission, independent of account selection. */
	allowBackgroundUse: boolean;
	activeId: string | null;
	accounts: {
		id: string; email: string; registration: string; connected: boolean; planEnabled?: boolean;
		/** Main-owned authorization recovery eligibility. Missing means unknown, not eligible.
		 * False for storage failures, paused/closed connections, and healthy authorization. */
		canSignInAgain?: boolean;
	}[];
	error: string | null;
	catalogError?: string | null;
	diagnostic?:{status?:number;code?:string;requestId?:string;category:string;retryable:boolean;bodyShape:string};
}
export interface ChatGPTControlBridge {
	status(): Promise<ChatGPTStatus>;
	login(id?: string, fresh?: boolean): Promise<ChatGPTStatus>;
	cancel(): Promise<ChatGPTStatus>;
	select(id: string): Promise<ChatGPTStatus>;
	/** Explicitly forget every local registration/credential for this verified identity. */
	disconnect(id: string): Promise<ChatGPTStatus>;
	logout(id: string): Promise<ChatGPTStatus>;
	consent(enabled: boolean): Promise<ChatGPTStatus>;
	onChange(callback: () => void): () => void;
}

/** Only these account controls may cross the renderer-to-main boundary. */
export type ChatGPTCommand =
 | {op:"status"|"cancel"|"acknowledge"}
 | {op:"login"; id?:string; fresh?:boolean}
 | {op:"select"|"disconnect"|"logout";id:string}
 | {op:"consent";enabled:boolean};
