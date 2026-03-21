/**
 * A continuous-flow Mekanism machine.
 * Processes chemicals at per-mB ratios with no ticks-per-operation.
 * Always count=1 — throughput scales with pipe bandwidth, not machine count.
 */
export class FlowRateMachine {
  public readonly name: string;
  public readonly inputs: ReadonlyMap<string, number>;
  public readonly outputs: ReadonlyMap<string, number>;
  public readonly baseEnergy: number;

  constructor(
    name: string,
    inputs: Record<string, number>,
    outputs: Record<string, number>,
    baseEnergy: number
  ) {
    this.name = name;
    this.inputs = new Map(Object.entries(inputs));
    this.outputs = new Map(Object.entries(outputs));
    this.baseEnergy = baseEnergy;
  }

  /** Given a required output rate (mB/t) for a specific output, compute the input rate for a specific input. */
  public getInputRate(outputName: string, outputRate: number, inputName: string): number {
    const outputRatio = this.outputs.get(outputName);
    const inputRatio = this.inputs.get(inputName);
    if (outputRatio === undefined) throw new Error(`Unknown output: ${outputName}`);
    if (inputRatio === undefined) throw new Error(`Unknown input: ${inputName}`);
    return (outputRate / outputRatio) * inputRatio;
  }

  /** Given a required input rate (mB/t) for a specific input, compute the output rate for a specific output. */
  public getOutputRate(inputName: string, inputRate: number, outputName: string): number {
    const inputRatio = this.inputs.get(inputName);
    const outputRatio = this.outputs.get(outputName);
    if (inputRatio === undefined) throw new Error(`Unknown input: ${inputName}`);
    if (outputRatio === undefined) throw new Error(`Unknown output: ${outputName}`);
    return (inputRate / inputRatio) * outputRatio;
  }
}
