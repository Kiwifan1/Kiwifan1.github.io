# Fissile Fuel Production Chain

## Processing Chain Overview

The Fissile Fuel production chain splits into two parallel paths that converge in a final assembly stage. **Path A** produces Uranium Oxide from Uranium Ingots. **Path B** synthesises Hydrofluoric Acid through a multi-step sulfuric acid sub-chain plus Fluorite. The two intermediates (UO and HF) combine into Uranium Hexafluoride, which is centrifuged into Fissile Fuel.

```mermaid
flowchart TD
    subgraph PathA["Path A -- Uranium Oxide"]
        UI["Uranium Ingot"] -->|"1 ingot"| EC["Enrichment Chamber"]
        EC -->|"2 items"| YC["Yellow Cake Uranium"]
        YC -->|"1 item"| COu["Chemical Oxidizer"]
        COu -->|"250 mB"| UO["Uranium Oxide"]
    end

    subgraph PathB["Path B -- Hydrofluoric Acid"]
        Coal["Coal"] -->|"1 item"| PRC["Pressurized Reaction Chamber"]
        Water1["Water"] -->|"100 mB"| PRC
        O2a["$$O_2$$"] -->|"100 mB"| PRC
        PRC -->|"1 item + 100 mB H₂"| SD["Sulfur Dust"]
        SD -->|"1 item"| COs["Chemical Oxidizer"]
        COs -->|"100 mB"| SO2["$$SO_2$$"]
        O2b["$$O_2$$"] -->|"1 mB"| CI1["Chemical Infuser"]
        SO2 -->|"2 mB"| CI1
        CI1 -->|"2 mB"| SO3["$$SO_3$$"]
        Water2["Water"] -->|"1 mB : 1 mB"| RC["Rotary Condensentrator"]
        RC -->|"Water Vapor"| WV["Water Vapor"]
        SO3 -->|"1 mB"| CI2["Chemical Infuser"]
        WV -->|"1 mB"| CI2
        CI2 -->|"1 mB"| H2SO4["$$H_2SO_4$$"]
        Fluorite["Fluorite"] -->|"1 item"| CDC["Chemical Dissolution Chamber"]
        H2SO4 -->|"1 mB"| CDC
        CDC -->|"1000 mB"| HF["Hydrofluoric Acid"]
    end

    subgraph Final["Final Assembly"]
        HF -->|"1 mB"| CI3["Chemical Infuser"]
        UO -->|"1 mB"| CI3
        CI3 -->|"2 mB"| UF6["$$UF_6$$"]
        UF6 -->|"1 mB"| IC["Isotopic Centrifuge"]
        IC -->|"1 mB"| FF["Fissile Fuel"]
    end
```

## Variable Definitions

| Symbol | Meaning |
| ------ | ------- |
| $u$ | Number of speed upgrades installed ($0 \leq u \leq 8$) |
| $t_{\text{base}}$ | Base processing time of a machine (in ticks) |
| $t_{\text{eff}}$ | Effective processing time after speed upgrades (in ticks) |
| $R$ | Target Fissile Fuel output rate (mB/t) |
| $\lambda_i$ | Output rate of a single machine at stage $i$ (mB/t or items/t) |
| $N_i$ | Number of machines required at stage $i$ |
| $\varepsilon_i$ | Base energy per operation at stage $i$ (J) |
| $\mathcal{E}$ | Total energy consumption across all stages (J/t) |
| $\omega_U$ | Uranium Ingot consumption rate (items/t) |
| $\omega_F$ | Fluorite consumption rate (items/t) |
| $\omega_C$ | Coal consumption rate (items/t) |
| $\eta_w$ | Total water consumption rate (mB/t) |
| $\eta_{O_2}$ | Total oxygen consumption rate (mB/t) |

## Constants Table

Machine specs from `PRODUCTION_CHAIN.*` in `constants.ts`:

### Batch Machines

These machines process discrete operations with a base tick duration. Speed upgrades reduce the ticks per operation.

