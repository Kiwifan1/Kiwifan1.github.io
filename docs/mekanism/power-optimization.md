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

The following are default values for the constants (may vary by modpack):

- $\gamma = 32{,}000$ mB/t
- $\delta = 1{,}280$ mB/t
- $\phi = 28$ blades
- $\varepsilon = 10$ J/mB
- $\beta = 4$ blades/coil

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
where $N_{vent}$ is the number of steam vents in the turbine, calculated as the sum of the vents on the ceiling and the vents on each steam layer (plus one since vents may be placed on the disperser layer):

$$N_{vent} = N_{ceiling} + N_{layers} \cdot (s + 1)$$

we know that $s = h - r - 1$, so we can rewrite this as:

$$N_{vent} = N_{ceiling} + N_{layers} \cdot (h - r)$$

where:

- $N_{ceiling} = (L - 2)^2$ is the number of vents on the ceiling layer
- $N_{layers} = 4 \cdot (L - 2)$ is the number of vents on each steam layer (the perimeter of the interior cross-section)

so the final formula for $F_{vent}$ becomes:

$$F_{vent} = \gamma \cdot \left((L - 2)^2 + 4 \cdot (L - 2) \cdot (h - r)\right)$$

### Calculating $F_{disperser}$

The maximum steam flow through the disperser is given by the volume of steam handled by each disperser block multiplied by the number of disperser blocks:

$$F_{disperser} = \delta \cdot V_{interior} \cdot N_{disperser}$$

where:

- $V_{interior} = (L - 2)^2 * r$ is the interior volume of the turbine occupied by the `Turbine Rotors`
- $N_{disperser} = (L - 2)^2 - 1$ is the number of `Disperser` blocks in the disperser layer.

So the final formula for $F_{disperser}$ becomes:

$$F_{disperser} = \delta \cdot r \cdot (L - 2)^2 \cdot \left((L - 2)^2 - 1\right)$$

### Calculating Optimal $r$

#### Finding Limiting Factor

If we remember that

- $r_{\max} = \min(2 \cdot L - 5, 14)$

To find the optimal number of `Turbine Rotors` ($r$) that maximizes the power output, we need to find the $\max\limits_{r \in \Z, 1 \leq r \leq r_{\max}}\min(F_{vent}, F_{disperser})$

If we let $A = (L - 2)^2$, $B = (L - 2)$, we can rewrite $F_{vent}$ and $F_{disperser}$ as:

$$F_{vent} = \gamma \cdot (A + 4B(h - r))$$
$$F_{disperser} = \delta \cdot A (A - 1) \cdot r$$

which if expanded gives us:

$$F_{vent} = \gamma \cdot (A + 4Bh - 4Br)$$

$$F_{disperser} = \delta \cdot (A^2 - A) \cdot r$$

To find the optimal $r$, we can obtain the $F_{blade}$ from $P$ in order to obtain the part of the $P$ formula that only depends on $r$:

$$F_{blade} = \dfrac{2r}{\phi}$$

If we can prove that $G(r) = \left(F_{disperser} - F_{vent}\right) \cdot \dfrac{2r}{\phi}$ is monotonically increasing for $1 \leq r \leq r_{\max}$, then we can conclude that the limiting factor for $P$ is $F_{vent}$ (and if decreasing, vice-versa).

We prove this by showing that the sign of the derivative of $G(r)$ is positive for $1 \leq r \leq r_{\max}$.

- We know that $5 \leq L \leq 17$, so $3^2 \leq A \leq 15^2$ and $3 \leq B \leq 15$
- We know that $5 \leq H \leq 18$, so $3 \leq h \leq 16$

$$G(r) = \dfrac{2r}{\phi} \cdot \left(\delta \cdot \left(A^2 - A\right) \cdot r - \gamma \cdot \left(A + 4Bh - 4Br\right)\right)$$

Calculating the derivative of $G(r)$ with respect to $r$:

$$G'(r) = \dfrac{2}{\phi} \cdot \left(2\delta \cdot (A^2 - A) \cdot r - \gamma \cdot (A + 4Bh - 8Br)\right)$$

To prove that $G'(r) > 0$ for $1 \leq r \leq r_{\max}$, we can analyze the terms, and ignore $\dfrac{2}{\phi}$ because it is a consant applying to both terms equally.

Replacing $A$ and $B$ with their original definitions:

- $A = (L - 2)^2$
- $B = (L - 2)$
- $h = H - 2$

The terms in $G'(r)$ become:

- $2\delta \cdot ((L - 2)^4 - (L - 2)^2) \cdot r$
- $-\gamma \cdot ((L - 2)^2 + 4(L - 2) \cdot (H - 2) - 8(L - 2)r)$

