/**
 * Shared interface for all Mekanism processing machines.
 * Implemented by BatchMachine (ticks-per-operation) and FlowRateMachine (per-mB ratio).
 */
export interface ProcessingMachine {
	readonly name: string;
	readonly baseEnergy: number;
}