| # | Stage | Machine | $t_{\text{base}}$ | Input | Output | $\varepsilon_i$ (J) |
| - | ----- | ------- | ------------------ | ----- | ------ | -------------------- |
| A1 | Path A | `Enrichment Chamber` | 200 | 1 Uranium Ingot | 2 Yellow Cake | 16{,}000 |
| A2 | Path A | `Chemical Oxidizer (UO)` | 100 | 1 Yellow Cake | 250 mB UO | 40{,}000 |
| B1 | Path B | `Pressurized Reaction Chamber` | 100 | 1 Coal + 100 mB Water + 100 mB O$_2$ | 1 Sulfur Dust + 100 mB H$_2$ | 20{,}000 |
| B2 | Path B | `Chemical Oxidizer (SO$_2$)` | 100 | 1 Sulfur Dust | 100 mB SO$_2$ | 40{,}000 |
| B6 | Path B | `Chemical Dissolution Chamber` | 100 | 1 Fluorite + 1 mB H$_2$SO$_4$ | 1{,}000 mB HF | 80{,}000 |

### Flow-Rate Machines

These machines operate on a **per-mB ratio** basis — they do not have a ticks-per-operation cycle like batch machines. Instead, they continuously convert input to output at whatever rate the piping can supply. For modelling purposes, **1 machine of each type is sufficient** to handle any throughput, limited only by pipe bandwidth.

| # | Stage | Machine | Per-mB Ratio | $\varepsilon_i$ (J) |
| - | ----- | ------- | ------------ | -------------------- |
| B3 | Path B | `Chemical Infuser (SO$_3$)` | 2 mB SO$_2$ + 1 mB O$_2$ → 2 mB SO$_3$ | 40{,}000 |
| B4 | Path B | `Rotary Condensentrator` | 1 mB Water → 1 mB Water Vapor | 400 |
| B5 | Path B | `Chemical Infuser (H$_2$SO$_4$)` | 1 mB SO$_3$ + 1 mB Vapor → 1 mB H$_2$SO$_4$ | 40{,}000 |
| F1 | Final | `Chemical Infuser (UF$_6$)` | 1 mB HF + 1 mB UO → 2 mB UF$_6$ | 40{,}000 |
| F2 | Final | `Isotopic Centrifuge` | 1 mB UF$_6$ → 1 mB Fissile Fuel | 40{,}000 |
| ES | Support | `Electrolytic Separator` | 2 mB Water → 2 mB H$_2$ + 1 mB O$_2$ | 80{,}000 |

Maximum speed upgrades (batch machines only): $u_{\max} = 8$ (`PRODUCTION_CHAIN.MAX_SPEED_UPGRADES`).

## Speed Upgrade Formula

Each **batch** Mekanism machine can hold up to 8 speed upgrades. The effective processing time for a machine with $u$ speed upgrades ($0 \leq u \leq 8$) is:

$$t_{\text{eff}} = \left\lceil\dfrac{t_{\text{base}}}{1 + u}\right\rceil$$

Flow-rate machines (Chemical Infusers, Isotopic Centrifuge, Electrolytic Separator, Rotary Condensentrator) do not have a ticks-per-operation cycle, so speed upgrades do not apply to them.

For the two distinct base tick values used by batch machines in this chain:

| $u$ | $t_{\text{eff}}$ ($t_{\text{base}} = 200$) | $t_{\text{eff}}$ ($t_{\text{base}} = 100$) |
| --- | ------------------------------------------- | ------------------------------------------- |
| 0 | 200 | 100 |
| 1 | 100 | 50 |
| 2 | 67 | 34 |
| 3 | 50 | 25 |
| 4 | 40 | 20 |
| 5 | 34 | 17 |
| 6 | 29 | 15 |
| 7 | 25 | 13 |
| 8 | 23 | 12 |

Batch machines with $t_{\text{base}} = 200$: Enrichment Chamber (A1).
Batch machines with $t_{\text{base}} = 100$: Chemical Oxidizer UO (A2), PRC (B1), Chemical Oxidizer SO$_2$ (B2), Dissolution Chamber (B6).

## Throughput Calculations

### Per-Machine Output Rates

For **batch machines**, the output rate of a single machine is determined by dividing its output quantity per operation by $t_{\text{eff}}$:

**Path A:**

