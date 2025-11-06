# Thermoelectric Boiler Information

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 3x4x3 | 18x18x18 |

- Edges must be `Boiler Casing`
- Faces can be `Boiler Casing`, `Boiler Valve`, or `Reactor Glass`
- Interior of structure is made up of 3 sections (top to bottom):
  - Steam Cavity (exclusively air)
  - Steam Catch (`Pressure Disperser` layer)
  - Water Cavity (air, and `Superheaters` can be placed here)

> Note: All Superheating elements must be touching each other and there cannot be any air pockets

## Tank Capacities

Boilers have four tanks:

- Heated Coolant
- Water
- Steam
- Cold Coolant

Tank Capacities are as follows:

### Intermediate Formulas

Let the overall height be $H$ and the footprint dimensions be $W$ by $L$ so that the layer area is $A = W \cdot L$. Define $h$ as the water cavity height plus the single pressure disperser layer and let $N$ be the number of superheaters.

Then:

- Water cavity height $= h - 1$
- Steam cavity height $= H - h$
- Water volume $V_{Water} = (h - 1)A - N$
- Steam volume $V_{Steam} = (H - h)A$

### Tank Capacities (mB)

$$C_{Water} = 16{,}000 \cdot \big((h - 1)A - N\big)$$
$$C_{Hot\ Coolant} = 256{,}000 \cdot \big((h - 1)A - N\big)$$
$$C_{Steam} = 160{,}000 \cdot (H - h)A$$
$$C_{Coolant} = 256{,}000 \cdot (H - h)A$$

### Boil Capacity

$$C_{Boil} = 320{,}000 \cdot N$$

## Steam Production

Maximum instantaneous steam production is limited by:
$$\min\big(C_{Water},\ C_{Steam},\ C_{Boil}\big)$$

Balance idea:

- Increasing N raises $(C_{Boil})$ but shrinks water volume $(C_{Water})$.
- Steam capacity depends only on h (not N).
  Optimal strategy: choose h so steam is not the smallest term, then choose N so $(C_{Water} \approx C_{Boil})$.

Balance equation (normalized by 16,000):
$$(h - 1)A - N \approx 20N \quad \Rightarrow \quad N \approx \frac{(h - 1)A}{21}$$

Steam non‑limiting condition:
$$2(h - 1) \le 21(H - h) \quad \Rightarrow \quad h \le \frac{21H + 2}{23}$$

Since $h$ counts block layers, round the bound down to the nearest integer.

## Example: Optimal 18×18×18 Boiler

H = $18$, W = $L = 18$, A = $324$

Steam-safe $h$ (integer) $\le 16$; choose highest: $h = 16$

- Water cavity height = $15$
- Steam cavity height = $2$

Balanced superheaters: $N_{eq} = \frac{15 \cdot 324}{21} \approx 231.4 \Rightarrow N = 232$

Resulting capacities:

- $C_{Water} = (15 \cdot 324 - 232) \cdot 16{,}000 = 74{,}048{,}000\ \text{mB}$ (limiting)
- $C_{Boil} = 232 \cdot 320{,}000 = 74{,}240{,}000\ \text{mB}$
- $C_{Steam} = (2 \cdot 324) \cdot 160{,}000 = 103{,}680{,}000\ \text{mB}$ (non-limiting)
- $C_{Hot\ Coolant} = 16 \times C_{Water} = 1{,}184{,}768{,}000\ \text{mB}$
- $C_{Coolant} = 1.6 \times C_{Steam} = 165{,}888{,}000\ \text{mB}$

Maximum effective steam production governed by water: $74{,}048{,}000\ \text{mB/t}$

## General Recipe (Any Size)

1. Compute $A = W \cdot L$.
1. Find $h_{max} = \left\lfloor \frac{21H + 2}{23} \right\rfloor$.
1. Use $h = h_{max}$. If steam becomes limiting factor after rounding N, decrement h.
1. $N_{eq} = \frac{(h - 1)A}{21}$; take $N = \lceil N_{eq} \rceil$.
1. Capacities:

| Symbol             | Formula                          |
| ------------------ | -------------------------------- |
| $C_{Water}$        | $16{,}000 \cdot ((h - 1)A - N)$  |
| $C_{Hot\ Coolant}$ | $256{,}000 \cdot ((h - 1)A - N)$ |
| $C_{Steam}$        | $160{,}000 \cdot (H - h)A$       |
| $C_{Coolant}$      | $256{,}000 \cdot (H - h)A$       |
| $C_{Boil}$         | $320{,}000 \cdot N$              |

1. Production limit = $\min(C_{Water}, C_{Steam}, C_{Boil})$; double-check that the hot-coolant buffer also satisfies the target when running sodium.

(Adjust if $C_{Steam} <$ others by lowering h to enlarge steam cavity.)

## Summary (18×18×18)

h = 16, N = 671, limiting capacity $= 67{,}024{,}000\ \text{mB}$ (water), steam comfortably above, boil slightly above water. This configuration maximizes $\min(C_{Water}, C_{Steam}, C_{Boil})$ for the size.
