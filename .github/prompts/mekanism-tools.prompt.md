# Prompt: Mekanism Reactor Sizing & Costing Research Assistant

## Objective
You are preparing reference material for a design assistant that, given a target net power output (FE/t) and optional efficiency constraints, computes optimal Mekanism nuclear multiblock configurations (fission → thermoelectric boiler → industrial turbine, with fusion as an alternative input). The assistant must surface:
- Precise math to translate target FE/t into required steam/heat flow, component counts, and structural dimensions.
- Material and resource totals (block/item counts, fluids per tick, startup fuel) for each configuration.
- Performance characteristics, safety margins, and tuning levers so the tooling can iterate toward minimal footprint vs. maximal throughput solutions.

## Scope & Versioning
- Target Mekanism v10.4+ (`1.20.x`). Log the exact commit/tag used.
- Distinguish defaults from configurable values (toml configs, datapacks). Annotate every derivation with its source path or URL.
- Capture both water-cooled and sodium-cooled pathways, plus fusion-driven boiler/turbine stacks.

## Deliverables
Produce a markdown knowledge base featuring:

1. **Input/Output Model**
   - Define all required inputs for the sizing tool (e.g., desired FE/t, available coolant, max footprint, allowed heat load, inventory of construction materials).
   - Enumerate derived outputs: component counts, fluid flow rates, expected FE/t, safety headroom, build bill-of-materials (BoM), and tick-based fuel/consumables.

2. **Fission Reactor Formulas**
   - Structural equations converting interior dimensions into:
     - `fuelAssemblyCount`, `controlRodCount`, `burnRateCap`, `heatCapacity`.
   - Optimization targets:
     - `burnRate_needed = downstreamSteamDemand / heatedCoolantOutput`.
     - Constraints for meltdown temperature, SCRAM thresholds, neutron relationships.
   - Fuel-specific properties:
     - Extract per-tick multipliers and highlight how configurable multipliers affect burn rate and heat.
   - Material ledger:
     - Blocks per casing height (casing, structural glass, fuel assemblies, control rods, logic ports).
     - Fluids required to fill reactor (coolant volume, fallback fluid volumes for sodium/water).
   - Efficiency tips (e.g., rod insertion logic) and how the tooling should select rod counts vs. burn rate to minimize waste.

3. **Thermoelectric Boiler Mechanics**
   - Map heated coolant input to steam output:
     - `steamProduced/t = f(heatAvailable, superheatingSurface, boilCapacity, waterSupply)`.
     - Constants for water heat capacity, sodium energy density, heat dissipation.
   - Sizing math:
     - Derive formulas for casing size vs. water/sodium tank capacities.
     - Equations to determine minimum `superheatingElements` to match reactor output.
   - Material costs:
     - Counts for structural blocks, valves, superheating elements, pressure dispersers.
   - Loss modeling (heat leak, temperature equilibrium) needed for accuracy margins.

4. **Industrial Turbine Dynamics**
   - Steam intake sizing:
     - `maxSteamFlow/t` from tower height, pressure dispersers, vents, steam adapters.
   - Rotor/coil optimization:
     - Conversion of blade/disc counts into efficiency and FE/t.
     - Coil material tiers with conversion constants (FE per mB steam, saturation thresholds).
   - Back-pressure and saturation limits to prevent over-speed.
   - Material tally:
     - Rotor components, cases, coils, valves, structural glass, vents.
   - Water return rate and integration with boiler loop.

5. **Fusion Reactor (Alternative Supply)**
   - Injection rate to plasma temperature relationship.
   - DT fuel consumption vs. produced steam/heat when coupled to boilers/turbines.
   - Startup energy requirements (laser pre-heat) and sustaining energy balance.
   - Component/material breakdown (electromagnets, ports, laser amplifiers) for BoM purposes.

6. **End-to-End Optimization Workflow**
   - Step-by-step algorithm sketch:
     1. Translate target FE/t into required steam/heat.
     2. Solve for turbine configuration that meets or exceeds target with efficiency constraints.
     3. Back-calculate boiler capacity to feed turbine.
     4. Derive fission/fusion reactor parameters delivering requisite heat.
     5. Validate safety (temperature, pressure) and adjust control rod insertion/burn rate.
     6. Compile material list and fluid inventories.
   - Provide inequality checks (e.g., reactor heat output ≥ boiler consumption ≥ turbine demand).
   - Include sample solved scenario with default values, showing intermediate calculations and final BoM.

7. **Configuration and Scaling Notes**
   - Highlight relevant config keys in `mekanism/common/config/MekanismConfig.java` and datapacks that affect scaling.
   - Document how changing multipliers (e.g., `fissionMaxBurn`, turbine energy density) alters sizing outputs; give formula adjustments.

8. **Validation & Error Handling**
   - Define sanity checks for the tooling (e.g., negative flow, exceeding meltdown temperature).
   - Identify telemetry to monitor during runtime (temperature headroom, waste tank levels).
   - Note recommended safety automation (redstone logic, computer integration) with references.

## Methodology Checklist
- ✅ Scrape Mekanism source files (`FissionReactorMultiblockData`, `BoilerMultiblockData`, `TurbineMultiblockData`, `FusionReactorMultiblockData`, `MekanismConfig`) for authoritative formulas and constants.
- ✅ Extract default datapack entries (`data/mekanism/fission_fuel/*.json`, `heated_coolant`, `turbine_blades`, etc.).
- ✅ Compile block/item crafting requirements (pull from Mekanism recipes/datapack JSON).
- ✅ Cross-reference official documentation/wikis; flag conflicts for manual review.
- ✅ All formulas must specify units (mB/t, FE/t, Kelvin, Joules).

## Known Defaults to Verify
- `fissile_fuel`: `waste = 0.5 mB`, `coolantInput = 10 mB`, `heatedCoolantOutput = 10 mB`, `heatGeneration` constants.
- Boiler superheating surface increases boil rate linearly; confirm coefficient.
- Turbine electromagnetic coil FE conversion constant and saturation cap.
- Fusion reactor `maxInjectionRate` relation to plasma temperature and power.

## Output Formatting Requirements
- Organize results into formula tables (LaTeX or clear algebra).
- Provide BoM tables per multiblock with counts and crafting references.
- Include diagrams or dependency bullet lists for tick-by-tick flow.
- Flag configurable/situational values with callouts for user confirmation.

## Stretch Goals
- Parametric optimization for minimal casing volume vs. target FE/t.
- Cost weighting (e.g., rare materials) to suggest budget-friendly builds.
- Integration hooks for future modules (waste reprocessing, power storage via induction matrices).
- Provide placeholders where empirical testing is required and note missing data; prompt the user for inputs if unavailable.