$$\lambda_{A1} = \dfrac{2}{t_{\text{eff},A1}} \text{ items/t (Yellow Cake)}$$

$$\lambda_{A2} = \dfrac{250}{t_{\text{eff},A2}} \text{ mB/t (UO)}$$

**Path B:**

$$\lambda_{B1} = \dfrac{1}{t_{\text{eff},B1}} \text{ items/t (Sulfur Dust)}$$

$$\lambda_{B2} = \dfrac{100}{t_{\text{eff},B2}} \text{ mB/t (SO}_2\text{)}$$

$$\lambda_{B6} = \dfrac{1{,}000}{t_{\text{eff},B6}} \text{ mB/t (HF)}$$

**Flow-rate machines** (B3, B4, B5, F1, F2, ES) process continuously at whatever rate inputs are supplied. A single machine of each type handles any demand, so $\lambda$ and $N$ calculations are not needed for them.

## Machine Count Formulas

We work backwards from a target Fissile Fuel production rate $R$ (mB/t). At each stage we compute the demand rate flowing into that machine and divide by its single-machine output to obtain the machine count (rounded up). Flow-rate machines always need only 1 machine each.

### Stage F2 -- Isotopic Centrifuge (flow-rate)

Converts 1 mB UF$_6$ → 1 mB Fissile Fuel continuously.

$$N_{F2} = 1$$

The required UF$_6$ rate is:

$$D_{UF_6} = R \text{ mB/t}$$

### Stage F1 -- Chemical Infuser UF$_6$ (flow-rate)

Combines 1 mB HF + 1 mB UO → 2 mB UF$_6$ continuously.

$$N_{F1} = 1$$

The required HF and UO rates are each:

$$D_{HF} = D_{UO} = \dfrac{R}{2} \text{ mB/t}$$

### Path A -- Uranium Oxide

**Stage A2 -- Chemical Oxidizer (UO):**
Each operation converts 1 Yellow Cake into 250 mB UO.

$$N_{A2} = \left\lceil\dfrac{D_{UO}}{\lambda_{A2}}\right\rceil = \left\lceil\dfrac{D_{UO} \cdot t_{\text{eff},A2}}{250}\right\rceil$$

The required Yellow Cake rate is:

$$D_{YC} = \dfrac{D_{UO}}{250} = \dfrac{R}{500} \text{ items/t}$$

**Stage A1 -- Enrichment Chamber:**
Each operation converts 1 Uranium Ingot into 2 Yellow Cake.

$$N_{A1} = \left\lceil\dfrac{D_{YC}}{\lambda_{A1}}\right\rceil = \left\lceil\dfrac{D_{YC} \cdot t_{\text{eff},A1}}{2}\right\rceil$$

The required Uranium Ingot rate is:

$$D_{\text{Ingot}} = \dfrac{D_{YC}}{2} = \dfrac{R}{1{,}000} \text{ items/t}$$

### Path B -- Hydrofluoric Acid

**Stage B6 -- Chemical Dissolution Chamber:**
Each operation converts 1 Fluorite + 1 mB H$_2$SO$_4$ into 1{,}000 mB HF.

$$N_{B6} = \left\lceil\dfrac{D_{HF}}{\lambda_{B6}}\right\rceil = \left\lceil\dfrac{D_{HF} \cdot t_{\text{eff},B6}}{1{,}000}\right\rceil$$

The required Fluorite and H$_2$SO$_4$ rates are:

$$D_{\text{Fluorite}} = \dfrac{D_{HF}}{1{,}000} = \dfrac{R}{2{,}000} \text{ items/t}$$

$$D_{H_2SO_4} = \dfrac{D_{HF}}{1{,}000} = \dfrac{R}{2{,}000} \text{ mB/t}$$

**Stage B5 -- Chemical Infuser H$_2$SO$_4$ (flow-rate):**
Combines 1 mB SO$_3$ + 1 mB Water Vapor → 1 mB H$_2$SO$_4$ continuously.

$$N_{B5} = 1$$

The required SO$_3$ and Water Vapor rates are each:

$$D_{SO_3} = D_{\text{Vapor}} = D_{H_2SO_4} = \dfrac{R}{2{,}000} \text{ mB/t}$$

