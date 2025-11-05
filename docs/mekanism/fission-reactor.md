# Fission Reactor Information

## Construction

Size:

| Min   | Max      |
| ----- | -------- |
| 3x4x3 | 18x18x18 |

>Note: above 75 Fission Fuel Assemblies, Water based cooling is no longer recommended.

* Edges must be `Fission Reactor Casing`
* Faces can be `Fission Reactor Casing`, `Reactor Glass`, `Fission Reactor Port` or `Fission Reactor Logic Adapater`
* Interior can be either air or fission control rods
  * A control rod is made from 1 to 15 `Fission Fuel Assembly` and a single `Control Rod Assembly` at the top
* Each Reactor must have a minimum of:
  * 1 Coolant Input (Water/Sodium)
  * 1 Coolant Output (Steam/Superheated Sodium)
  * One Fissile Fuel Input
  * One Waste Output

## Heating Rate

| Medium | Heating Rate (Mb/t) |
| ------ | ------------------- |
| Water  | 20,000              |
| Sodium | 200,000             |

>Note: These numbers also match for how much is heated per 1 mb of `Fissile Fuel`

## Power Generation

* The Power Generated per mB of `Fissile Fuel` follows the formula:

$$P = 7.14 \space \text{kJ} * N_{blades}$$

## Burn Rate

The Max Burn Rate Formula is as follows:

$$B_{Max} = N_{Fuel \space Assemblies}$$

The Max Safe Burn Rate Formula, given a Turbine $X$ is as follows:

$$B_{Safe} = \min(X_{steam \space flow}, X_{water \space output})$$

## Temperature

| Color  | Temperature (K)     |
| ------ | ------------------- |
| Green  | $ T < 600 $         |
| Yellow | $ 600 < T < 1000 $  |
| Orange | $ 1000 < T < 1200 $ |
| Red\*  | $ 1200 < T $        |

> \*Note: Above 1200K, the reactor will take structural damage

### Damage/Meltdown Mechanics

#### Damage Formula

Above 1200K, the reactor starts to take damage, using the following formula:

$$D = \frac{\min(T, 1800)}{12,000}\% \space \text{per tick}$$

This means for a reactor at 1400K:

$$D = \frac{\min(1400,1800)}{12,000} =  2.\overline{33}\%  \space \text{per second}$$

#### Meltdown Formula

While damage is over 100% and the temperature is above 1200K, the reactor will roll a chance to meldown every tick, following the formula:

$$p_{meltdown} =\frac{D (\%)}{1000}\space \text{per tick}$$

This means for a reactor at 100% damage, it would be:

$$P_{meltdown} \frac{100}{1000} = 0.1\% \space \text{per tick} = 2\% \space \text{per second}$$

#### Repair Formula

While the temperature is < 1200K. The reactor repairs itself at a rate of:

$$ \frac{1200 - T}{120,000}\% \space \text{per tick}$$

This means that at 0K, the reactor will repair itself at 0.2% per second

## Nuclear Waste

* Radioactive Waste Barrels delete their contents at a rate of 1 mB/min
