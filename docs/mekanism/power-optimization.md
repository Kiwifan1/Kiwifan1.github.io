# Power Optimization

## Prerequisite Knowledge

- Let $L$ be the length of one side of the square base of the `Industrial Turbine` (in blocks)
- Let $H$ be the total height of the `Industrial Turbine` (in blocks)

- The `Industrial Turbine` has hard limits on its structure:
  - The Base must be a square
  - $H_{\max} = \min(2 \cdot L - 1, 18)$
  - $5 \leq L \leq 17$
  - $5 \leq H \leq H_{\max}$
- Each `Turbine Rotor` can support up to 2 `Turbine Blade`.
- The Maximum number of `Turbine Rotor` blocked is limited by the formula:
  - $r_{\max} = \min(2 \cdot L - 5, 14)$
- The `Disperser` layer is always 1 block thick and is located directly above the topmost `Turbine Rotor`.
  - The formula for the number of `Disperser` blocks is:
    - $N_{disperser} = (L - 2)^2 - 1$

## Variable Definitions

- Let $h = H - 2$ be the height of the interior of the `Industrial Turbine` (in blocks)
- Let $r$ be the number of `Turbine Rotors`
- Let $s$ be the amount of space above the disperser layer (in blocks)
- Let $\gamma$ be the `TURBINE.VENT_CHEMICAL_FLOW` constant
- Let $\delta$ be the `TURBINE.STEAM_DISPERSER_FLOW` constant
- Let $\phi$ be the `MAX_BLADES` constant (number of blades allowed in the turbine)
- Let $\beta$ be the `TURBINE.BLADES_PER_COIL` constant
- Let $\varepsilon$ be the `ENERGY_PER_STEAM` constant
- Let $\rho$ be the `TURBINE.CONDENSER_RATE` constant
- Let $S_{transporter}$ be the steam transportation rate
- Let $W_{transporter}$ be the water transportation rate

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

- $F_{blade} = \min\left(\dfrac{b}{\phi},\ \dfrac{\beta \cdot N_{coil}}{\phi}\right)$ is the blade efficiency factor, with $N_{coil}$ being the number of `Electromagnetic Coils`

- $F_{steam} = \min\left(F_{vent},\ F_{disperser}\right)$ is the maximum steam flow rate through the turbine

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

- $N_{ceiling} = (L - 2)^2$ is the number of vents on the ceiling layer
- $N_{layers} = 4 \cdot (L - 2)$ is the number of vents on each steam layer (the perimeter of the interior cross-section)

so the final formula for $F_{vent}$ becomes:

$$F_{vent} = \gamma \cdot \left((L - 2)^2 + 4 \cdot (L - 2) \cdot (h - r - 1)\right)$$

### Calculating $F_{disperser}$

The maximum steam flow through the disperser is given by the volume of steam handled by each disperser block multiplied by the number of disperser blocks:

$$F_{disperser} = \delta \cdot V_{interior} \cdot N_{disperser}$$

where:

- $V_{interior} = (L - 2)^2 * r$ is the interior volume of the turbine occupied by the `Turbine Rotors`
- $N_{disperser} = (L - 2)^2 - 1$ is the number of `Disperser` blocks in the disperser layer.

So the final formula for $F_{disperser}$ becomes:

$$F_{disperser} = \delta \cdot r \cdot (L - 2)^2 \cdot \left((L - 2)^2 - 1\right)$$

### Calculating Optimal $r$

If we remember that

- $r_{\max} = \min(2 \cdot L - 5, 14)$

To find the optimal number of `Turbine Rotors` ($r$) that maximizes the power output, we need to find the $\max\limits_{r \in \Z, 1 \leq r \leq r_{\max}}\min(F_{vent}, F_{disperser})$

If we let $A = (L - 2)^2$, $B = (L - 2)$, we can rewrite $F_{vent}$ and $F_{disperser}$ as:

$$F_{vent} = \gamma \cdot (A + 4B(h - 1 - r))$$
$$F_{disperser} = \delta \cdot A (A - 1) \cdot r$$

which if expanded gives us:

$$F_{vent} = \gamma \cdot (A + 4Bh - 4B - 4Br)$$

$$F_{disperser} = \delta \cdot (A^2 - A) \cdot r$$

To find the optimal $r$, we can obtain the $F_{blade}$ from $P$ in order to obtain the part of the $P$ formula that only depends on $r$:

$$F_{blade} = \dfrac{2r}{\phi}$$

