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
			// ceil(100 / 9) = 12
			expect(FissileProductionChain.getEffectiveTicks(100, 8)).toBe(12);
			// ceil(200 / 9) = 23
			expect(FissileProductionChain.getEffectiveTicks(200, 8)).toBe(23);
		});

		it('computes machine throughput', () => {
			// 1800 mB output, 100 base ticks, 8 upgrades → 1800/12 = 150 mB/t
			expect(FissileProductionChain.getMachineThroughput(1800, 100, 8)).toBe(150);
			// 1 item output, 200 base ticks, 8 upgrades → 1/23
			expect(FissileProductionChain.getMachineThroughput(1, 200, 8)).toBeCloseTo(1 / 23, 10);
		});

		it('computes machines needed with exact division', () => {
			expect(FissileProductionChain.machinesNeeded(150, 150)).toBe(1);
		});

		it('computes machines needed rounding up', () => {
			expect(FissileProductionChain.machinesNeeded(151, 150)).toBe(2);
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

		it('computes 28 total machines', () => {
			expect(result.totalMachines).toBe(28);
		});

		it('has 7 stages', () => {
			expect(result.stages.length).toBe(7);
		});

		it('needs 1 Dissolution Chamber', () => {
			const dc = result.stages.find(s => s.name === 'Dissolution Chamber');
			expect(dc).toBeDefined();
			expect(dc!.count).toBe(1);
		});

		it('needs 1 Chemical Washer', () => {
			const cw = result.stages.find(s => s.name === 'Chemical Washer');
			expect(cw).toBeDefined();
			expect(cw!.count).toBe(1);
		});

		it('needs 2 Chemical Crystallizers', () => {
			const cc = result.stages.find(s => s.name === 'Chemical Crystallizer');
			expect(cc).toBeDefined();
			expect(cc!.count).toBe(2);
		});

		it('needs 4 Enrichment Chambers', () => {
			const ec = result.stages.find(s => s.name === 'Enrichment Chamber');
			expect(ec).toBeDefined();
			expect(ec!.count).toBe(4);
		});

		it('needs 2 Chemical Infusers for fuel', () => {
			const cif = result.stages.find(s => s.name === 'Chemical Infuser (Fuel)');
			expect(cif).toBeDefined();
			expect(cif!.count).toBe(2);
		});

		it('needs 9 Electrolytic Separators', () => {
			const es = result.stages.find(s => s.name === 'Electrolytic Separator');
			expect(es).toBeDefined();
			expect(es!.count).toBe(9);
		});

		it('needs 9 Chemical Infusers for HCl', () => {
			const cih = result.stages.find(s => s.name === 'Chemical Infuser (HCl)');
			expect(cih).toBeDefined();
			expect(cih!.count).toBe(9);
		});

		it('computes ore rate', () => {
			// dirty slurry = 28.8 mB/t, ore = 28.8 / 1800 = 0.016
			expect(result.resources.orePerTick).toBeCloseTo(0.016, 10);
		});

		it('computes chlorine rate', () => {
			// HCl needed = 144 mB/t, chlorine = 144 mB/t (1:1)
			expect(result.resources.chlorinePerTick).toBe(144);
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

		it('total machines is at least 7', () => {
			expect(result.totalMachines).toBeGreaterThanOrEqual(7);
		});

		it('resource rates are positive', () => {
			expect(result.resources.orePerTick).toBeGreaterThan(0);
			expect(result.resources.waterPerTick).toBeGreaterThan(0);
			expect(result.resources.chlorinePerTick).toBeGreaterThan(0);
			expect(result.resources.totalEnergyPerTick).toBeGreaterThan(0);
		});
	});
});
