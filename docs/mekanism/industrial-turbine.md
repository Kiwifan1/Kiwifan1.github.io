# Industrial Turbine Information

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

$$V_{tank} = L^2 \cdot H_{rotor}$$

Where $H_{rotor}$ is the height of the `Rotor Shaft` blocks.

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

$$F_{disperser} = N_{disperser} \cdot V_{interior} \cdot 1{,}280 $$

$$F_{vent} = N_{vent} \cdot 32{,}000$$

$$V_{interior} = (L - 2)^2 \cdot H_{rotor}$$

## Power Generation

### Power Generation Rate

The Power Generation Rate $P$ in J is given by:



### Storage Capacities

The maximum amount of Power Storage $S_{E}$ in J is given by:

$$S_{E} = L^2 \cdot H \cdot 16{,}000$$

---

The maximum amount of Steam Storage $S_{S}$ in mB is given by:

$$S_{S} = L^2 \cdot H_{rotor} \cdot 64{,}000$$

Where:

$H$ is the total height of the Turbine structure in blocks
