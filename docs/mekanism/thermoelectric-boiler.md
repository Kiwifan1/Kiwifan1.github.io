# Thermoelectric Boiler Optimization

## Prerequisite Knowledge

- Let $W$ and $L$ be the outer width and length of the boiler footprint (in blocks).
- Let $H$ be the total exterior height of the structure (in blocks).
- Valid Mekanism boilers satisfy $3 \le W, L \le 18$ and $4 \le H \le 18$ with a rectangular prism shell.
- The casing shell consumes one block on every edge. The interior stack therefore has height $h = H - 2$ and footprint area $A = W \cdot L$.
- From top to bottom the interior contains a steam cavity, a one-block `Pressure Disperser` layer, and a water cavity populated by `Superheating Elements`.
- The water cavity and steam cavity must both be at least one block tall.

## Variable Definitions

- Let $w$ be the height (in blocks) of the water cavity _excluding_ the disperser layer.
- Let $s$ be the height of the steam cavity.
- Let $N$ be the number of `Superheating Elements`.
- Because the disperser layer is fixed at one block, $w + s + 1 = h$ and therefore $s = h - 1 - w$.
- Every superheating element occupies one block of the water cavity, so $0 \le N \le wA$.

## Constants (Default Mekanism 1.20)

These symbols reference `src/app/models/constants.ts`:

$$\alpha = \texttt{BOILER.WATER\_PER\_TANK} = 32{,}000$$
$$\beta = \texttt{BOILER.STEAM\_PER\_TANK} = 320{,}000$$
$$\gamma = \texttt{BOILER.HEATED\_COOLANT\_PER\_TANK} = 512{,}000$$
$$\delta = \texttt{BOILER.COOLED\_COOLANT\_PER\_TANK} = 512{,}000$$

Superheating throughput is derived from the thermal constants:

$$\zeta = \texttt{SUPERHEATING\_HEAT\_TRANSFER} = 16{,}000{,}000$$
$$\varepsilon = \texttt{HEATING.WATER} = 20{,}000$$
$$\eta = \text{steam efficiency} = 0.4$$

A single superheater converts

$$\phi = \frac{\zeta}{\varepsilon} \times \eta \times 1{,}000 = 320{,}000$$

millibuckets of water into steam per tick.

## Tank Volumes and Capacities

Because the disperser layer feeds both buffers, Mekanism includes it when sizing the tanks. The effective volumes are

$$V_{\text{water}} = (w + 1)A - N,$$
$$V_{\text{steam}} = (s + 1)A.$$

Multiplying by the per-block constants yields the capacities

$$C_{\text{water}} = \alpha V_{\text{water}}, \qquad C_{\text{cold}} = \delta V_{\text{water}},$$
$$C_{\text{steam}} = \beta V_{\text{steam}}, \qquad C_{\text{hot}} = \gamma V_{\text{steam}}.$$

The boil throughput contributed by $N$ superheaters is

$$C_{\text{boil}} = \phi N.$$

## Production Limit

The instantaneous steam output is constrained by all three buffers:

$$F(N, w) = \min\left(C_{\text{water}},\ C_{\text{steam}},\ C_{\text{boil}}\right).$$

Our goal is to choose $w$ and $N$ that maximise $F$ while respecting the structural bounds.

## Balanced Superheater Count

Water draw decreases as $N$ grows, while boil throughput increases. Setting the two terms equal provides the balanced superheater count

$$\alpha \big((w + 1)A - N_{\text{eq}}\big) = \phi N_{\text{eq}}$$

$$\Rightarrow N_{\text{eq}} = \frac{\alpha}{\alpha + \phi}(w + 1)A = \frac{(w + 1)A}{1 + \kappa},$$

where $\kappa = \tfrac{\phi}{\alpha} = 10$. Thus

$$N_{\text{eq}} = \frac{(w + 1)A}{11}.$$

The corresponding throughput is

$$F_{\text{water}}(w) = C_{\text{boil}}(N_{\text{eq}}) = \frac{\alpha \phi}{\alpha + \phi} (w + 1)A.$$