**Stage B4 -- Rotary Condensentrator (flow-rate):**
Converts Water to Water Vapor at 1 mB : 1 mB continuously.

$$N_{B4} = 1$$

**Stage B3 -- Chemical Infuser SO$_3$ (flow-rate):**
Combines 2 mB SO$_2$ + 1 mB O$_2$ → 2 mB SO$_3$ continuously (i.e., SO$_2$ passes through 1:1 in volume, while O$_2$ is consumed at half the SO$_3$ rate).

$$N_{B3} = 1$$

The required SO$_2$ and O$_2$ (for this stage) rates are:

$$D_{SO_2} = D_{SO_3} = \dfrac{R}{2{,}000} \text{ mB/t}$$

$$D_{O_2}^{(B3)} = \dfrac{D_{SO_3}}{2} = \dfrac{R}{4{,}000} \text{ mB/t}$$

**Stage B2 -- Chemical Oxidizer (SO$_2$):**
Each operation converts 1 Sulfur Dust into 100 mB SO$_2$.

$$N_{B2} = \left\lceil\dfrac{D_{SO_2}}{\lambda_{B2}}\right\rceil = \left\lceil\dfrac{D_{SO_2} \cdot t_{\text{eff},B2}}{100}\right\rceil$$

The required Sulfur Dust rate is:

$$D_{\text{Sulfur}} = \dfrac{D_{SO_2}}{100} = \dfrac{R}{200{,}000} \text{ items/t}$$

**Stage B1 -- Pressurized Reaction Chamber:**
Each operation consumes 1 Coal + 100 mB Water + 100 mB O$_2$ and produces 1 Sulfur Dust + 100 mB H$_2$.

$$N_{B1} = \left\lceil\dfrac{D_{\text{Sulfur}}}{\lambda_{B1}}\right\rceil = \left\lceil D_{\text{Sulfur}} \cdot t_{\text{eff},B1} \right\rceil$$

**Stage ES -- Electrolytic Separator (flow-rate):**
Converts 2 mB Water → 2 mB H$_2$ + 1 mB O$_2$ continuously. Supplies all O$_2$ needed by the chain.

$$N_{ES} = 1$$

```mermaid
flowchart RL
    FF["Fissile Fuel"] -->|"$$R$$ mB/t"| IC["Isotopic Centrifuge"]
    IC -->|"$$R$$ mB/t UF₆"| CIuf["Infuser (UF₆)"]
    CIuf -->|"$$R/2$$ mB/t"| UO["UO demand"]
    CIuf -->|"$$R/2$$ mB/t"| HF["HF demand"]

    UO -->|"$$R/500$$ items/t"| COu["Chem. Oxidizer"]
    COu -->|"$$R/1000$$ items/t"| ECh["Enrichment Chamber"]
    ECh --> Ingots["Uranium Ingots"]

    HF -->|"$$R/2$$ mB/t"| CDC["Dissolution Chamber"]
    CDC --> Fl["Fluorite"]
    CDC -->|"$$R/2000$$ mB/t H₂SO₄"| CIh2so4["Infuser (H₂SO₄)"]
    CIh2so4 -->|"$$R/2000$$ mB/t"| Vapor["Condensentrator"]
    CIh2so4 -->|"$$R/2000$$ mB/t"| CIso3["Infuser (SO₃)"]
    CIso3 -->|"$$R/2000$$ mB/t"| COs["Oxidizer (SO₂)"]
    COs -->|"$$R/200000$$ /t"| PRC["PRC"]
    PRC --> Coal["Coal"]
    CIso3 --> ES["Electrolytic Separator"]
    PRC --> ES
    ES -->|"$$3R/4000$$ mB/t O₂"| O2["O₂ supply"]
    ES -->|"$$3R/2000$$ mB/t Water"| WaterES["Water (ES)"]
```

## Resource Input Rates

### Uranium Ingot Consumption

$$\omega_U = D_{\text{Ingot}} = \dfrac{R}{1{,}000} \text{ items/t}$$

### Fluorite Consumption

$$\omega_F = \dfrac{D_{HF}}{1{,}000} = \dfrac{R}{2{,}000} \text{ items/t}$$

