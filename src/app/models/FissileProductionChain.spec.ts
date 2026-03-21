import { FissileProductionChain, BatchMachineStage, FlowRateMachineStage } from './FissileProductionChain';

describe('FissileProductionChain', () => {
	describe('validation', () => {
		it('rejects fuel rate below minimum', () => {
			expect(() => new FissileProductionChain(0)).toThrowError(/Target fuel rate/);
		});

		it('rejects fuel rate above maximum', () => {
			expect(() => new FissileProductionChain(20000)).toThrowError(/Target fuel rate/);
		});

		it('rejects negative speed upgrades', () => {
			expect(() => new FissileProductionChain(10, -1)).toThrowError(/Speed upgrades/);
		});

		it('rejects speed upgrades above 8', () => {
			expect(() => new FissileProductionChain(10, 9)).toThrowError(/Speed upgrades/);
		});

		it('rejects non-integer speed upgrades', () => {
			expect(() => new FissileProductionChain(10, 1.5)).toThrowError(/integer/);
		});

		it('accepts valid inputs', () => {
			const chain = new FissileProductionChain(288, 8);
			expect(chain.targetFuelRate).toBe(288);
			expect(chain.speedUpgrades).toBe(8);
		});
	});

	describe('static helpers', () => {
		it('computes effective ticks with no upgrades', () => {
			expect(FissileProductionChain.getEffectiveTicks(100, 0)).toBe(100);
			expect(FissileProductionChain.getEffectiveTicks(200, 0)).toBe(200);
		});

		it('computes effective ticks with max upgrades (exponential formula)', () => {
			// ceil(100 × 10^(-1)) = ceil(10) = 10
			expect(FissileProductionChain.getEffectiveTicks(100, 8)).toBe(10);
			// ceil(200 × 10^(-1)) = ceil(20) = 20
			expect(FissileProductionChain.getEffectiveTicks(200, 8)).toBe(20);
		});

		it('computes effective ticks with partial upgrades', () => {
			// ceil(100 × 10^(-4/8)) = ceil(100 × 0.3162) = ceil(31.62) = 32
			expect(FissileProductionChain.getEffectiveTicks(100, 4)).toBe(32);
		});
	});

	describe('calculate (R=288, u=8)', () => {
		let result: ReturnType<FissileProductionChain['calculate']>;

		beforeAll(() => {
			result = new FissileProductionChain(288, 8).calculate();
		});

		it('returns correct target and upgrades', () => {
			expect(result.targetFuelRate).toBe(288);
			expect(result.speedUpgrades).toBe(8);
		});

		it('has 11 stages (5 batch + 6 flow)', () => {
			expect(result.stages.length).toBe(11);
			const batch = result.stages.filter(s => s.type === 'batch');
			const flow = result.stages.filter(s => s.type === 'flow');
			expect(batch.length).toBe(5);
			expect(flow.length).toBe(6);
		});

		it('all flow-rate machines have count=1', () => {
			const flow = result.stages.filter(s => s.type === 'flow') as FlowRateMachineStage[];
			for (const s of flow) {
				expect(s.count).toBe(1);
			}
		});

		it('computes correct batch machine counts', () => {
			const getBatch = (name: string) =>
				result.stages.find(s => s.name === name) as BatchMachineStage;

			// Enrichment: 0.288 ops/t, throughput = 1/20 = 0.05 ops/t, count = ceil(5.76) = 6
			const ec = getBatch('Enrichment Chamber');
			expect(ec).toBeDefined();
			expect(ec.count).toBe(6);

			// Oxidizer UO: 0.576 ops/t, throughput = 1/10 = 0.1 ops/t, count = ceil(5.76) = 6
			const oxU = getBatch('Chemical Oxidizer (Uranium Oxide)');
			expect(oxU).toBeDefined();
			expect(oxU.count).toBe(6);

			const prc = getBatch('Pressurized Reaction Chamber');
			expect(prc).toBeDefined();
			expect(prc.count).toBe(1);

			const oxS = getBatch('Chemical Oxidizer (Sulfur Dioxide)');
			expect(oxS).toBeDefined();
			expect(oxS.count).toBe(1);

			const dc = getBatch('Chemical Dissolution Chamber');
			expect(dc).toBeDefined();
			expect(dc.count).toBe(2);
		});

		it('computes correct total machines', () => {
			// 6+6+1+1+2 (batch) + 6 (flow) = 22
			expect(result.totalMachines).toBe(22);
		});

		it('computes uranium ingot rate', () => {
			expect(result.resources.uraniumIngotsPerTick).toBeCloseTo(0.288, 5);
		});

		it('computes fluorite rate', () => {
			expect(result.resources.fluoritePerTick).toBeCloseTo(0.144, 5);
		});

		it('computes coal rate', () => {
			expect(result.resources.coalPerTick).toBeCloseTo(0.00144, 5);
		});

		it('computes water rate', () => {
			expect(result.resources.waterMbPerTick).toBeCloseTo(0.72, 3);
		});

		it('total energy is sum of all stages', () => {
			const sum = result.stages.reduce((total, s) => total + s.energyPerTick, 0);
			expect(result.resources.totalEnergyPerTick).toBeCloseTo(sum, 5);
		});
	});

	describe('calculate (R=1, u=0) edge case', () => {
		let result: ReturnType<FissileProductionChain['calculate']>;

		beforeAll(() => {
			result = new FissileProductionChain(1, 0).calculate();
		});

		it('all batch machine counts are at least 1', () => {
			const batch = result.stages.filter(s => s.type === 'batch');
			for (const s of batch) {
				expect(s.count).toBeGreaterThanOrEqual(1);
			}
		});

		it('has 11 stages', () => {
			expect(result.stages.length).toBe(11);
		});

		it('resource rates are positive', () => {
			expect(result.resources.uraniumIngotsPerTick).toBeGreaterThan(0);
			expect(result.resources.fluoritePerTick).toBeGreaterThan(0);
			expect(result.resources.coalPerTick).toBeGreaterThan(0);
			expect(result.resources.waterMbPerTick).toBeGreaterThan(0);
			expect(result.resources.totalEnergyPerTick).toBeGreaterThan(0);
		});
	});
});