## Steam Headroom

The steam buffer is independent of $N$ and only depends on the height allocated above the disperser:

$$F_{\text{steam}}(w) = C_{\text{steam}} = \beta (s + 1)A = \beta (h - w)A.$$

For any admissible boiler ($w \le h - 2$ so that $s \ge 1$) the inequality

$$(w + 1) \le 11(h - w)$$

holds, ensuring $F_{\text{water}}(w) \le F_{\text{steam}}(w)$. In other words, with Mekanism’s default constants the water/boil pair is always the limiting factor, and the steam buffer provides ample headroom.

## Optimal Water Height

Since $F(N, w)$ is maximised by $F_{\text{water}}(w)$ and this term grows monotonically with $(w + 1)$, we should allocate as many interior layers as possible to the water cavity while keeping at least one steam layer. With $h = H - 2$, the optimal choice is

$$w^{\star} = h - 2, \qquad s^{\star} = 1.$$

The corresponding superheater target is

$$N^{\star} = \left\lfloor \frac{(w^{\star} + 1)A}{11} \right\rfloor,$$

subject to the practical cap $N \le w^{\star} A$ (which is always satisfied for $H \le 18$).

## Design Workflow

1. Pick dimensions $(W, L, H)$ that satisfy Mekanism’s casing bounds and compute $h = H - 2$ and $A = W \cdot L$.
2. Set the water cavity height to $w = h - 2$ (one steam layer above the disperser). Compute $s = h - 1 - w = 1$.
3. Evaluate the balanced superheater target
   $$N_{\text{eq}} = \frac{(w + 1)A}{11}.$$
   Round to the nearest feasible integer ($0 \le N \le wA$).
4. Assemble the boiler with $N$ superheaters placed contiguously inside the water cavity.
5. The resulting production limit is
   $$F_{\max} = \frac{\alpha \phi}{\alpha + \phi}(w + 1)A,$$
   while $C_{\text{steam}}$, $C_{\text{hot}}$, and $C_{\text{cold}}$ follow from the height allocation above.
6. If you adjust the layout (e.g., add extra steam headroom or remove superheaters for easier piping), recompute $F$ with the same formulas—performance degrades smoothly around the optimum, so near-by configurations remain effective.

## Worked Example — 18 × 18 × 18 Boiler

For the maximum footprint ($W = L = 18$, $H = 18$):

- Interior height: $h = H - 2 = 16$.
- Choose $w = h - 2 = 14$ and $s = 1$.
- Area: $A = 18^2 = 324$.
- Balanced superheaters: $N_{\text{eq}} = \tfrac{(14 + 1) \cdot 324}{11} \approx 441.8 \Rightarrow N = 442$.

Capacities and throughput:

- $V_{\text{water}} = (14 + 1) \cdot 324 - 442 = 4{,}418$ blocks.
- $C_{\text{water}} = \alpha V_{\text{water}} = 32{,}000 \times 4{,}418 = 141{,}376{,}000$ mB.
- $C_{\text{boil}} = \phi N = 320{,}000 \times 442 = 141{,}440{,}000$ mB/t.
- $C_{\text{steam}} = \beta (s + 1)A = 320{,}000 \times 2 \times 324 = 207{,}360{,}000$ mB.
- Throughput: $F_{\max} = \min(C_{\text{water}}, C_{\text{steam}}, C_{\text{boil}}) = 141{,}376{,}000$ mB/t.

## Practical Notes

- Expanding the steam cavity (larger $s$) does not increase throughput with default constants—the water draw remains the bottleneck—so prefer maximising $w$.
- When running sodium, simply multiply $V_{\text{water}}$ and $V_{\text{steam}}$ by $\delta$ and $\gamma$ to confirm the coolant buffers exceed the targeted flow.
- If your modpack tweaks Mekanism’s heating constants, recompute $\phi$, $\kappa$, and the balanced ratio. The workflow above remains valid with the updated values.