If I can prove that $G(r) = \left(F_{disperser} - F_{vent}\right) \cdot \dfrac{2r}{\phi}$ is monotonically increasing for $1 \leq r \leq r_{\max}$, then I can conclude that the limiting factor for $P$ is $F_{vent}$ (and if decreasing, vice-versa).

- We know that $5 \leq L \leq 17$, so $3^2 \leq A \leq 15^2$ and $3 \leq B \leq 15$
- We know that $5 \leq H \leq 18$, so $3 \leq h \leq 16$

$$G(r) = \left(\delta \cdot (A^2 - A) \cdot r - \gamma \cdot (A + 4Bh - 4B - 4Br)\right) \cdot \dfrac{2r}{\phi}$$

$$\downarrow$$

$$G(r) = \dfrac{2}{\phi} \cdot \left(\delta \cdot (A^2 - A) \cdot r^2 - \gamma \cdot (A + 4Bh - 4B) \cdot r + 4B\gamma \cdot r^2\right)$$

Calculating the derivative:

$$G'(r) = \dfrac{2}{\phi} \cdot \left(2\delta \cdot (A^2 - A) \cdot r - \gamma \cdot (A + 4Bh - 4B) + 8B\gamma \cdot r\right)$$

$$\downarrow$$

$$G'(r) = \dfrac{2}{\phi} \cdot \left(r \cdot (2\delta \cdot (A^2 - A) + 8B\gamma) - \gamma \cdot (A + 4Bh - 4B)\right)$$

Since $\dfrac{2}{\phi} > 0$ for all valid $L$, we only need to analyze the term in the parentheses.

$$H(r) = r \cdot (2\delta \cdot (A^2 - A) + 8B\gamma) - \gamma \cdot (A + 4Bh - 4B)$$

Assume to take reasonable default values for $\gamma = 43{,}478.262$ mB/t and $\delta = 1{,}280$ mB/t. (These are default values from ATM 10 TTS, they may vary, but not enough to change the conclusion.)

For some of the most extreme values of $L$ and $H$, $H(r)$ is negative, but the values chosen aren't reasonable (ie. $L = 5$, $H = 9$, $r = 1$). To keep within bounds, choose a Length to Height ratio of at most $1:1.5$ and $r > 2$ (which is already quite tall for a turbine), or make $L > 7$ and $r > 1$. This means that for $L = 5$, $H$ can be at most $7$; for $L = 17$, $H$ can be at most $18$.

$$H(3) = 3 \cdot (2 \cdot 1{,}280 \cdot (3^2 - 3) + 8 \cdot 3 \cdot 43{,}478.262) - 43{,}478.262 \cdot (3 + 4 \cdot 3 \cdot 7 - 4 \cdot 3) \approx 164{,}634.786 > 0$$

Given $L = 7$, $H = 10$ $r = 2$:

$$H(2) = 2 \cdot (2 \cdot 1{,}280 \cdot (5^2 - 5) + 8 \cdot 5 \cdot 43{,}478.262) - 43{,}478.262 \cdot (5 + 4 \cdot 5 \cdot 8 - 4 \cdot 5) \approx 56{,}634.786 > 0$$

Thus, for reasonable values of $L$, $H$, and $r$, $H(r) > 0$ and thus $G'(r) > 0$ meaning that $G(r)$ is monotonically increasing.

This means that for reasonable values of $L$, $H$, and $r$, the limiting factor for $P$ is $F_{vent}$.

$$F_{vent} = \gamma \cdot (A + 4B(h - 1 - r))$$

This means for optimal $P$:

$$P = \varepsilon \cdot \dfrac{2r}{\phi} \cdot \gamma \cdot (A + 4B(h - 1 - r))$$

The $r$ term from the equation can be isolated to:

$$r = h - 1 - \dfrac{\frac{F_{vent}}{\gamma} - A}{4B}$$

### Pulling it All Together

Let us remember the key formulas:

- $F_{blade} = \dfrac{2r}{\phi}$
- $F_{steam} = F_{vent} = \gamma \cdot (A + 4B(h - 1 - r))$
- $r = h - 1 - \dfrac{\frac{F_{vent}}{\gamma} - A}{4B}$
- $P = \varepsilon \cdot F_{blade} \cdot F_{steam}$

where:

- $A = (L - 2)^2$
- $B = (L - 2)$
- $h = H - 2$

Finally, we can calculate the optimal power output $P$ as:

$$P = \varepsilon \cdot F_{blade} \cdot F_{vent}$$

$$P = \varepsilon \cdot \left(\dfrac{2r}{\phi}\right) \cdot \left(\gamma \cdot (A + 4B(h - 1 - r))\right)$$

Plugging in some default values for the constants:

- $\gamma = 43{,}478.262$ mB/t
- $\delta = 1{,}280$ mB/t
- $\phi = 28$ blades
- $\varepsilon = 10$ J/mB
- $\beta = 4$ blades/coil

We can rewrite the final formula as:

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(43{,}478.262 \cdot ((L - 2)^2 + 4(L - 2)(H - 2 - 1 - r))\right)$$

This formula can be used to calculate the optimal power output of an `Industrial Turbine` given its dimensions $L$ and $H$.

### Calculating Maximum Water Flow

The maximum water flow rate ($F_{water}$) required to sustain the steam flow rate ($F_{steam}$) must be equal to the maximum steam flow rate if water reycling is requested.

$$F_{water} \ge F_{steam}$$

$$F_{water} = N_{condenser} \cdot \rho$$

So the minimum number of `Saturating Condensers` ($N_{condenser}$) required is given by:

$$N_{condenser} \ge \dfrac{F_{steam}}{\rho}$$

### Calculating Steam/Water Transportation

For transporting the massive amount of steam/water required, `Mechanical Pipes` and `Pressurized Pipes` are used.

The number of pipes required for steam transportation is given by:

$$N_{steam\_pipe} \ge \dfrac{F_{steam}}{S_{transporter}}$$

The number of pipes required for water transportation is given by:

$$N_{water\_pipe} \ge \dfrac{F_{water}}{W_{transporter}}$$

## Example Calculation

Consider a maximum sized `Industrial Turbine` with dimensions $L = 17$ and $H = 18$.

Some initial calculations:

- $h = H - 2 = 18 - 2 = 16$
- $s = (h - r - 1) = (16 - r - 1) = 15 - r$
- $A = (L - 2)^2 = (17 - 2)^2 = 15^2 = 225$
- $B = (L - 2) = (17 - 2) = 15$

Initial Formula:

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(43{,}478.262 \cdot (225 + 4 \cdot 15 \cdot (15 - r))\right)$$

$$\downarrow$$

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(43{,}478.262 \cdot (225 + 900 - 60r)\right)$$

$$\downarrow$$

$$P = 10 \cdot \dfrac{2r}{28} \cdot \left(48{,}913{,}044.8 - 2608695.72r\right)$$

The optimal $r$ can be found from taking the quadratic formula of the inner term:

$$P = 10 \cdot \dfrac{1}{14} \cdot r \left(48{,}913{,}044.8 - 2608695.72r\right)$$

### Finding Optimal $r$

The quadratic term $r(48{,}913{,}044.8 - 2608695.72r)$ peaks at

$$r = \dfrac{-b}{2a} = \dfrac{-48{,}913{,}044.8}{-2 \cdot 2608695.72} \approx 9.37$$

And we round to the nearest integer, giving us $r = 9$.

### Final Power Calculation

Plugging $r = 9$ back into the power formula:

$$P = 10 \cdot \dfrac{1}{14} \cdot 9 \left(48{,}913{,}044.8 - 2608695.72 \cdot 9\right)$$

$$\downarrow$$

$$P \approx 163{,}125{,}000 \text{ J/t}$$

### Finding Max Steam & Water Flow

We have already found the maximum steam flow rate:

$$F_{steam} = F_{vent} = 43{,}478.262 \cdot (225 + 4 \cdot 15 \cdot (15 - 9))$$

$$\downarrow$$

$$F_{steam} = 43{,}478.262 \cdot (225 + 360) = 43{,}478.262 \cdot 585 \approx 25{,}434{,}000 \text{ mB/t}$$

So the minimum number of `Saturating Condensers` required to sustain this steam flow rate is:

$$N_{condenser} \ge \dfrac{25{,}434{,}000}{128{,}000} \approx 198.5$$

#### Water/Steam Transportation

The number of pipes required for steam transportation is given by:

$$N_{steam\_pipe} \ge \dfrac{25{,}434{,}000}{256{,}000} \approx 99.3$$

The number of pipes required for water transportation is given by:

$$N_{water\_pipe} \ge \dfrac{25{,}434{,}000}{64{,}000} \approx 397.3$$
