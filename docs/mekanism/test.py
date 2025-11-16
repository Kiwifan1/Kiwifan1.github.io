
L = 17
H = 18
h = H - 2
g = 32000
d = 1280
r_max = min(2 * L - 5, 14)

f_vent = lambda r: g * ((L - 2) ** 2 + 4 * (L - 2) * (h - r - 1))
f_disperser = lambda r: d * r * (L - 2) **2 * ((L - 2) ** 2 - 1)

def getMin(r):
    return min(f_vent(r), f_disperser(r))

def getPower(r):
    F_min = getMin(r)
    return F_min * 10 * ((2 * r) / 28)

max_r = 1
max_energy = -1

print(" r |   F_vent    | F_disperser  | min(F_vent, F_disperser) | Power Output (J)")

for r in range(1, r_max + 1):
    F_vent = f_vent(r) / 1000
    F_disperser = f_disperser(r) / 1000
    F_min = getMin(r) / 1000
    power = getPower(r) / 1000
    print(f"{r:2} | {F_vent:12.3f} | {F_disperser:12.3f} | {F_min:24.3f} | {power:18.3f}")
    
    if power > max_energy:
        max_energy = power
        max_r = r
        
print(f"\nOptimal r: {max_r} with Power Output: {getPower(max_r):.3f} J")
    