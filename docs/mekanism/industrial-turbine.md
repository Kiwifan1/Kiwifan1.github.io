# Industrial Turbine Information

## Config Values

Default Mekanism generator constants (sourced from `generators.toml`):

| Symbol                       | Meaning                                              | Default |
| ---------------------------- | ---------------------------------------------------- | ------- |
| $\tau$                       | Turbine blades handled by one `Electromagnetic Coil` | 4       |
| $\mu$                        | Maximum `Turbine Blade` count per turbine            | 28      |
| $\rho_{vent}$ (mB/t)         | Steam vent rate per `Turbine Vent`                   | 32,000  |
| $\delta$ (mB/t)              | Steam dispersion per `Pressure Disperser`            | 1,280   |
| $\varepsilon_{block}$ (J)    | Energy stored per turbine block                      | 16,000  |
| $\Sigma_{block}$ (mB)        | Steam stored per turbine block                       | 64,000  |
| $\varepsilon_{steam}$ (J/mB) | Energy extracted per mB of steam                     | 10      |
| $\rho_{cond}$ (mB/t)         | Condensation rate per `Saturating Condenser`         | 64,000  |

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 5x5x5 | 17x17x18 |

- Orientation can only be vertical
- Length and width must be equal (i.e., square base)
- Maximum Shaft Height = $\min(2 \cdot L - 5, 14)$
- Maximum Total Height = $\min(2 \cdot L - 1, 18)$
- Edges must be `Turbine Casing`
- Faces can be `Turbine Casing`, `Turbine Valve`, or `Structural Glass`
  - At the `Pressure Disperser` layer and above, `Turbine Vent` blocks can also be used
- Interior can only be `Pressure Disperser`, `Electromagnetic Coil`, `Turbine Rotor`, `Turbine Blade`, `Rotational Complex`, `Saturating Condenser`, or air.
- A single `Rotational Complex` must be placed directly above the uppermost `Turbine Rotor`.
- Each `Turbine Rotor` can support up to 2 `Turbine Blade`.

## Tank Volume

The tank volume $V_{tank}$ in mB is given by:

$$V_{tank} = L^2 \cdot h_{rotor}$$

Where $h_{rotor}$ is the height of the `Turbine Rotor` column.

## Flow Rate

The instantaneous steam throughput $Q$ (mB/t) is:

$$Q = \min(1, R_{flow}) \cdot R_{fill} \cdot F_{max}$$

### Intermediate Formulas

Let $V_{current}$ be the current volume of steam in the turbine tank (mB). Then:

- Fill ratio: $R_{fill} = \dfrac{V_{current}}{V_{tank}}$

- Flow ratio: $R_{flow} = \dfrac{V_{current}}{F_{max}}$

- Maximum steam flow (mB/t): $F_{max} = \min(F_{disperser}, F_{vent})$

where

$$F_{disperser} = N_{disperser} \cdot V_{interior} \cdot \delta$$

$$F_{vent} = N_{vent} \cdot \rho_{vent}$$

$$V_{interior} = L^2 \cdot h_{rotor}$$

## Power Generation

### Power Generation Rate

The Power Generation Rate $P$ in J is given by:

$$P = \varepsilon_{steam} \cdot F_{blade} \cdot F_{max}$$

Where:

$$F_{blade} = \min(R_{blade}, R_{coil})$$

$$R_{blade} = \frac{N_{blade}}{\mu}$$

$$R_{coil} = \frac{N_{coil} \cdot \tau}{\mu}$$

### Storage Capacities

The maximum amount of Power Storage $S_{E}$ in J is given by:

$$S_{E} = L^2 \cdot H \cdot \varepsilon_{block}$$

where:

$H$ is the total height of the Turbine structure in blocks

---

The maximum amount of Steam Storage $S_{S}$ in mB is given by:

$$S_{S} = L^2 \cdot h_{rotor} \cdot \Sigma_{block}$$

## Water Reclamation

The use of `Saturating Condenser` blocks enable reclamation of water back into the Fission Reactor/Thermoelectric Boiler.

Each `Saturating Condenser` returns up to $\rho_{cond}$ mB/t of water. The aggregate reclaim rate is therefore

$$R_{water} = \min(F_{max},\ N_{cond} \cdot \rho_{cond}).$$

To reclaim all steam delivered through the turbine, size $N_{cond}$ so that $N_{cond} \cdot \rho_{cond} \ge F_{max}$. Any surplus capacity simply idles until the steam throughput increases.

## Water/Steam Transportation

Transporting Water/Steam is the largest logistical problem, especially when aesthetics and lag are considerations. For purposes of the following calculations, Mekanism Ultimate Pipes are used, and their defaults are listed below:

- Ultimate Mechanical Pipe: $64{,}000$ mB/t of water
- Ultimate Pressurized Pipe: $1{,}024{,}000$ mB/t of steam

This means that for the number of pipes necessary:

$$N_{mech} = \frac{R_{water}}{64{,}000}$$

$$N_{press} = \frac{F_{max}}{1{,}024{,}000}$$

## Derived Optimum for the 17×17×18 Turbine

For the largest allowed footprint ($L = 17$, $H = 18$) the interior height available between the floor and roof is $H - 2 = 16$ blocks. These interior layers must be split between the spinning hardware and the steam cavity:

- $r$ — turbine rotor height (number of stacked `Turbine Rotor` blocks).
- $s$ — steam cavity height above the pressure dispersers.

Since the pressure disperser layer lies directly on top of the rotors, the simple budget is

$$r + s = 16.$$

### Throughput ceiling

Each steam layer exposes $4(L - 2) = 60$ side positions for vents, and the roof provides $(L - 2)^2 = 225$ more. With $s = 16 - r$ the total vent count and the resulting steam throughput cap are

$$N_{vent}(r) = 225 + 60(16 - r),$$
$$F_{max}(r) = 32{,}000 \cdot N_{vent}(r) = 32{,}000 \cdot \big(1185 - 60r\big).$$

The disperser limit

$$F_{disperser}(r) = N_{disperser} \cdot (L^2 r) \cdot \delta$$

remains higher than $F_{max}(r)$ for all feasible $r$, so vents always dictate the flow ceiling.

### Rotor and coil efficiency

Each turbine rotor block may host two blades, so the blade ratio is

$$R_{blade}(r) = \frac{\min(2r, 28)}{28} = \min\left(\frac{r}{14}, 1\right).$$

A single electromagnetic coil handles four blades, hence with $N_{coil}$ coil blocks

$$R_{coil}(N_{coil}) = \frac{N_{coil} \cdot 4}{28} = \frac{N_{coil}}{7}.$$

Given freedom to place coil blocks within the steam cavity, we pick

$$N_{coil} = \left\lceil \frac{2r}{4} \right\rceil = \left\lceil \frac{r}{2} \right\rceil$$

so that $R_{coil} \ge R_{blade}$ and the aerodynamic efficiency simplifies to

$$F_{blade}(r) = \frac{r}{14}.$$

### Maximising power

Combining the expressions gives

$$P(r) = \varepsilon_{steam} \cdot F_{blade}(r) \cdot F_{max}(r) = 10 \cdot \frac{r}{14} \cdot 32{,}000 \cdot \big(1185 - 60r\big).$$

The quadratic term $r(1185 - 60r)$ peaks at $r \approx 9.9$, so the best integer choice is

$$r = 10, \qquad s = 6,$$

which in turn requires

$$N_{coil} = \left\lceil \frac{10}{2} \right\rceil = 5.$$

### Resulting component counts

| Item                  | Value | Notes                                             |
| --------------------- | ----- | ------------------------------------------------- |
| Turbine rotors        | 10    | Supports $2r = 20$ `Turbine Blade` blocks         |
| Turbine blades        | 20    | Keeps $R_{blade} = 20/28$                         |
| Electromagnetic coils | 5     | Ensures $R_{coil} = 5/7$                          |
| Pressure dispersers   | 224   | Full 15×15 layer minus the rotor column           |
| Steam layers          | 6     | Yields $N_{vent} = 585$                           |
| Turbine vents         | 585   | Vent-limited flow $F_{max} = 18{,}720{,}000$ mB/t |
| Rotational complex    | 1     | Placed above the rotor stack                      |
| Saturating condensers | 293   | $\lceil F_{max} / \rho_{cond} \rceil$             |

### Performance summary

- Steam throughput ceiling: $F_{max} = 18{,}720{,}000$ mB/t.
- Turbine efficiency: $F_{blade} = 20/28 = 5/7$.
- Power output: $P = 10 \times \frac{5}{7} \times 18{,}720{,}000 = 133{,}714{,}286$ J/t ($\approx 133.71$ MJ/t).
- Water return ceiling (with 293 condensers): $R_{water} = 18{,}752{,}000$ mB/t.
- Steam storage: $S_{S} = L^2 \cdot r \cdot \Sigma_{block} = 184{,}960{,}000$ mB.
- Energy storage: $S_{E} = L^2 \cdot H \cdot \varepsilon_{block} = 83{,}232{,}000$ J.

To move the fluids at this pace you need $N_{mech} = 293$ Ultimate Mechanical Pipes for water and $N_{press} = 19$ Ultimate Pressurized Pipes for steam.
