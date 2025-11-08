# Power Optimization

## Prerequisite Knowledge

* Let $L$ be the length of one side of the square base of the `Industrial Turbine` (in blocks)
* Let $H$ be the total height of the `Industrial Turbine` (in blocks)

* The `Industrial Turbine` has hard limits on its structure:
  * The Base must be a square
  * $5 \leq L \leq 17$
  * $5 \leq H \leq 18$
* Each `Turbine Rotor` can support up to 2 `Turbine Blade`.
* The Maximum number of `Turbine Rotor` blocked is limited by the formula:
  * $r_{\max} = \min(2 \cdot L - 5, 14)$
* The `Disperser` layer is always 1 block thick and is located directly above the topmost `Turbine Rotor`.
  * The formula for the number of `Disperser` blocks is:
    * $N_{disperser} = (L - 2)^2 - 1$

## Variable Definitions

* Let $h = H - 2$ be the height of the interior of the `Industrial Turbine` (in blocks)
* Let $r$ be the number of `Turbine Rotors`
* Let $s$ be the amount of space above the disperser layer (in blocks)
* Let $\gamma$ be the `TURBINE.VENT_CHEMICAL_FLOW` constant
* Let $\delta$ be the `TURBINE.STEAM_DISPERSER_FLOW` constant
* Let $\phi$ be the `MAX_BLADES` constant (number of blades allowed in the turbine)
* Let $\beta$ be the `TURBINE.BLADES_PER_COIL` constant
* Let $\varepsilon$ be the `ENERGY_PER_STEAM` constant

## Calculating Optimal Energy Output

### Plan of Attack

To calculate the optimal energy output of an `Industrial Turbine`, we need to determine the maximum steam flow rate through the turbine and the blade efficiency factor.  

In order to do this, we need to establish the relationship between the height of the `Turbine Rotors` ($r$), the space above the disperser layer ($s$), and the total interior height of the turbine ($h$).

$$r + s + 1 = h$$

This equation means that the height of the `Turbine Rotors` ($r$), the space above the disperser layer ($s$), and the disperser layer itself (1 block) must sum to the total interior height of the turbine ($h$).

### Optimal Energy Formula

The optimal energy production of a turbine is given by the formula:

$$P = \varepsilon \cdot F_{blade} \cdot F_{steam}$$

where:

* $F_{blade} = \min\left(\dfrac{b}{\phi},\ \dfrac{\beta \cdot N_{coil}}{\phi}\right)$ is the blade efficiency factor, with $N_{coil}$ being the number of `Electromagnetic Coils`

* $F_{steam} = \min\left(F_{vent},\ F_{disperser}\right)$ is the maximum steam flow rate through the turbine

### Calculating $N_{coil}$

We know that each `Turbine Rotor` can support up to 2 `Turbine Blade`, so the total number of `Turbine Blades` ($b$) is given by:

$$b = 2 \cdot r$$

We also know that each `Electromagnetic Coil` can support up to $\beta$ `Turbine Blades`, so the number of `Electromagnetic Coils` ($N_{coil}$) is given by:

$$N_{coil} = \left\lceil\dfrac{b}{\beta}\right\rceil = \left\lceil\dfrac{2r}{\beta}\right\rceil$$

So for $F_{blade}$, we have:

$$F_{blade} = \min\left(\dfrac{2r}{\phi},\ \dfrac{\beta \cdot \left\lceil\dfrac{2r}{\beta}\right\rceil}{\phi}\right) = \dfrac{2r}{\phi}$$

### Calculating $F_{vent}$

The maximum steam flow through the vents is given by:

$$F_{vent} = \gamma \cdot N_{vent}$$

where $N_{vent}$ is the number of steam vents in the turbine, calculated as the sum of the vents on the ceiling and the vents on each steam layer:

$$N_{vent} = N_{ceiling} + N_{layers} \cdot s$$

we know that $s = h - r - 1$, so we can rewrite this as:

$$N_{vent} = N_{ceiling} + N_{layers} \cdot (h - r - 1)$$

where:

