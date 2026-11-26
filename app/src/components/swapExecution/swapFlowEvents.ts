/**
 * swapFlowEvents — where the swap and Trim flows send their analytics events.
 *
 * The flows never import an analytics transport (fixture SWXE-7): they emit to whatever the
 * host app provides here. A host with analytics provides one function at its root; a host with
 * none provides nothing, and no event is built or sent. That is the whole seam — which is why
 * the events could exist for weeks with nothing receiving them, and why the first real swap left
 * no trace in analytics.
 *
 * Every event is one of ours, with a closed set of fields: see `swapExecutionEvents` and
 * `trimEvents` for what may and may not be in them.
 */
import { createContext } from "react";
import type { SwapExecutionEvent } from "../../suggestions/swapExecution/swapExecutionEvents";
import type { TrimEvent } from "../../suggestions/swapExecution/trimEvents";

export type SwapFlowEvent = SwapExecutionEvent | TrimEvent;
export type SwapFlowEmitter = (event: SwapFlowEvent) => void;

export const SwapFlowEventsContext = createContext<SwapFlowEmitter | null>(null);
