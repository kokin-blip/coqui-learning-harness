import { useState } from "react";
import { Dialog } from "./Dialog.tsx";
import { host, chatGPTControl } from "../api.ts";
export const manageChatGPTUsage = () =>
  host("open", { url: "https://chatgpt.com/settings/usage" });
export function ChatGPTPlanBadge() {
  return (
    <span className="plan-usage">
      <span>Using ChatGPT plan</span>
      <button className="text-button" onClick={() => void manageChatGPTUsage()}>
        Manage usage
      </button>
    </span>
  );
}
export function ChatGPTPlanConfirmation({
  onDone,
  notify,
}: {
  onDone: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const acknowledge = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await chatGPTControl({ op: "acknowledge" });
      await onDone();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      title="You’re using your ChatGPT plan"
      onClose={() => void acknowledge()}
    >
      <p>
        Eligible AI requests in CoquiLearn will use your ChatGPT plan. You can
        review usage and manage limits in ChatGPT settings.
      </p>
      <div className="inline-actions">
        <button onClick={() => void manageChatGPTUsage()}>Manage usage</button>
        <button
          autoFocus
          className="primary"
          disabled={saving}
          onClick={() => void acknowledge()}
        >
          Got it
        </button>
      </div>
    </Dialog>
  );
}