* $N_{ceiling} = (L - 2)^2$ is the number of vents on the ceiling layer
* $N_{layers} = 4 \cdot (L - 2)$ is the number of vents on each steam layer (the perimeter of the interior cross-section)

so the final formula for $F_{vent}$ becomes:

$$F_{vent} = \gamma \cdot \left((L - 2)^2 + 4 \cdot (L - 2) \cdot (h - r - 1)\right)$$

### Calculating $F_{disperser}$

The maximum steam flow through the disperser is given by the volume of steam handled by each disperser block multiplied by the number of disperser blocks:

$$F_{disperser} = \delta \cdot V_{interior} \cdot N_{disperser}$$

where:

* $V_{interior} = (L - 2)^2 * r$ is the interior volume of the turbine occupied by the `Turbine Rotors`
* $N_{disperser} = (L - 2)^2 - 1$ is the number of `Disperser` blocks in the disperser layer.

So the final formula for $F_{disperser}$ becomes:

$$F_{disperser} = \delta \cdot (L - 2)^2 \cdot \left((L - 2)^2 - 1\right) \cdot r$$

### Optimizing $r$ for Maximum Power

To find the optimal number of `Turbine Rotors` ($r$) that maximizes power output, we need to find maximize the minimum of $F_{vent}$ and $F_{disperser}$ with respect to $r$. This can be done by following the formula:

$$\max_{r}\left(\min\left(F_{vent},\ F_{disperser}\right)\right)$$

To simplify the process, we will set $A = (L - 2)^2$ and $B = (L - 2)$ (so $A = B^2$), and rewrite the formulas for $F_{vent}$ and $F_{disperser}$ as:

$$F_{vent} = \gamma \cdot \left(A + 4B(h - r - 1)\right) \rightarrow \gamma \cdot \left(A + 4Bh - 4B - 4Br\right)$$

$$F_{disperser} = \delta \cdot A \cdot (A - 1) \cdot r$$

Setting $F_{vent} = F_{disperser}$ to find the intersection point:

$$\gamma \cdot \left(A + 4Bh - 4B - 4Br\right) = \delta \cdot A \cdot (A - 1) \cdot r$$

Solving for $r$ gives:

$$r = \left\lceil\frac{\gamma \cdot (A + 4Bh - 4B)}{\delta \cdot A \cdot (A - 1) + 4B\gamma}\right\rceil$$

We take the ceiling  because $r$ must be an integer value representing the number of `Turbine Rotors`.

We can then plug this value of $r$ back into either of the functions for $F_{vent}$ or $F_{disperser}$ to find the optimal steam flow rate, and then use that to calculate the optimal power output $P$ using the original power formula.  For showcaseing purposes, we will use $F_{disperser}$

$$F_{steam} = F_{disperser} = \delta \cdot A \cdot (A - 1) \cdot \left(\frac{\gamma \cdot (A + 4Bh - 4B)}{\delta \cdot A \cdot (A - 1) + 4B\gamma}\right)$$

Finally, we can calculate the optimal power output $P$ as:

$$P = \varepsilon \cdot \left(\dfrac{2r}{\phi}\right) \cdot \left(\delta \cdot A \cdot (A - 1) \cdot \left(\frac{\gamma \cdot (A + 4Bh - 4B)}{\delta \cdot A \cdot (A - 1) + 4B\gamma}\right)\right)$$

Plugging in some default values for the constants:

* $\gamma = 43{,}478.262$ mB/t
* $\delta = 1{,}280$ mB/t
* $\phi = 28$ blades
* $\varepsilon = 10$ J/mB
* $\beta = 4$ blades/coil

and remembering that $A = (L - 2)^2$ and $B = (L - 2)$, we can rewrite the power output formula as:

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(1{,}280 \cdot (L - 2)^2 \cdot ((L - 2)^2 - 1) \cdot \left(\frac{43{,}478.262 \cdot ((L - 2)^2 + 4(L - 2)h - 4(L - 2))}{1{,}280 \cdot (L - 2)^2 \cdot ((L - 2)^2 - 1) + 4(L - 2) \cdot 43{,}478.262}\right)\right)$$
