# Thermoelectric Boiler Information

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 3x4x3 | 18x18x18 |

* Edges must be `Boiler Casing`
* Faces can be `Boiler Casing`, `Boiler Valve`, or `Reactor Glass`
* Interior of structure is made up of 3 sections (top to bottom):
  * Steam Cavity (exclusively air)
  * Steam Catch (`Pressure Disperser` layer)
  * Water Cavity (air, and `Superheaters` can be placed here)

>Note: All Superheating elements must be touching each other and there cannot be any air pockets

## Tank Capacities

Boilers have four tanks:

* Heated Coolant
* Water
* Steam
* Cold Coolant

Tank Capacities are as follows:

### Intermediate Formulas

Simplified parameter definitions (dimensions):
Let

* H = height
* W, L = width, length
* A = $W \cdot L$ (layer area)
* h = $(\text{water cavity height} + 1 \text{ pressure disperser layer})$
* N = number of superheaters placed in the water cavity

Then:

* Water cavity height = $h - 1$
* Steam cavity height = $H - h$
* Water volume: $V_{Water} = (h - 1)A - N$
* Steam volume: $V_{Steam} = (H - h)A$

(Original expression for $H_{Water\ Cavity}$ reduced from $H_{boiler} - (H_{boiler} - H_{pressure\ dispersers} + 1)$ to $h - 1$.)

### Tank Capacities (mB)

$$C_{Water} = 16{,}000 \cdot \big((h - 1)A - N\big)$$
$$C_{Coolant} = 256{,}000 \cdot \big((h - 1)A - N\big)$$
$$C_{Steam} = 160{,}000 \cdot (H - h)A$$
$$C_{Hot\ Coolant} = 256{,}000 \cdot (H - h)A$$

### Boil Capacity

$$C_{Boil} = 100{,}000 \cdot N$$

## Steam Production

Maximum instantaneous steam production is limited by:
$$\min\big(C_{Water},\ C_{Steam},\ C_{Boil}\big)$$

Balance idea:

* Increasing N raises \(C_{Boil}\) but shrinks water volume (\(C_{Water}\)).
* Steam capacity depends only on h (not N).
  Optimal strategy: choose h so steam is not the smallest term, then choose N so \(C_{Water} \approx C_{Boil}\).

Balance equation (normalized by 16,000):
$$(h - 1)A - N \approx 6.25N \Rightarrow N \approx \frac{(h - 1)A}{7.25}$$

Steam non‑limiting condition:
$$0.862069 (h - 1)A \le 10(H - h)A \Rightarrow h \le \frac{10H + 0.862069}{10.862069}$$

## Maximum Flow

## Example: Optimal 18×18×18 Boiler

H = $18$, W = $L = 18$, A = $324$

Steam-safe h (integer) $ \le 16$; choose highest: $h = 16$

* Water cavity height = $15$
* Steam cavity height = $2$

Balanced superheaters: $N_{eq} = \frac{15 \cdot 324}{7.25} \approx 670.34 \Rightarrow N = 671$ (slightly beyond equality to avoid boil being lower)

Resulting capacities:

* $C_{Water} = (15 \cdot 324 - 671) \cdot 16{,}000 = 67{,}024{,}000\ \text{mB}$ (limiting)
* $C_{Boil} = 671 \cdot 100{,}000 = 67{,}100{,}000\ \text{mB}$
* $C_{Steam} = (2 \cdot 324) \cdot 160{,}000 = 103{,}680{,}000\ \text{mB}$ (non-limiting)

Maximum effective production governed by water: $67{,}024{,}000\ \text{mB}$

## General Recipe (Any Size)

1. Compute $A = W \cdot L$.
2. Find $h_{max} = \lfloor \frac{10H + 0.862069}{10.862069}\rfloor$.
3. Use $h = h_{max}$. If steam becomes limiting factor after rounding N, decrement h.
4. $N_{eq} = \frac{(h - 1)A}{7.25}$; take $N = \lceil N_{eq} \rceil$.
5. Capacities:
   * $C_{Water} = 16{,}000 \cdot ((h - 1)A - N)$
   * $C_{Steam} = 160{,}000 \cdot (H - h)A$
   * $C_{Boil} = 100{,}000 \cdot N$
6. Production limit = $\min(C_{Water}, C_{Steam}, C_{Boil})$.

(Adjust if $C_{Steam} <$ others by lowering h to enlarge steam cavity.)

## Summary (18×18×18)

h = 16, N = 671, limiting capacity $= 67{,}024{,}000\ \text{mB}$ (water), steam comfortably above, boil slightly above water. This configuration maximizes $\min(C_{Water}, C_{Steam}, C_{Boil})$ for the size.
