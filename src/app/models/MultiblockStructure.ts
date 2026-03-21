import { computeShellBreakdown } from '../utils/structure-shell';
import { ShellBreakdown } from './Shell';

/**
 * Abstract base class for all Mekanism multiblock structures.
 * Provides shared dimension handling, interior volume calculation,
 * and shell breakdown logic.
 */
export abstract class MultiblockStructure {
	public readonly width: number;
	public readonly height: number;
	public readonly length: number;
	public readonly interiorWidth: number;
	public readonly interiorHeight: number;
	public readonly interiorLength: number;

	constructor(width: number, height: number, length: number) {
		this.width = width;
		this.height = height;
		this.length = length;
		this.interiorWidth = Math.max(width - 2, 0);
		this.interiorHeight = Math.max(height - 2, 0);
		this.interiorLength = Math.max(length - 2, 0);
	}

	public getVolume(): number {
		return this.width * this.height * this.length;
	}

	public getInteriorVolume(): number {
		return this.interiorWidth * this.interiorHeight * this.interiorLength;
	}

	public getShellVolume(): number {
		return this.getVolume() - this.getInteriorVolume();
	}

	public getShellBreakdown(requiredPorts: number = 0): ShellBreakdown {
		return computeShellBreakdown(this.width, this.height, this.length, requiredPorts);
	}

	protected static validateDimensionRange(
		value: number, min: number, max: number, label: string
	): void {
		if (value < min || value > max) {
			throw new Error(`${label} must be between ${min} and ${max}`);
		}
	}
}