### Coal Consumption

$$\omega_C = D_{\text{Sulfur}} = \dfrac{R}{200{,}000} \text{ items/t}$$

### Oxygen Consumption

Oxygen is consumed by the `Pressurized Reaction Chamber` (B1, 100 mB per op) and the `Chemical Infuser SO$_3$` (B3, 1 mB O$_2$ per 2 mB SO$_3$):

$$\eta_{O_2} = \underbrace{D_{\text{Sulfur}} \cdot 100}_{\text{PRC}} + \underbrace{D_{O_2}^{(B3)}}_{\text{SO}_3\text{ Infuser}} = \dfrac{R}{2{,}000} + \dfrac{R}{4{,}000} = \dfrac{3R}{4{,}000} \text{ mB/t}$$

### Water Consumption

Water is consumed by three subsystems: the `Pressurized Reaction Chamber` (B1), the `Rotary Condensentrator` (B4), and the `Electrolytic Separator` (ES, to produce all O$_2$).

The ES must produce $\eta_{O_2} = \dfrac{3R}{4{,}000}$ mB/t of O$_2$. Since 2 mB Water yields 1 mB O$_2$, the ES water demand is $2 \cdot \dfrac{3R}{4{,}000} = \dfrac{3R}{2{,}000}$ mB/t.

$$\eta_w = \underbrace{D_{\text{Sulfur}} \cdot 100}_{\text{PRC}} + \underbrace{D_{\text{Vapor}}}_{\text{Condensentrator}} + \underbrace{\dfrac{3R}{2{,}000}}_{\text{ES}} = \dfrac{R}{2{,}000} + \dfrac{R}{2{,}000} + \dfrac{3R}{2{,}000} = \dfrac{5R}{2{,}000} = \dfrac{R}{400} \text{ mB/t}$$

### Total Energy Consumption

For **batch machines**, the energy per tick for a single machine at stage $i$ is $\varepsilon_i / t_{\text{eff},i}$. For **flow-rate machines**, energy consumption depends on actual throughput and is not captured by the simple $\varepsilon / t_{\text{eff}}$ formula. The batch-machine energy sum is:

$$\mathcal{E}_{\text{batch}} = N_{A1} \cdot \dfrac{16{,}000}{t_{\text{eff},A1}} + N_{A2} \cdot \dfrac{40{,}000}{t_{\text{eff},A2}} + N_{B1} \cdot \dfrac{20{,}000}{t_{\text{eff},B1}} + N_{B2} \cdot \dfrac{40{,}000}{t_{\text{eff},B2}} + N_{B6} \cdot \dfrac{80{,}000}{t_{\text{eff},B6}}$$

> Flow-rate machine energy (B3, B4, B5, F1, F2, ES) is throughput-dependent and should be measured in-game or calculated from the per-mB energy cost at the actual flow rate.

## Worked Example

Consider a default $10 \times 10 \times 12$ `Fission Reactor` with a burn rate of $R = 288$ mB/t and all batch machines equipped with $u = 8$ speed upgrades.

### Effective Processing Times

From the speed upgrade formula with $u = 8$:

$$t_{\text{eff}} = \left\lceil\dfrac{t_{\text{base}}}{1 + 8}\right\rceil = \left\lceil\dfrac{t_{\text{base}}}{9}\right\rceil$$

- Batch stages with $t_{\text{base}} = 100$ (A2, B1, B2, B6): $t_{\text{eff}} = \left\lceil\dfrac{100}{9}\right\rceil = 12$ ticks
- Batch stage with $t_{\text{base}} = 200$ (A1): $t_{\text{eff}} = \left\lceil\dfrac{200}{9}\right\rceil = 23$ ticks
- Flow-rate machines (B3, B4, B5, F1, F2, ES): no tick cycle -- 1 machine each

### Intermediate Demand Rates

Working backwards from $R = 288$ mB/t:

$$D_{UF_6} = R = 288 \text{ mB/t}$$

$$D_{HF} = D_{UO} = \dfrac{288}{2} = 144 \text{ mB/t}$$

$$D_{YC} = \dfrac{144}{250} = 0.576 \text{ items/t}$$