The first term is always positive for $L \geq 5$ and $r \geq 1$.
The second term is negative for all feasible $r$ since:

$$((L - 2)^2 + 4(L - 2) \cdot (H - 2) - 8(L - 2)r) > 0$$

for $1 \leq r \leq r_{\max}$.

To minimize the first term and maximize the second term, we can substitute the minimum and maximum values for $L$, $H$, and $r$:

- Minimum $L = 5$
- Maximum $H = H_{\max} = 9$
- Maximum $r = r_{\max} = 5$

We will also plug in the default values for $\gamma$ and $\delta$:

- $\gamma = 32{,}000$ mB/t
- $\delta = 1{,}280$ mB/t

Calculating the terms:

- First term: $2 \cdot 1{,}280 \cdot (3^4 - 3^2) \cdot 5 = 921{,}600$
- Second term: $-32{,}000 \cdot (3^2 + 4 \cdot 3 \cdot 7 - 8 \cdot 3 \cdot 5) = -32{,}000 \cdot (9 + 84 - 120) = 864{,}000$

Since $921{,}600 - 864{,}000 > 0$, we can conclude that $G'(r) > 0$ for all feasible $r$.

Consequently, $G(r)$ is monotonically increasing for $1 \leq r \leq r_{\max}$, meaning that $F_{vent}$ is the limiting factor for $P$.

#### Finding $r$

Now that we know that $F_{vent}$ is the limiting factor, we can find the optimal $r$ that maximizes $P$ by maximizing $F_{vent} \cdot F_{blade}$.

>Note: We include $F_{blade}$ here because it is also dependent on $r$ and we can bring it back into the equation, we only took it out for simplicity of finding the limiting factor.

This means that $P \propto F_{vent} \cdot F_{blade}$, so we can define:

$$Q(r) = F_{vent} \cdot F_{blade} = \gamma \cdot (A + 4B(h - r)) \cdot \dfrac{2r}{\phi}$$

$$\downarrow$$

$$Q(r) = \dfrac{2\gamma}{\phi} \cdot \left(Ar + 4Bh r - 4B r^2\right)$$

The quadratic term $(-4B r^2 + 4Bh r + Ar)$ peaks at $r = \dfrac{-b}{2a}$

>Note: Don't fall into the trap of assuming that $Ar$ is the constant, the $b$ term is $4Bhr + Ar$.

$$r = \left\lceil\dfrac{-\left(4Bh + A\right)}{-8B}\right\rceil = \left\lceil\dfrac{4Bh + A}{8B}\right\rceil$$

### Pulling it All Together

Let us remember the key formulas:

- $F_{blade} = \dfrac{2r}{\phi}$
- $F_{steam} = \min(F_{vent}, F_{disperser}) = F_{vent} = \gamma \cdot (A + 4B(h - r))$
- $r = \left\lceil\dfrac{4B h + A}{8B}\right\rceil$
- $P = \varepsilon \cdot F_{blade} \cdot F_{steam}$

where:

- $A = (L - 2)^2$
- $B = (L - 2)$
- $h = H - 2$

Finally, we can calculate the optimal power output $P$ as:

$$P = \varepsilon \cdot F_{blade} \cdot F_{vent}$$

$$\downarrow$$

$$P = \varepsilon \cdot \left(\dfrac{2r}{\phi}\right) \cdot \left(\gamma \cdot (A + 4B(h - r))\right)$$

We can rewrite the final formula as:

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(32{,}000 \cdot ((L - 2)^2 + 4(L - 2)(H - 2 - r))\right)$$

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

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(32{,}000 \cdot (225 + 4 \cdot 15 \cdot (16 - r))\right)$$

$$\downarrow$$

$$P = 10 \cdot \left(\dfrac{2r}{28}\right) \cdot \left(32{,}000 \cdot (225 + 960 - 60r)\right)$$

$$\downarrow$$

$$P = 10 \cdot \dfrac{2r}{28} \cdot \left(37{,}920{,}000 - 1{,}920{,}000r\right)$$

### Finding Optimal $r$

The formula for finding $r$ is:

$$r = \left\lceil\dfrac{4B h + A}{8B}\right\rceil = \left\lceil\dfrac{4 \cdot 15 \cdot 16 + 225}{8 \cdot 15}\right\rceil$$

$$\downarrow$$

$$r = \left\lceil9.875\right\rceil = 10$$

### Final Power Calculation

Plugging $r = 10$ back into the power formula:

$$P = 10 \cdot \dfrac{1}{14} \cdot 10 \left(37{,}920{,}000 - 1{,}920{,}000 \cdot 10\right)$$

$$\downarrow$$

$$P \approx 133{,}714{,}286 \text{ J/t}$$

### Finding Water Flow

