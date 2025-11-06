# Fission Reactor Information

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 3x4x3 | 18x18x18 |

> Note: Above 75 Fission Fuel Assemblies, water-based cooling is no longer recommended.

* Edges must be `Fission Reactor Casing`
* Faces can be `Fission Reactor Casing`, `Reactor Glass`, `Fission Reactor Port` or `Fission Reactor Logic Adapter`
* Interior can be either air or fission control rods
  * A control rod is made from 1 to 15 `Fission Fuel Assembly` and a single `Control Rod Assembly` at the top
* Each Reactor must have a minimum of:
  * 1 Coolant Input (Water/Sodium)
  * 1 Coolant Output (Steam/Superheated Sodium)
  * One Fissile Fuel Input
  * One Waste Output

## Heating Rate

| Medium | Heating Rate (mB/t) |
| ------ | ------------------- |
| Water  | 20,000              |
| Sodium | 200,000             |

> Note: These numbers also match how much is heated per 1 mB of `Fissile Fuel`.

## Power Generation

* The Power Generated per mB of `Fissile Fuel` follows the formula:

$$P = 7.14\,\text{kJ} \cdot N_{blades}$$

## Burn Rate

Let $N_{\text{fuel}}$ be the number of `Fission Fuel Assembly` blocks in the reactor. Then the maximum burn rate is

$$B_{\max} = N_{\text{fuel}}$$

Given a paired turbine $X$ with steam handling $X_{\text{steam flow}}$ and water return $X_{\text{water output}}$, the safe burn rate is

$$B_{\text{safe}} = \min\big(X_{\text{steam flow}},\ X_{\text{water output}}\big)$$

## Temperature

| Color  | Temperature (K)     |
| ------ | ------------------- |
| Green  | $T < 600$           |
| Yellow | $600 < T < 1000$    |
| Orange | $1000 < T < 1200$   |
| Red\*  | $1200 < T$          |

> \*Note: Above 1200K, the reactor will take structural damage

### Damage/Meltdown Mechanics

#### Damage Formula

Above 1200K, the reactor starts to take damage according to

$$D = \frac{\min(T, 1800)}{12{,}000}\% \text{ per tick}.$$

For a reactor at $T = 1400\,\text{K}$ this evaluates to

$$D = \frac{1400}{12{,}000} \approx 0.1167\% \text{ per tick} \approx 2.33\% \text{ per second}.$$

#### Meltdown Formula

While damage is over 100% and the temperature remains above 1200K, the reactor rolls a chance to melt down every tick:

$$p_{\text{meltdown}} = \frac{D(\%)}{1000}.$$

At 100% damage that becomes

$$p_{\text{meltdown}} = \frac{100}{1000} = 0.1\% \text{ per tick} \approx 2\% \text{ per second}.$$

#### Repair Formula

While the temperature stays below 1200K the reactor repairs itself at

$$ \frac{1200 - T}{120{,}000}\% \text{ per tick},$$

so at $T = 0\,\text{K}$ the structure heals at 0.2% per second.

## Nuclear Waste

* Radioactive Waste Barrels delete their contents at a rate of 1 mB/min