$$D_{\text{Ingot}} = \dfrac{0.576}{2} = 0.288 \text{ items/t}$$

$$D_{H_2SO_4} = \dfrac{144}{1{,}000} = 0.144 \text{ mB/t}$$

$$D_{SO_3} = D_{\text{Vapor}} = 0.144 \text{ mB/t}$$

$$D_{SO_2} = 0.144 \text{ mB/t}, \quad D_{O_2}^{(B3)} = \dfrac{0.144}{2} = 0.072 \text{ mB/t}$$

$$D_{\text{Sulfur}} = \dfrac{0.144}{100} = 0.00144 \text{ items/t}$$

$$D_{\text{Coal}} = D_{\text{Sulfur}} = 0.00144 \text{ items/t}$$

### Per-Machine Output Rates (batch machines only)

$$\lambda_{A1} = \dfrac{2}{23} \approx 0.0870 \text{ items/t (Yellow Cake)}$$

$$\lambda_{A2} = \dfrac{250}{12} \approx 20.833 \text{ mB/t (UO)}$$

$$\lambda_{B1} = \dfrac{1}{12} \approx 0.0833 \text{ items/t (Sulfur)}$$

$$\lambda_{B2} = \dfrac{100}{12} \approx 8.333 \text{ mB/t (SO}_2\text{)}$$

$$\lambda_{B6} = \dfrac{1{,}000}{12} \approx 83.33 \text{ mB/t (HF)}$$

### Machine Counts

**Final Assembly (flow-rate):**

$$N_{F2} = 1 \quad \text{(Isotopic Centrifuge)}$$

$$N_{F1} = 1 \quad \text{(Chemical Infuser UF}_6\text{)}$$

**Path A:**

$$N_{A2} = \left\lceil\dfrac{144}{20.833}\right\rceil = \left\lceil 6.912 \right\rceil = 7$$

$$N_{A1} = \left\lceil\dfrac{0.576}{0.0870}\right\rceil = \left\lceil\dfrac{0.576 \times 23}{2}\right\rceil = \left\lceil 6.624 \right\rceil = 7$$

**Path B:**

$$N_{B6} = \left\lceil\dfrac{144}{83.33}\right\rceil = \left\lceil 1.728 \right\rceil = 2$$

$$N_{B5} = 1 \quad \text{(Chemical Infuser H}_2\text{SO}_4\text{, flow-rate)}$$

$$N_{B4} = 1 \quad \text{(Rotary Condensentrator, flow-rate)}$$

$$N_{B3} = 1 \quad \text{(Chemical Infuser SO}_3\text{, flow-rate)}$$

$$N_{B2} = \left\lceil\dfrac{0.144}{8.333}\right\rceil = \left\lceil 0.01728 \right\rceil = 1$$

$$N_{B1} = \left\lceil 0.00144 \times 12 \right\rceil = \left\lceil 0.01728 \right\rceil = 1$$

**Support:**

$$N_{ES} = 1 \quad \text{(Electrolytic Separator, flow-rate)}$$

### Resource Rates

**Uranium Ingot consumption:**

$$\omega_U = \dfrac{288}{1{,}000} = 0.288 \text{ items/t} = 5.76 \text{ items/s}$$

**Fluorite consumption:**

$$\omega_F = \dfrac{288}{2{,}000} = 0.144 \text{ items/t} = 2.88 \text{ items/s}$$

**Coal consumption:**

$$\omega_C = \dfrac{288}{200{,}000} = 0.00144 \text{ items/t} = 0.0288 \text{ items/s}$$

**Oxygen consumption:**

$$\eta_{O_2} = \dfrac{3 \times 288}{4{,}000} = 0.216 \text{ mB/t}$$

Broken down:

- PRC: $0.00144 \times 100 = 0.144$ mB/t
- SO$_3$ Infuser: $0.072$ mB/t

**Water consumption:**

$$\eta_w = \dfrac{288}{400} = 0.72 \text{ mB/t}$$

Broken down:

- PRC: $0.00144 \times 100 = 0.144$ mB/t
- Condensentrator: $0.144$ mB/t
- ES (for O$_2$): $2 \times 0.216 = 0.432$ mB/t

