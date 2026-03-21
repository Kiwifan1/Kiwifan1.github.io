import { FissileProductionChain } from './FissileProductionChain';

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

		it('computes effective ticks with max upgrades', () => {
			expect(FissileProductionChain.getEffectiveTicks(100, 8)).toBe(12);
			expect(FissileProductionChain.getEffectiveTicks(200, 8)).toBe(23);
			expect(FissileProductionChain.getEffectiveTicks(1, 8)).toBe(1);
		});

		it('computes machine throughput', () => {
			expect(FissileProductionChain.getMachineThroughput(1000, 100, 8)).toBeCloseTo(1000 / 12, 5);
			expect(FissileProductionChain.getMachineThroughput(2000, 100, 8)).toBeCloseTo(2000 / 12, 5);
			expect(FissileProductionChain.getMachineThroughput(1, 200, 8)).toBeCloseTo(1 / 23, 10);
		});

		it('computes machines needed rounding up', () => {
			expect(FissileProductionChain.machinesNeeded(100, 83.33)).toBe(2);
			expect(FissileProductionChain.machinesNeeded(83.33, 83.33)).toBe(1);
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

		it('has 10 stages', () => {
			expect(result.stages.length).toBe(11);
		});

		it('needs 4 Enrichment Chambers (Path A)', () => {
			const s = result.stages.find(s => s.name === 'Enrichment Chamber');
			expect(s).toBeDefined();
			expect(s!.count).toBe(4);
		});

		it('needs 2 Chemical Oxidizers for UO (Path A)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Oxidizer (Uranium Oxide)');
			expect(s).toBeDefined();
			expect(s!.count).toBe(2);
		});

		it('needs 3 Electrolytic Separators (O₂ production)', () => {
			const s = result.stages.find(s => s.name === 'Electrolytic Separator');
			expect(s).toBeDefined();
			expect(s!.count).toBe(3);
		});

		it('needs 1 Pressurized Reaction Chamber (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Pressurized Reaction Chamber');
			expect(s).toBeDefined();
			expect(s!.count).toBe(1);
		});

		it('needs 1 Chemical Oxidizer for SO2 (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Oxidizer (Sulfur Dioxide)');
			expect(s).toBeDefined();
			expect(s!.count).toBe(1);
		});

		it('needs 1 Chemical Infuser for SO3 (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Infuser (SO\u2083)');
			expect(s).toBeDefined();
			expect(s!.count).toBe(1);
		});

		it('needs 72 Rotary Condensentrators (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Rotary Condensentrator');
			expect(s).toBeDefined();
			expect(s!.count).toBe(72);
		});

		it('needs 1 Chemical Infuser for H2SO4 (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Infuser (H\u2082SO\u2084)');
			expect(s).toBeDefined();
			expect(s!.count).toBe(1);
		});

		it('needs 2 Chemical Dissolution Chambers (Path B)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Dissolution Chamber');
			expect(s).toBeDefined();
			expect(s!.count).toBe(2);
		});

		it('needs 2 Chemical Infusers for UF6 (Final)', () => {
			const s = result.stages.find(s => s.name === 'Chemical Infuser (UF\u2086)');
			expect(s).toBeDefined();
			expect(s!.count).toBe(2);
		});

		it('needs 4 Isotopic Centrifuges (Final)', () => {
			const s = result.stages.find(s => s.name === 'Isotopic Centrifuge');
			expect(s).toBeDefined();
			expect(s!.count).toBe(4);
		});

		it('computes 93 total machines', () => {
			expect(result.totalMachines).toBe(93);
		});

		it('computes uranium ingot rate', () => {
			expect(result.resources.uraniumIngotsPerTick).toBeCloseTo(0.144, 5);
		});

		it('computes fluorite rate', () => {
			expect(result.resources.fluoritePerTick).toBeCloseTo(0.144, 5);
		});

		it('computes coal rate', () => {
			expect(result.resources.coalPerTick).toBeCloseTo(0.036, 5);
		});

		it('computes water rate (PRC + Condensentrator + ES)', () => {
			// PRC: 14.4 + Condensentrator: 72 + ES: 3*800/12 = 200 → total ~286.4
			expect(result.resources.waterPerTick).toBeGreaterThan(280);
			expect(result.resources.waterPerTick).toBeLessThan(290);
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

		it('all machine counts are at least 1', () => {
			for (const stage of result.stages) {
				expect(stage.count).toBeGreaterThanOrEqual(1);
			}
		});

		it('has 10 stages', () => {
			expect(result.stages.length).toBe(11);
		});

		it('resource rates are positive', () => {
			expect(result.resources.uraniumIngotsPerTick).toBeGreaterThan(0);
			expect(result.resources.fluoritePerTick).toBeGreaterThan(0);
			expect(result.resources.coalPerTick).toBeGreaterThan(0);
			expect(result.resources.waterPerTick).toBeGreaterThan(0);
			expect(result.resources.totalEnergyPerTick).toBeGreaterThan(0);
		});
	});
});
