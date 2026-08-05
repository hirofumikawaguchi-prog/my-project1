"""Physical constants and silicon material parameters used throughout the solver."""

Q = 1.602176634e-19        # elementary charge [C]
K_B = 1.380649e-23         # Boltzmann constant [J/K]
EPS_0 = 8.8541878128e-14   # vacuum permittivity [F/cm]

T = 300.0                  # lattice temperature [K]
V_T = K_B * T / Q          # thermal voltage [V]

# --- Silicon at 300 K ---
EPS_SI_R = 11.7            # relative permittivity
EPS_SI = EPS_SI_R * EPS_0  # [F/cm]

NI = 1.0e10                # intrinsic carrier concentration [cm^-3]

MU_N = 1350.0               # electron mobility [cm^2/(V s)]
MU_P = 480.0                # hole mobility [cm^2/(V s)]

D_N = V_T * MU_N            # electron diffusion coefficient (Einstein relation) [cm^2/s]
D_P = V_T * MU_P            # hole diffusion coefficient [cm^2/s]

# --- Shockley-Read-Hall recombination (mid-gap trap) ---
TAU_N = 1.0e-6              # electron SRH lifetime [s]
TAU_P = 1.0e-6              # hole SRH lifetime [s]