**Hydrogen byproduct:**

- PRC: $0.00144 \times 100 = 0.144$ mB/t
- ES: $2 \times 0.216 = 0.432$ mB/t
- Total H$_2$: $0.576$ mB/t

### Energy Consumption (batch machines)

$$\mathcal{E}_{\text{batch}} = 7 \cdot \dfrac{16{,}000}{23} + 7 \cdot \dfrac{40{,}000}{12} + 1 \cdot \dfrac{20{,}000}{12} + 1 \cdot \dfrac{40{,}000}{12} + 2 \cdot \dfrac{80{,}000}{12}$$

$$\downarrow$$

$$\mathcal{E}_{\text{batch}} = 4{,}869.57 + 23{,}333.33 + 1{,}666.67 + 3{,}333.33 + 13{,}333.33$$

$$\downarrow$$

$$\mathcal{E}_{\text{batch}} \approx 46{,}536.23 \text{ J/t} \approx 46.54 \text{ kJ/t} \approx 18.61 \text{ kFE/t}$$

> Flow-rate machine energy (B3, B4, B5, F1, F2, ES) is additional and depends on actual throughput.

### Summary

| Stage | Machine | Count | Rate |
| ----- | ------- | ----- | ---- |
| A1 | `Enrichment Chamber` | 7 | 0.0870 items/t each |
| A2 | `Chemical Oxidizer (UO)` | 7 | 20.833 mB/t each |
| B1 | `Pressurized Reaction Chamber` | 1 | 0.0833 items/t |
| B2 | `Chemical Oxidizer (SO$_2$)` | 1 | 8.333 mB/t |
| B3 | `Chemical Infuser (SO$_3$)` | 1 | flow-rate |
| B4 | `Rotary Condensentrator` | 1 | flow-rate |
| B5 | `Chemical Infuser (H$_2$SO$_4$)` | 1 | flow-rate |
| B6 | `Chemical Dissolution Chamber` | 2 | 83.33 mB/t each |
| F1 | `Chemical Infuser (UF$_6$)` | 1 | flow-rate |
| F2 | `Isotopic Centrifuge` | 1 | flow-rate |
| ES | `Electrolytic Separator` | 1 | flow-rate |
| **Total** | | **24** | **288 mB/t Fissile Fuel** |

| Resource | Rate |
| -------- | ---- |
| Uranium Ingots | 0.288 items/t (5.76 items/s) |
| Fluorite | 0.144 items/t (2.88 items/s) |
| Coal | 0.00144 items/t (0.0288 items/s) |
| Water | 0.72 mB/t |
| Oxygen (O$_2$) | 0.216 mB/t (produced by ES) |
| H$_2$ byproduct | 0.576 mB/t |
| Batch energy | ~46.54 kJ/t (~18.61 kFE/t) |

```mermaid
pie title Machine Distribution (R=288, u=8)
    "Enrichment Chamber" : 7
    "Chemical Oxidizer (UO)" : 7
    "Chemical Dissolution Chamber" : 2
    "Pressurized Reaction Chamber" : 1
    "Chemical Oxidizer (SO2)" : 1
    "Chemical Infuser (SO3)" : 1
    "Rotary Condensentrator" : 1
    "Chemical Infuser (H2SO4)" : 1
    "Chemical Infuser (UF6)" : 1
    "Isotopic Centrifuge" : 1
    "Electrolytic Separator" : 1
```

> **Note:** Flow-rate machines (Chemical Infusers, Isotopic Centrifuge, Electrolytic Separator, Rotary Condensentrator) each need only 1 unit regardless of throughput -- they process continuously at whatever rate inputs are supplied, limited only by pipe bandwidth. The batch machines (Enrichment Chamber, Oxidizers, PRC, Dissolution Chamber) dominate the machine count at 18 of 24 total.

## Modpack Notice

> **Note:** Modpacks may modify machine recipes, processing rates, energy costs, or the production chain itself. The formulas and constants above reflect the default Mekanism configuration. Always verify `PRODUCTION_CHAIN.*` values in `constants.ts` or the in-game JEI/REI tooltips when playing a modpack.
