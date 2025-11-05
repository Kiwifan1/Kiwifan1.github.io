# Industrial Turbine Information

## Config Values

Values in $\text{\red{red}}$ are nominally gathered from the `generators.toml` file within the Mekanism Modpack.  Defaults are defined as follows:

* $\red{\tau = 4}$; the number of `Turbine Blade` that can be handled by a single `Electromagnetic Coil`.
* $\red{\mu = 28}$; the maximum number of `Turbine Blade` that can be in a turbine.
* $\red{\Rho_{vent} = 32{,}000}$; the rate at which steam is vented into the turbine.
* $\red{\delta = 1{,}280}$; the rate at which steam is dispersed into the turbine.
* $\red{\Epsilon_{block} = 16{,}000}$; the amount of energy (J) stored in each block of the turbine.
* $\red{\Sigma_{block} = 64{,}000}$; the amount of steam (mB) stored in each block.
* $\red{\Epsilon_{steam} = 10}$; the max energy (J) for each mB of steam.
* $\red{\Rho_{cond} = 64{,}000}$; the rate at which steam can be condensed in the turbine.

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 5x5x5 | 17x17x18 |

* Orientation can only be vertical
* Length and width must be equal (i.e., square base)
* Maximum Shaft Height = $\min(2 \cdot L - 5, 14)$
* Maximum Total Height = $\min(2 \cdot L - 1, 18)$
* Edges must be `Turbine Casing`
* Faces can be `Turbine Casing`, `Turbine Valve`, or `Structural Glass`
  * At the `Pressure Disperser` layer and above, `Turbine Vent` blocks can also be used
* Interior can only be `Pressure Disperser`, `Electromagnetic Coil`, `Rotor Shaft`, `Turbine Blade`, `Rotational Complex`, `Saturating Condenser`, or air.

## Tank Volume

The tank volume $V_{tank}$ in mB is given by:

$$V_{tank} = L^2 \cdot h_{rotor}$$

Where $h_{rotor}$ is the height of the `Rotor Shaft` blocks.

## Flow Rate

The Flow Rate $F$ is an efficiency ratio that $0 < F \leq 1$, defined as:

$$F = \min(1, R_{flow}) \cdot R_{fill} \cdot F_{max}$$

### Intermediate Formulas

The Current Fill Ratio of the Turbine's tank $R_{fill}$ is given by:

$$R_{fill} = \frac{V_{current}}{V_{tank}}$$

Where:

$V_{current}$ is the current volume of steam in the Turbine's tank in mB

---

The Current Steam Flow Ratio $R_{flow}$ is given by:

$$R_{flow} = \frac{V_{current}}{F_{max}}$$

Where:

$V_{current}$ is the current volume of steam in the Turbine's tank in mB

---

The Max Steam Flow Rate $F_{max}$ in mB/t is given by:

$$F_{max} = \min(F_{disperser}, F_{vent})$$

Where:

$$F_{disperser} = N_{disperser} \cdot V_{interior} \cdot \red{\delta} $$

$$F_{vent} = N_{vent} \cdot \red{\Rho_{vent}}$$

$$V_{interior} = (L - 2)^2 \cdot h_{rotor}$$

## Power Generation

### Power Generation Rate

The Power Generation Rate $P$ in J is given by:

$$P = \red{\Epsilon_{steam}} \cdot F_{blade} \cdot F_{max}$$

Where:

$$F_{blade} = \min(R_{blade}, R_{coil})$$

$$R_{blade} = \frac{N_{blade}}{\red{\mu}}$$

$$R_{coil} = \frac{N_{coil} \cdot \red{\tau}}{\red{\mu}}$$

### Storage Capacities

The maximum amount of Power Storage $S_{E}$ in J is given by:

$$S_{E} = L^2 \cdot H \cdot \red{\Epsilon_{block}}$$

where:

$H$ is the total height of the Turbine structure in blocks

---

The maximum amount of Steam Storage $S_{S}$ in mB is given by:

$$S_{S} = L^2 \cdot h_{rotor} \cdot \red{\Sigma_{block}}$$

## Water Reclamation

The use of `Saturating Condenser` blocks enable reclamation of water back into the Fission Reactor/Thermoelectric Boiler.

The maximum amount of water output $R_{water}$ is given by:

$$R_{water} = N_{cond} \cdot \red{\Rho_{cond}}$$

---

To find the necessary amount of `Saturating Condenser` blocks to fully reclaim all steam, the following formula can be used:

$$N_{cond} = \frac{F_{max}}{\red{\Rho_{cond}}}$$

This means that:

$$N_{cond} \propto N_{vent}$$

$$N_{cond} \propto N_{disperser}$$

## Water/Steam Transportation

Transporting Water/Steam is the largest logistical problem, especially when aesthetics and lag are considerations. For purposes of the following calculations, Mekanism Ultimate Pipes are used, and their defaults are listed below:

* Ultimate Mechanical Pipe: $64{,}000$ mb/t of water
* Ultimate Pressurized Pipe: $1{,}024{,}000$ mb/t of steam

This means that for the number of pipes necessary:

$$N_{mech} = $$